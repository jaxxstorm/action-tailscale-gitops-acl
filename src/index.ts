import * as core from "@actions/core";
import { promises as fs } from "node:fs";

import { getCredentials } from "./auth.js";
import { loadCache, saveCache } from "./cache.js";
import { createPolicyDiff } from "./diff.js";
import { ACLGitopsTestError, modifiedExternallyWarning, modifiedExternallyWarningMessage } from "./errors.js";
import { formatHuJSON, hashFormattedHuJSON, standardizeHuJSON } from "./hujson/index.js";
import { reportRun, RunMode, RunReport } from "./reporting.js";
import { TailscaleClient } from "./tailscale.js";

const defaultCacheFile = "./version-cache.json";
const defaultAPIServer = "api.tailscale.com";

export async function run(): Promise<void> {
  const policyFile = core.getInput("policy-file", { required: true }) || "./policy.hujson";
  const action = core.getInput("action", { required: true }) as RunMode;
  const tailnet = core.getInput("tailnet", { required: true });
  const apiServer = defaultAPIServer;

  if (action !== "test" && action !== "apply") {
    throw new Error(`unknown action ${action}`);
  }

  let report: RunReport = {
    mode: action,
    tailnet,
    policyFile,
    outcome: "failed",
    policyChanged: false,
  };

  try {
    const credentials = await getCredentials({
      apiKey: core.getInput("api-key"),
      oauthClientId: core.getInput("oauth-client-id"),
      oauthSecret: core.getInput("oauth-secret"),
      audience: core.getInput("audience"),
      apiServer,
    });

    const client = new TailscaleClient(apiServer, tailnet, credentials.apiKey);
    const cache = await loadCache(defaultCacheFile);
    const control = await client.getACL();
    const controlEtag = control.etag;
    const policy = await fs.readFile(policyFile, "utf8");
    const localEtag = hashFormattedHuJSON(policy);
    const formattedPolicy = formatHuJSON(policy);
    const diffBase = controlEtag === localEtag ? formattedPolicy : formatHuJSON(control.policy);
    const diff = createPolicyDiff(diffBase, formattedPolicy, {
      fromFile: "tailscale-control-policy.hujson",
      toFile: policyFile,
    });

    if (cache.PrevETag === "") {
      core.info("no previous etag found, assuming the latest control etag");
      cache.PrevETag = controlEtag;
    }

    report = {
      ...report,
      controlEtag,
      localEtag,
      cacheEtag: cache.PrevETag,
      policyChanged: controlEtag !== localEtag,
      diff,
    };

    core.info(`control: ${controlEtag}`);
    core.info(`local:   ${localEtag}`);
    core.info(`cache:   ${cache.PrevETag}`);

    if (controlEtag === localEtag) {
      report = {
        ...report,
        outcome: "no-op",
        message: "No update needed; the local policy hash matches the current control ETag.",
      };
      if (action === "apply") {
        cache.PrevETag = localEtag;
        core.info("no update needed, doing nothing");
      } else {
        core.info("no updates found, doing nothing");
      }
      await saveCache(cache, defaultCacheFile);
      await reportRun(report);
      return;
    }

    if (cache.PrevETag !== controlEtag) {
      core.info(modifiedExternallyWarning(policyFile));
      report = {
        ...report,
        warnings: [...(report.warnings ?? []), modifiedExternallyWarningMessage],
      };
    }

    if (action === "apply") {
      await client.applyACL(policyFile, policy, controlEtag);
      cache.PrevETag = localEtag;
      report = {
        ...report,
        outcome: "applied",
        cacheEtag: cache.PrevETag,
        message: "Policy update applied successfully.",
      };
    } else {
      await client.testACL(policyFile, standardizeHuJSON(policy));
      report = {
        ...report,
        outcome: "validated",
        message: "Policy validation succeeded.",
      };
    }

    await saveCache(cache, defaultCacheFile);
    await reportRun(report);
  } catch (error) {
    await reportRun({
      ...report,
      outcome: "failed",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

if (process.env.NODE_ENV !== "test") {
  run().catch((error: unknown) => {
    if (error instanceof ACLGitopsTestError) {
      process.stdout.write(error.message);
      core.setFailed("ACL tests failed");
      return;
    }
    core.setFailed(error instanceof Error ? error.message : String(error));
  });
}
