import { createHash } from "node:crypto";
import { format, standardize } from "@jaxxstorm/hujsonkit";

export function formatHuJSON(input: string): string {
  return format(input);
}

export function standardizeHuJSON(input: string): string {
  return standardize(input);
}

export function hashFormattedHuJSON(input: string): string {
  return createHash("sha256").update(formatHuJSON(input)).digest("hex");
}
