import type { KnowledgeChunk } from "../schemas/knowledge.schema";
import { sha256Text } from "../reasoning/hash";

const maxChunkLength = 1200;
const stopWords = new Set([
  "and",
  "are",
  "for",
  "from",
  "how",
  "the",
  "this",
  "that",
  "with",
  "your",
  "into",
  "should"
]);

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function tagsFromText(value: string): string[] {
  return [
    ...new Set(
      value
        .toLowerCase()
        .match(/[a-z0-9][a-z0-9.-]{2,}/g)
        ?.filter((token) => !stopWords.has(token))
        .slice(0, 20) ?? []
    )
  ];
}

function pushChunk(chunks: KnowledgeChunk[], sourceId: string, location: string, text: string): void {
  const normalized = normalizeText(text);
  if (!normalized) {
    return;
  }

  const hash = sha256Text(`${sourceId}:${location}:${normalized}`);
  chunks.push({
    id: `chunk_${hash.slice(0, 16)}`,
    sourceId,
    text: normalized,
    location,
    tags: tagsFromText(`${location} ${normalized}`),
    searchText: normalizeText(`${location} ${normalized}`).toLowerCase(),
    hash
  });
}

export function chunkKnowledgeDocument(input: {
  sourceId: string;
  title: string;
  text: string;
  type: "markdown" | "text";
}): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];

  if (input.type === "text") {
    const paragraphs = input.text.split(/\n\s*\n/);
    let buffer = "";
    let startParagraph = 1;

    for (const [index, paragraph] of paragraphs.entries()) {
      const candidate = normalizeText(`${buffer}\n\n${paragraph}`);
      if (candidate.length > maxChunkLength && buffer) {
        pushChunk(chunks, input.sourceId, `${input.title} paragraphs ${startParagraph}-${index}`, buffer);
        buffer = paragraph;
        startParagraph = index + 1;
      } else {
        buffer = candidate;
      }
    }

    pushChunk(chunks, input.sourceId, `${input.title} paragraphs ${startParagraph}-${paragraphs.length}`, buffer);
    return chunks;
  }

  const lines = input.text.split(/\r?\n/);
  let heading = input.title;
  let startLine = 1;
  let buffer: string[] = [];

  const flush = (endLine: number): void => {
    pushChunk(chunks, input.sourceId, `${heading} lines ${startLine}-${endLine}`, buffer.join("\n"));
    buffer = [];
  };

  for (const [index, line] of lines.entries()) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (buffer.length > 0) {
        flush(index);
      }
      heading = headingMatch[2].trim();
      startLine = index + 1;
      buffer.push(line);
      continue;
    }

    const nextText = [...buffer, line].join("\n");
    if (normalizeText(nextText).length > maxChunkLength && buffer.length > 0) {
      flush(index);
      startLine = index + 1;
    }

    buffer.push(line);
  }

  if (buffer.length > 0) {
    flush(lines.length);
  }

  return chunks;
}
