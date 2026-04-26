import { formatACLGitopsTestError, modifiedExternallyWarning } from "./errors.js";

describe("error formatting", () => {
  it("formats line and column messages as GitHub annotations", () => {
    expect(formatACLGitopsTestError({ Message: "line 3, column 7: bad policy" }, "policy.hujson")).toBe(
      "::error file=policy.hujson,line=3,col=7::bad policy\n\n",
    );
  });

  it("formats per-user errors and warnings", () => {
    expect(
      formatACLGitopsTestError(
        {
          Message: "gitops response error",
          Data: [{ User: "alice@example.com", Errors: ["denied"], Warnings: ["unused"] }],
        },
        "policy.hujson",
      ),
    ).toContain("For user alice@example.com:\nErrors found:\n- denied\nWarnings found:\n- unused");
  });

  it("preserves the manual edit warning text", () => {
    expect(modifiedExternallyWarning("policy.hujson")).toBe(
      "::warning file=policy.hujson,line=1,col=1,title=Policy File Modified Externally::The policy file was modified externally in the admin console.",
    );
  });
});
