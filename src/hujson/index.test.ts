import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { formatHuJSON, hashFormattedHuJSON, standardizeHuJSON } from "./index.js";

describe("hujson compatibility helpers", () => {
  it("formats JWCC with comments and trailing commas deterministically", () => {
    const input = "{\n\t// users\n\t\"groups\": {\n\t\t\"group:dev\": [\"alice@example.com\",],\n\t},\n}\n";
    expect(formatHuJSON(input)).toBe(`{
	// users
	"groups": {
		"group:dev": ["alice@example.com"],
	},
}
`);
  });

  it("standardizes comments and trailing commas", () => {
    const input = "{\n  // comment\n  \"acls\": [\n    {\"action\": \"accept\",},\n  ],\n}\n";
    const output = standardizeHuJSON(input);

    expect(output).not.toContain("// comment");
    expect(output).toBe('{"acls":[{"action":"accept"}]}');
    expect(JSON.parse(output)).toEqual({ acls: [{ action: "accept" }] });
  });

  it("hashes the formatted HuJSON", () => {
    const input = "{\"a\":1}\n";
    const formatted = formatHuJSON(input);
    expect(hashFormattedHuJSON(input)).toBe(createHash("sha256").update(formatted).digest("hex"));
  });

  it("matches the Go gitops-pusher ETag for the integration fixture", async () => {
    const input = await readFile("test/fixtures/policy.hujson", "utf8");
    expect(hashFormattedHuJSON(input)).toBe("bb56d706b5246ba38a8427768948eca9cc116158badc0c216282fd2f19f5af29");
  });

  it("rejects invalid JWCC", () => {
    expect(() => formatHuJSON("[null,false,true,invalid]")).toThrow();
    expect(() => standardizeHuJSON("[null,false,true,invalid]")).toThrow();
  });
});
