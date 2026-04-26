import { TailscaleClient } from "./tailscale.js";

describe("TailscaleClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches ACL policy content and strips ETags", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"acls":[]}\n', { status: 200, headers: { ETag: '"abc123"' } }));
    await expect(new TailscaleClient("api.tailscale.com", "example.com", "tskey").getACL()).resolves.toEqual({
      etag: "abc123",
      policy: '{"acls":[]}\n',
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.tailscale.com/api/v2/tailnet/example.com/acl",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Accept: "application/hujson" }),
      }),
    );
  });

  it("preserves getACLETag compatibility", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"acls":[]}\n', { status: 200, headers: { ETag: '"abc123"' } }));
    await expect(new TailscaleClient("api.tailscale.com", "example.com", "tskey").getACLETag()).resolves.toBe("abc123");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.tailscale.com/api/v2/tailnet/example.com/acl",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Accept: "application/hujson" }),
      }),
    );
  });

  it("posts raw HuJSON with quoted If-Match on apply", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }));
    await new TailscaleClient("api.tailscale.com", "example.com", "tskey").applyACL("policy.hujson", "{//comment\n}", "old");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.tailscale.com/api/v2/tailnet/example.com/acl",
      expect.objectContaining({
        method: "POST",
        body: "{//comment\n}",
        headers: expect.objectContaining({
          "Content-Type": "application/hujson",
          "If-Match": '"old"',
        }),
      }),
    );
  });

  it("posts standardized policy to validate", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));
    await new TailscaleClient("api.tailscale.com", "example.com", "tskey").testACL("policy.hujson", '{"acls":[]}');
    expect(fetch).toHaveBeenCalledWith(
      "https://api.tailscale.com/api/v2/tailnet/example.com/acl/validate",
      expect.objectContaining({
        method: "POST",
        body: '{"acls":[]}',
      }),
    );
  });

  it("formats ACL validation errors", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ Message: "line 2, column 3: bad" }), { status: 400 }),
    );
    await expect(
      new TailscaleClient("api.tailscale.com", "example.com", "tskey").testACL("policy.hujson", "{}"),
    ).rejects.toThrow("::error file=policy.hujson,line=2,col=3::bad");
  });
});
