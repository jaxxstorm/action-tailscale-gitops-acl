import * as core from "@actions/core";
import { promises as fs } from "node:fs";

import { PolicyDiff } from "./diff.js";

export type RunOutcome = "validated" | "applied" | "no-op" | "failed";
export type RunMode = "test" | "apply";

export interface RunReport {
  readonly mode: RunMode;
  readonly tailnet: string;
  readonly policyFile: string;
  readonly outcome: RunOutcome;
  readonly policyChanged: boolean;
  readonly controlEtag?: string;
  readonly localEtag?: string;
  readonly cacheEtag?: string;
  readonly diff?: PolicyDiff;
  readonly message?: string;
  readonly warnings?: readonly string[];
}

interface PullRequestContext {
  readonly owner: string;
  readonly repo: string;
  readonly number: number;
}

const commentMarker = "<!-- action-tailscale-gitops-acl:run-report -->";

export async function reportRun(report: RunReport): Promise<void> {
  await attempt("write action run summary", () => writeRunSummary(report));
  await attempt("publish pull request report", () => publishPullRequestReport(report));
}

export async function writeRunSummary(report: RunReport): Promise<void> {
  await core.summary.addRaw(renderSummary(report)).write();
}

export async function publishPullRequestReport(report: RunReport): Promise<void> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    core.info("skipping pull request report: no GitHub token is available");
    return;
  }

  const context = await getPullRequestContext();
  if (!context) {
    core.info("skipping pull request report: not running for a pull request");
    return;
  }

  const body = renderPullRequestComment(report);
  const existing = await findExistingComment(context, token);

  if (existing !== undefined) {
    await githubRequest(`https://api.github.com/repos/${context.owner}/${context.repo}/issues/comments/${existing}`, token, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    });
    return;
  }

  await githubRequest(`https://api.github.com/repos/${context.owner}/${context.repo}/issues/${context.number}/comments`, token, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

function renderSummary(report: RunReport): string {
  const lines = [
    "## Tailscale GitOps ACL",
    "",
    `- Result: ${describeOutcome(report)}`,
    `- Mode: ${report.mode}`,
    `- Tailnet: ${report.tailnet}`,
    `- Policy file: ${report.policyFile}`,
    `- Policy changed: ${report.policyChanged ? "yes" : "no"}`,
  ];

  if (report.controlEtag) {
    lines.push(`- Control ETag: ${report.controlEtag}`);
  }
  if (report.localEtag) {
    lines.push(`- Local ETag: ${report.localEtag}`);
  }
  if (report.cacheEtag) {
    lines.push(`- Cache ETag: ${report.cacheEtag}`);
  }
  if (report.message) {
    lines.push("", report.message);
  }
  if (report.warnings && report.warnings.length > 0) {
    lines.push("", "### Warnings", "", ...report.warnings.map((warning) => `- ${warning}`));
  }

  if (report.diff) {
    lines.push("", "### Policy Diff", "", fencedDiff(report.diff));
  }

  return `${lines.join("\n")}\n`;
}

function renderPullRequestComment(report: RunReport): string {
  const lines = [
    commentMarker,
    "## Tailscale ACL policy report",
    "",
    `Result: ${describeOutcome(report)}`,
    `Mode: ${report.mode}`,
    `Policy file: ${report.policyFile}`,
    "",
  ];

  if (report.warnings && report.warnings.length > 0) {
    lines.push("### Warnings", "", ...report.warnings.map((warning) => `- ${warning}`), "");
  }

  if (report.diff) {
    lines.push("### Policy Diff", "", fencedDiff(report.diff));
  } else {
    lines.push("No policy diff is available for this run.");
  }

  return `${lines.join("\n")}\n`;
}

function fencedDiff(diff: PolicyDiff): string {
  if (!diff.hasChanges) {
    return diff.text;
  }
  return `\`\`\`diff\n${diff.text}\n\`\`\``;
}

function describeOutcome(report: RunReport): string {
  if (report.outcome === "validated") {
    return "validation succeeded";
  }
  if (report.outcome === "applied") {
    return "apply succeeded";
  }
  if (report.outcome === "no-op") {
    return "no update needed";
  }
  return "failed";
}

async function attempt(description: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    core.info(`failed to ${description}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getPullRequestContext(): Promise<PullRequestContext | undefined> {
  const eventName = process.env.GITHUB_EVENT_NAME;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!eventName?.startsWith("pull_request") || !eventPath || !repository) {
    return undefined;
  }

  const payload = JSON.parse(await fs.readFile(eventPath, "utf8")) as {
    pull_request?: { number?: number };
    number?: number;
  };
  const number = payload.pull_request?.number ?? payload.number;
  if (typeof number !== "number") {
    return undefined;
  }

  const [owner, repo] = repository.split("/", 2);
  if (!owner || !repo) {
    return undefined;
  }

  return { owner, repo, number };
}

async function findExistingComment(context: PullRequestContext, token: string): Promise<number | undefined> {
  for (let page = 1; ; page += 1) {
    const comments = (await githubRequest(
      `https://api.github.com/repos/${context.owner}/${context.repo}/issues/${context.number}/comments?per_page=100&sort=updated&direction=desc&page=${page}`,
      token,
      { method: "GET" },
    )) as Array<{ id: number; body?: string }>;

    const comment = comments.find((comment) => comment.body?.includes(commentMarker));
    if (comment) {
      return comment.id;
    }
    if (comments.length < 100) {
      return undefined;
    }
  }
}

async function githubRequest(url: string, token: string, init: RequestInit): Promise<unknown> {
  const resp = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers,
    },
  });
  if (!resp.ok) {
    throw new Error(`GitHub API request failed with status ${resp.status}: ${await resp.text()}`);
  }
  if (resp.status === 204) {
    return undefined;
  }
  const text = await resp.text();
  return text ? JSON.parse(text) : undefined;
}
