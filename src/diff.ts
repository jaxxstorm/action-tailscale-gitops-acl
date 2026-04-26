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

export function createPolicyDiff(oldText: string, newText: string, options: DiffOptions): PolicyDiff {
  if (oldText === newText) {
    return {
      hasChanges: false,
      text: "No policy diff is present.",
      truncated: false,
    };
  }

  const maxLength = options.maxLength ?? defaultMaxLength;
  const diff = [
    `--- ${options.fromFile}`,
    `+++ ${options.toFile}`,
    ...diffLines(splitLines(oldText), splitLines(newText)),
  ].join("\n");

  if (diff.length <= maxLength) {
    return {
      hasChanges: true,
      text: diff,
      truncated: false,
    };
  }

  const notice = "\n\n[Diff truncated because it exceeded the maximum report size.]";
  return {
    hasChanges: true,
    text: `${diff.slice(0, Math.max(0, maxLength - notice.length))}${notice}`,
    truncated: true,
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

function diffLines(oldLines: string[], newLines: string[]): string[] {
  const table = buildLcsTable(oldLines, newLines);
  const output: string[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldLines.length && newIndex < newLines.length) {
    if (oldLines[oldIndex] === newLines[newIndex]) {
      output.push(` ${oldLines[oldIndex]}`);
      oldIndex += 1;
      newIndex += 1;
    } else if (table[oldIndex + 1][newIndex] >= table[oldIndex][newIndex + 1]) {
      output.push(`-${oldLines[oldIndex]}`);
      oldIndex += 1;
    } else {
      output.push(`+${newLines[newIndex]}`);
      newIndex += 1;
    }
  }

  while (oldIndex < oldLines.length) {
    output.push(`-${oldLines[oldIndex]}`);
    oldIndex += 1;
  }

  while (newIndex < newLines.length) {
    output.push(`+${newLines[newIndex]}`);
    newIndex += 1;
  }

  return output;
}

function buildLcsTable(oldLines: string[], newLines: string[]): number[][] {
  const table = Array.from({ length: oldLines.length + 1 }, () => Array<number>(newLines.length + 1).fill(0));

  for (let oldIndex = oldLines.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newLines.length - 1; newIndex >= 0; newIndex -= 1) {
      table[oldIndex][newIndex] =
        oldLines[oldIndex] === newLines[newIndex]
          ? table[oldIndex + 1][newIndex + 1] + 1
          : Math.max(table[oldIndex + 1][newIndex], table[oldIndex][newIndex + 1]);
    }
  }

  return table;
}
