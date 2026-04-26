export interface PolicyDiff {
  readonly hasChanges: boolean;
  readonly text: string;
  readonly truncated: boolean;
}

interface DiffOptions {
  readonly fromFile: string;
  readonly toFile: string;
  readonly maxLength?: number;
}

const defaultMaxLength = 60000;
const truncationNotice = "\n\nDiff was truncated because it exceeded the maximum report size.";

export function createPolicyDiff(oldText: string, newText: string, options: DiffOptions): PolicyDiff {
  if (oldText === newText) {
    return {
      hasChanges: false,
      text: "No policy diff is present.",
      truncated: false,
    };
  }

  const maxLength = options.maxLength ?? defaultMaxLength;
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  const builder = new BoundedDiffBuilder(maxLength);
  builder.addLine(`--- ${options.fromFile}`);
  builder.addLine(`+++ ${options.toFile}`);
  builder.addLine(`@@ -${rangeStart(oldLines)},${oldLines.length} +${rangeStart(newLines)},${newLines.length} @@`);

  for (const line of oldLines) {
    builder.addLine(`-${line}`);
    if (builder.truncated) {
      break;
    }
  }

  if (!builder.truncated) {
    for (const line of newLines) {
      builder.addLine(`+${line}`);
      if (builder.truncated) {
        break;
      }
    }
  }

  return {
    hasChanges: true,
    text: builder.text(),
    truncated: builder.truncated,
  };
}

function splitLines(text: string): string[] {
  if (text.length === 0) {
    return [];
  }
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

function rangeStart(lines: string[]): number {
  return lines.length === 0 ? 0 : 1;
}

class BoundedDiffBuilder {
  private readonly parts: string[] = [];
  private length = 0;
  truncated = false;

  constructor(private readonly maxLength: number) {}

  addLine(line: string): void {
    if (this.truncated) {
      return;
    }

    const prefix = this.parts.length === 0 ? "" : "\n";
    const next = `${prefix}${line}`;
    const remaining = this.maxLength - this.truncationSuffix().length - this.length;
    if (remaining < next.length) {
      if (remaining > 0) {
        this.parts.push(next.slice(0, remaining));
      }
      this.length = this.maxLength - this.truncationSuffix().length;
      this.truncated = true;
      return;
    }

    this.parts.push(next);
    this.length += next.length;
  }

  text(): string {
    return `${this.parts.join("")}${this.truncated ? this.truncationSuffix() : ""}`;
  }

  private truncationSuffix(): string {
    return truncationNotice.slice(0, Math.max(0, this.maxLength));
  }
}
