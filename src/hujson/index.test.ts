import { createHash } from "node:crypto";

import { formatHuJSON, hashFormattedHuJSON, standardizeHuJSON } from "./index.js";

describe("hujson compatibility helpers", () => {
  it("formats JWCC with comments and trailing commas deterministically", () => {
    const input = "{\n\t// users\n\t\"groups\": {\n\t\t\"group:dev\": [\"alice@example.com\",],\n\t},\n}\n";
    expect(formatHuJSON(input)).toBe(`{
  "groups": {
    "group:dev": [
      "alice@example.com"
    ]
  }
}`);
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

  it("rejects invalid JWCC", () => {
    expect(() => formatHuJSON("[null,false,true,invalid]")).toThrow();
    expect(() => standardizeHuJSON("[null,false,true,invalid]")).toThrow();
  });
});
