import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { KnowledgeChunk } from "@akiri/backend/domain";

let cache: KnowledgeChunk[] | null = null;

/** Loads docs/knowledge-base/*.md as retrieval chunks (server only). */
export async function loadKnowledge(): Promise<KnowledgeChunk[]> {
  if (cache) return cache;
  const dir = join(process.cwd(), "..", "docs", "knowledge-base");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
  cache = await Promise.all(
    files.map(async (f) => {
      const body = await readFile(join(dir, f), "utf8");
      const title = body.split("\n")[0]?.replace(/^#\s*/, "") ?? f;
      return { id: f.replace(/\.md$/, ""), title, body };
    }),
  );
  return cache;
}
