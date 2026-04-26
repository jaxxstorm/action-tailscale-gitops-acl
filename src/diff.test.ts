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
        "@@ -1,1 +1,1 @@",
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
    expect(diff.text).toContain("Diff was truncated");
  });

  it("does not allocate a quadratic table for large policies", () => {
    const oldText = `${Array.from({ length: 5000 }, (_, index) => `old-${index}`).join("\n")}\n`;
    const newText = `${Array.from({ length: 5000 }, (_, index) => `new-${index}`).join("\n")}\n`;

    const diff = createPolicyDiff(oldText, newText, {
      fromFile: "control.hujson",
      toFile: "policy.hujson",
      maxLength: 1000,
    });

    expect(diff.hasChanges).toBe(true);
    expect(diff.truncated).toBe(true);
    expect(diff.text.length).toBeLessThanOrEqual(1000);
  });
});
