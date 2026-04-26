import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vi } from "vitest";

const core = vi.hoisted(() => ({
  info: vi.fn(),
  summary: {
    addRaw: vi.fn(),
    write: vi.fn(),
  },
}));

vi.mock("@actions/core", () => core);

import { publishPullRequestReport, reportRun, writeRunSummary } from "./reporting.js";

describe("reporting", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    core.summary.addRaw.mockReturnValue(core.summary);
    core.summary.write.mockResolvedValue(core.summary);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("writes a summary for a successful validation run", async () => {
    await writeRunSummary({
      mode: "test",
      tailnet: "example.com",
      policyFile: "policy.hujson",
      outcome: "validated",
      policyChanged: true,
      controlEtag: "control",
      localEtag: "local",
      cacheEtag: "control",
    });

    expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("Result: validation succeeded"));
    expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("Policy changed: yes"));
    expect(core.summary.write).toHaveBeenCalled();
  });

  it("writes report warnings in the action summary", async () => {
    await writeRunSummary({
      mode: "test",
      tailnet: "example.com",
      policyFile: "policy.hujson",
      outcome: "validated",
      policyChanged: true,
      warnings: ["The policy file was modified externally in the admin console."],
    });

    expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining("### Warnings"));
    expect(core.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining("- The policy file was modified externally in the admin console."),
    );
  });

  it("creates a pull request comment with a policy diff", async () => {
    const eventPath = await writePullRequestEvent();
    vi.stubEnv("GITHUB_TOKEN", "token");
    vi.stubEnv("GITHUB_EVENT_NAME", "pull_request");
    vi.stubEnv("GITHUB_EVENT_PATH", eventPath);
    vi.stubEnv("GITHUB_REPOSITORY", "owner/repo");
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("[]", { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 201 }));

    await publishPullRequestReport({
      mode: "test",
      tailnet: "example.com",
      policyFile: "policy.hujson",
      outcome: "validated",
      policyChanged: true,
      diff: {
        hasChanges: true,
        text: "--- control\n+++ policy\n-old\n+new",
        truncated: false,
      },
    });

    expect(fetch).toHaveBeenLastCalledWith(
      "https://api.github.com/repos/owner/repo/issues/12/comments",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("```diff"),
      }),
    );
  });

  it("creates a pull request comment with report warnings", async () => {
    const eventPath = await writePullRequestEvent();
    vi.stubEnv("GITHUB_TOKEN", "token");
    vi.stubEnv("GITHUB_EVENT_NAME", "pull_request");
    vi.stubEnv("GITHUB_EVENT_PATH", eventPath);
    vi.stubEnv("GITHUB_REPOSITORY", "owner/repo");
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("[]", { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 201 }));

    await publishPullRequestReport({
      mode: "test",
      tailnet: "example.com",
      policyFile: "policy.hujson",
      outcome: "validated",
      policyChanged: true,
      warnings: ["The policy file was modified externally in the admin console."],
    });

    expect(fetch).toHaveBeenLastCalledWith(
      "https://api.github.com/repos/owner/repo/issues/12/comments",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("### Warnings"),
      }),
    );
    expect(fetch).toHaveBeenLastCalledWith(
      "https://api.github.com/repos/owner/repo/issues/12/comments",
      expect.objectContaining({
        body: expect.stringContaining("- The policy file was modified externally in the admin console."),
      }),
    );
  });

  it("updates an existing action-owned pull request comment", async () => {
    const eventPath = await writePullRequestEvent();
    vi.stubEnv("GITHUB_TOKEN", "token");
    vi.stubEnv("GITHUB_EVENT_NAME", "pull_request");
    vi.stubEnv("GITHUB_EVENT_PATH", eventPath);
    vi.stubEnv("GITHUB_REPOSITORY", "owner/repo");
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 99, body: "<!-- action-tailscale-gitops-acl:run-report -->" }]), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await publishPullRequestReport({
      mode: "test",
      tailnet: "example.com",
      policyFile: "policy.hujson",
      outcome: "validated",
      policyChanged: false,
    });

    expect(fetch).toHaveBeenLastCalledWith(
      "https://api.github.com/repos/owner/repo/issues/comments/99",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("paginates when finding an existing action-owned pull request comment", async () => {
    const eventPath = await writePullRequestEvent();
    vi.stubEnv("GITHUB_TOKEN", "token");
    vi.stubEnv("GITHUB_EVENT_NAME", "pull_request");
    vi.stubEnv("GITHUB_EVENT_PATH", eventPath);
    vi.stubEnv("GITHUB_REPOSITORY", "owner/repo");
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(Array.from({ length: 100 }, (_, id) => ({ id }))), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 101, body: "<!-- action-tailscale-gitops-acl:run-report -->" }]), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await publishPullRequestReport({
      mode: "test",
      tailnet: "example.com",
      policyFile: "policy.hujson",
      outcome: "validated",
      policyChanged: false,
    });

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/repos/owner/repo/issues/12/comments?per_page=100&sort=updated&direction=desc&page=1",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/owner/repo/issues/12/comments?per_page=100&sort=updated&direction=desc&page=2",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetch).toHaveBeenLastCalledWith(
      "https://api.github.com/repos/owner/repo/issues/comments/101",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("skips pull request comments when no token is available", async () => {
    await publishPullRequestReport({
      mode: "test",
      tailnet: "example.com",
      policyFile: "policy.hujson",
      outcome: "validated",
      policyChanged: false,
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith("skipping pull request report: no GitHub token is available");
  });

  it("does not fail the action when reporting fails", async () => {
    core.summary.write.mockRejectedValue(new Error("summary unavailable"));

    await expect(
      reportRun({
        mode: "test",
        tailnet: "example.com",
        policyFile: "policy.hujson",
        outcome: "validated",
        policyChanged: false,
      }),
    ).resolves.toBeUndefined();
    expect(core.info).toHaveBeenCalledWith("failed to write action run summary: summary unavailable");
  });

  async function writePullRequestEvent(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "tailscale-gitops-acl-reporting-"));
    const eventPath = join(dir, "event.json");
    await writeFile(eventPath, JSON.stringify({ pull_request: { number: 12 } }));
    return eventPath;
  }
});
