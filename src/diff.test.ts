import { createPolicyDiff } from "./diff.js";

describe("createPolicyDiff", () => {
  it("creates a deterministic unified diff for changed policy text", () => {
    const diff = createPolicyDiff('{"acls":[]}\n', '{"acls":[{"action":"accept"}]}\n', {
      fromFile: "control.hujson",
      toFile: "policy.hujson",
    });

    expect(diff).toEqual({
      hasChanges: true,
      truncated: false,
      text: [
        "--- control.hujson",
        "+++ policy.hujson",
        '-{"acls":[]}',
        '+{"acls":[{"action":"accept"}]}',
      ].join("\n"),
    });
  });

  it("returns an explicit no-diff result for identical policy text", () => {
    expect(
      createPolicyDiff('{"acls":[]}\n', '{"acls":[]}\n', {
        fromFile: "control.hujson",
        toFile: "policy.hujson",
      }),
    ).toEqual({
      hasChanges: false,
      text: "No policy diff is present.",
      truncated: false,
    });
  });

  it("truncates large diffs", () => {
    const diff = createPolicyDiff("old\n", "new\n", {
      fromFile: "control.hujson",
      toFile: "policy.hujson",
      maxLength: 30,
    });

    expect(diff.hasChanges).toBe(true);
    expect(diff.truncated).toBe(true);
    expect(diff.text).toContain("Diff truncated");
  });
});
