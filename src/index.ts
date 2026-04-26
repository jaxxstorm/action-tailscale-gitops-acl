import * as core from "@actions/core";
import { promises as fs } from "node:fs";

import { getCredentials } from "./auth.js";
import { loadCache, saveCache } from "./cache.js";
import { ACLGitopsTestError, modifiedExternallyWarning } from "./errors.js";
import { hashFormattedHuJSON, standardizeHuJSON } from "./hujson/index.js";
import { TailscaleClient } from "./tailscale.js";

const defaultCacheFile = "./version-cache.json";
const defaultAPIServer = "api.tailscale.com";

export async function run(): Promise<void> {
  const policyFile = core.getInput("policy-file", { required: true }) || "./policy.hujson";
  const action = core.getInput("action", { required: true });
  const tailnet = core.getInput("tailnet", { required: true });
  const apiServer = defaultAPIServer;

  if (action !== "test" && action !== "apply") {
    throw new Error(`unknown action ${action}`);
  }

  const credentials = await getCredentials({
    apiKey: core.getInput("api-key"),
    oauthClientId: core.getInput("oauth-client-id"),
    oauthSecret: core.getInput("oauth-secret"),
    audience: core.getInput("audience"),
    apiServer,
  });

  const client = new TailscaleClient(apiServer, tailnet, credentials.apiKey);
  const cache = await loadCache(defaultCacheFile);
  const controlEtag = await client.getACLETag();
  const policy = await fs.readFile(policyFile, "utf8");
  const localEtag = hashFormattedHuJSON(policy);

  if (cache.PrevETag === "") {
    core.info("no previous etag found, assuming the latest control etag");
    cache.PrevETag = controlEtag;
  }

  core.info(`control: ${controlEtag}`);
  core.info(`local:   ${localEtag}`);
  core.info(`cache:   ${cache.PrevETag}`);

  if (controlEtag === localEtag) {
    if (action === "apply") {
      cache.PrevETag = localEtag;
      core.info("no update needed, doing nothing");
    } else {
      core.info("no updates found, doing nothing");
    }
    await saveCache(cache, defaultCacheFile);
    return;
  }

  if (cache.PrevETag !== controlEtag) {
    core.info(modifiedExternallyWarning(policyFile));
  }

  if (action === "test") {
    await client.testACL(policyFile, standardizeHuJSON(policy));
  } else {
    await client.applyACL(policyFile, policy, controlEtag);
    cache.PrevETag = localEtag;
  }

  await saveCache(cache, defaultCacheFile);
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
