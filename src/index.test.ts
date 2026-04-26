import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vi } from "vitest";

const core = vi.hoisted(() => ({
  getIDToken: vi.fn(),
  getInput: vi.fn(),
  info: vi.fn(),
  setFailed: vi.fn(),
  setSecret: vi.fn(),
}));

vi.mock("@actions/core", () => core);

import { hashFormattedHuJSON, standardizeHuJSON } from "./hujson/index.js";
import { run } from "./index.js";

describe("run", () => {
  const originalCwd = process.cwd();

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    core.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        "api-key": "tskey",
        "oauth-client-id": "",
        "oauth-secret": "",
        audience: "",
        tailnet: "example.com",
        "policy-file": "policy.hujson",
        action: "test",
      };
      return inputs[name] ?? "";
    });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    vi.unstubAllGlobals();
  });

  it("no-ops test when control ETag equals local formatted hash", async () => {
    await inTempDir(async () => {
      const policy = '{"acls":[]}\n';
      await writeFile("policy.hujson", policy);
      const local = hashFormattedHuJSON(policy);
      vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200, headers: { ETag: `"${local}"` } }));

      await run();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(core.info).toHaveBeenCalledWith("no updates found, doing nothing");
      await expect(readFile("version-cache.json", "utf8")).resolves.toBe(`{"PrevETag":"${local}"}\n`);
    });
  });

  it("validates standardized policy when changed", async () => {
    await inTempDir(async () => {
      const policy = "{\n// comment\n\"acls\": [],\n}\n";
      await writeFile("policy.hujson", policy);
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response("", { status: 200, headers: { ETag: '"control"' } }))
        .mockResolvedValueOnce(new Response("{}", { status: 200 }));

      await run();

      expect(fetch).toHaveBeenLastCalledWith(
        "https://api.tailscale.com/api/v2/tailnet/example.com/acl/validate",
        expect.objectContaining({ body: standardizeHuJSON(policy) }),
      );
    });
  });

  it("applies raw policy and updates cache to the local hash", async () => {
    await inTempDir(async () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === "action") return "apply";
        if (name === "api-key") return "tskey";
        if (name === "tailnet") return "example.com";
        if (name === "policy-file") return "policy.hujson";
        return "";
      });
      const policy = "{\n// raw comment\n\"acls\": [],\n}\n";
      await writeFile("policy.hujson", policy);
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response("", { status: 200, headers: { ETag: '"control"' } }))
        .mockResolvedValueOnce(new Response("", { status: 200 }));

      await run();

      expect(fetch).toHaveBeenLastCalledWith(
        "https://api.tailscale.com/api/v2/tailnet/example.com/acl",
        expect.objectContaining({
          body: policy,
          headers: expect.objectContaining({ "If-Match": '"control"' }),
        }),
      );
      await expect(readFile("version-cache.json", "utf8")).resolves.toBe(
        `{"PrevETag":"${hashFormattedHuJSON(policy)}"}\n`,
      );
    });
  });

  it("warns when cache differs from control ETag", async () => {
    await inTempDir(async () => {
      await writeFile("policy.hujson", '{"acls":[]}\n');
      await writeFile("version-cache.json", '{"PrevETag":"old"}\n');
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response("", { status: 200, headers: { ETag: '"control"' } }))
        .mockResolvedValueOnce(new Response("{}", { status: 200 }));

      await run();

      expect(core.info).toHaveBeenCalledWith(expect.stringContaining("Policy File Modified Externally"));
    });
  });

  async function inTempDir(fn: () => Promise<void>): Promise<void> {
    const dir = await mkdtemp(join(tmpdir(), "tailscale-gitops-acl-action-"));
    process.chdir(dir);
    await fn();
  }
});
