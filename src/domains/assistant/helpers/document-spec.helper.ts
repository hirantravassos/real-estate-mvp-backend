export type DocumentFormat = "pdf" | "docx";

export type DocumentBlockType =
  | "heading"
  | "paragraph"
  | "bullets"
  | "fields"
  | "table"
  | "property"
  | "signatures"
  | "page_break";

/** A property block, with its facts and cover photo already looked up. */
export interface RenderedProperty {
  title: string;
  facts: string[];
  /** Null for a property found on a portal, it has no public page. */
  link: string | null;
  /** JPEG of the cover photo, when there is one. */
  photo: { buffer: Buffer; width: number; height: number } | null;
}

export type RenderBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "fields"; fields: { label: string; value: string }[] }
  | { type: "table"; columns: string[]; rows: string[][] }
  | { type: "property"; property: RenderedProperty }
  | { type: "signatures"; names: string[] }
  | { type: "page_break" };

/** Everything a renderer needs, already checked and filled in. */
export interface RenderDocument {
  title: string;
  subtitle: string | null;
  author: string;
  date: string;
  blocks: RenderBlock[];
}

export const DOCUMENT_MIME_TYPE: Record<DocumentFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** File names that work on every phone: no accents, no symbols. */
export const safeFileName = (name: string, format: DocumentFormat) => {
  const base =
    name
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/\.(pdf|docx?)$/i, "")
      .replace(/[^a-zA-Z0-9 _-]+/g, " ")
      .trim()
      .replace(/\s+/g, "-")
      .substring(0, 80) || "documento";
  return `${base}.${format}`;
};
