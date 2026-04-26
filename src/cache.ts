import { promises as fs } from "node:fs";

export interface Cache {
  PrevETag: string;
}

export async function loadCache(path = "./version-cache.json"): Promise<Cache> {
  try {
    const data = await fs.readFile(path, "utf8");
    const parsed = JSON.parse(data) as Partial<Cache>;
    return { PrevETag: parsed.PrevETag ?? "" };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { PrevETag: "" };
    }
    throw error;
  }
}

export async function saveCache(cache: Cache, path = "./version-cache.json"): Promise<void> {
  await fs.writeFile(path, `${JSON.stringify(cache)}\n`, "utf8");
}
