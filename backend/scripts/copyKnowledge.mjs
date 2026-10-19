import { cpSync, mkdirSync } from "node:fs";
mkdirSync(new URL("../dist/rag/knowledge/", import.meta.url), {
  recursive: true,
});
cpSync(
  new URL("../src/rag/knowledge/", import.meta.url),
  new URL("../dist/rag/knowledge/", import.meta.url),
  { recursive: true },
);
