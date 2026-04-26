import { vi } from "vitest";

const core = vi.hoisted(() => ({
  getIDToken: vi.fn(),
  setSecret: vi.fn(),
}));

vi.mock("@actions/core", () => core);

import { getCredentials } from "./auth.js";

describe("getCredentials", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fails when auth is missing", async () => {
    await expect(
      getCredentials({ apiKey: "", oauthClientId: "", oauthSecret: "", audience: "", apiServer: "api.tailscale.com" }),
    ).rejects.toThrow("set api-key");
  });

  it("fails on conflicting auth modes", async () => {
    await expect(
      getCredentials({
        apiKey: "tskey",
        oauthClientId: "client",
        oauthSecret: "",
        audience: "",
        apiServer: "api.tailscale.com",
      }),
    ).rejects.toThrow("set either api-key");
  });

  it("uses API key without token exchange", async () => {
    await expect(
      getCredentials({ apiKey: "tskey", oauthClientId: "", oauthSecret: "", audience: "", apiServer: "api.tailscale.com" }),
    ).resolves.toEqual({ apiKey: "tskey" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("exchanges OAuth client credentials", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ access_token: "oauth-token" }), { status: 200 }));

    await expect(
      getCredentials({
        apiKey: "",
        oauthClientId: "client",
        oauthSecret: "secret",
        audience: "",
        apiServer: "api.tailscale.com",
      }),
    ).resolves.toEqual({ apiKey: "oauth-token" });
    expect(fetch).toHaveBeenCalledWith("https://api.tailscale.com/api/v2/oauth/token", expect.objectContaining({ method: "POST" }));
  });

  it("exchanges a federated identity token", async () => {
    core.getIDToken.mockResolvedValue("id-token");
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ access_token: "wif-token" }), { status: 200 }));

    await expect(
      getCredentials({
        apiKey: "",
        oauthClientId: "client",
        oauthSecret: "",
        audience: "aud",
        apiServer: "api.tailscale.com",
      }),
    ).resolves.toEqual({ apiKey: "wif-token" });
    expect(core.getIDToken).toHaveBeenCalledWith("aud");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.tailscale.com/api/v2/oauth/token-exchange",
      expect.objectContaining({
        body: expect.objectContaining({
          get: expect.any(Function),
        }),
        method: "POST",
      }),
    );
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = init?.body as URLSearchParams;
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("");
    expect(body.get("client_id")).toBe("client");
    expect(body.get("jwt")).toBe("id-token");
  });
});
