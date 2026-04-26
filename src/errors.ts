export interface ACLTestFailureSummary {
  User?: string;
  Errors?: string[];
  Warnings?: string[];
}

export interface ACLGitopsTestErrorBody {
  Status?: number;
  Message?: string;
  Data?: ACLTestFailureSummary[];
}

const lineColMessageSplit = /line ([0-9]+), column ([0-9]+): (.*)$/;

export class ACLGitopsTestError extends Error {
  readonly body: ACLGitopsTestErrorBody;
  readonly policyFile: string;

  constructor(body: ACLGitopsTestErrorBody, policyFile: string) {
    super(formatACLGitopsTestError(body, policyFile));
    this.name = "ACLGitopsTestError";
    this.body = body;
    this.policyFile = policyFile;
  }
}

export function formatACLGitopsTestError(body: ACLGitopsTestErrorBody, policyFile: string): string {
  const message = body.Message ?? "";
  const data = body.Data ?? [];
  const parts: string[] = [];
  const match = lineColMessageSplit.exec(message);
  if (match) {
    parts.push(`::error file=${policyFile},line=${match[1]},col=${match[2]}::${match[3]}`);
  } else {
    parts.push(message);
  }
  parts.push("");

  for (const item of data) {
    if (item.User) {
      parts.push(`For user ${item.User}:`);
    }
    if (item.Errors && item.Errors.length > 0) {
      parts.push("Errors found:");
      for (const err of item.Errors) {
        parts.push(`- ${err}`);
      }
    }
    if (item.Warnings && item.Warnings.length > 0) {
      parts.push("Warnings found:");
      for (const warning of item.Warnings) {
        parts.push(`- ${warning}`);
      }
    }
  }

  return `${parts.join("\n")}\n`;
}

export function modifiedExternallyWarning(policyFile: string): string {
  return `::warning file=${policyFile},line=1,col=1,title=Policy File Modified Externally::${modifiedExternallyWarningMessage}`;
}

export const modifiedExternallyWarningMessage = "The policy file was modified externally in the admin console.";
