import PDFDocument from "pdfkit";
import {
  RenderBlock,
  RenderDocument,
  RenderedProperty,
} from "./document-spec.helper";

const COLORS = {
  brand: "#1a66d1",
  ink: "#0f2a4a",
  soft: "#4b6584",
  edge: "#cfe6fb",
  sunken: "#eef7ff",
};

const MARGIN = 56;
const BODY_SIZE = 10.5;

/**
 * The built in Helvetica only knows the Latin characters, which covers
 * Portuguese. Emojis and other symbols are dropped instead of printing junk.
 */
const characters = (...codes: number[]) => String.fromCharCode(...codes);

const CURLY_SINGLE_QUOTES = new RegExp(`[${characters(0x2018, 0x2019)}]`, "g");
const CURLY_DOUBLE_QUOTES = new RegExp(`[${characters(0x201c, 0x201d)}]`, "g");
const LONG_DASHES = new RegExp(`[${characters(0x2013, 0x2014)}]`, "g");
const ELLIPSIS = new RegExp(characters(0x2026), "g");
/** Latin 1 plus the bullet and the euro sign, what Helvetica can draw. */
const NOT_DRAWABLE = new RegExp(
  `[^\n\t${characters(0x20)}-${characters(0x7e)}${characters(0xa1)}-${characters(0xff)}${characters(0x2022, 0x20ac)}]`,
  "g",
);

const printable = (text: string) =>
  text
    .replace(CURLY_SINGLE_QUOTES, "'")
    .replace(CURLY_DOUBLE_QUOTES, characters(0x22))
    .replace(LONG_DASHES, "-")
    .replace(ELLIPSIS, "...")
    .replace(NOT_DRAWABLE, "")
    .replace(/[ \t]+\n/g, "\n");

type Pdf = InstanceType<typeof PDFDocument>;

/** Draws the document as a PDF with the app's blue, page numbers included. */
export const renderPdf = (document: RenderDocument): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const pdf = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title: printable(document.title),
        Author: printable(document.author),
      },
    });
    const chunks: Buffer[] = [];
    pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    drawHeader(pdf, document);
    document.blocks.forEach((block) => drawBlock(pdf, block));
    drawPageNumbers(pdf, document);
    pdf.end();
  });

const contentWidth = (pdf: Pdf) =>
  pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;

const bottomLimit = (pdf: Pdf) => pdf.page.height - pdf.page.margins.bottom;

const ensureSpace = (pdf: Pdf, height: number) => {
  if (pdf.y + height > bottomLimit(pdf)) pdf.addPage();
};

const drawHeader = (pdf: Pdf, document: RenderDocument) => {
  const left = pdf.page.margins.left;
  pdf
    .rect(0, 0, pdf.page.width, 8)
    .fill(COLORS.brand)
    .fillColor(COLORS.soft)
    .font("Helvetica")
    .fontSize(9)
    .text(printable(`${document.author} · ${document.date}`), left, MARGIN - 24)
    .moveDown(0.6)
    .fillColor(COLORS.ink)
    .font("Helvetica-Bold")
    .fontSize(20)
    .text(printable(document.title), left);
  if (document.subtitle) {
    pdf
      .moveDown(0.2)
      .fillColor(COLORS.soft)
      .font("Helvetica")
      .fontSize(12)
      .text(printable(document.subtitle));
  }
  pdf
    .moveDown(0.6)
    .moveTo(left, pdf.y)
    .lineTo(left + contentWidth(pdf), pdf.y)
    .lineWidth(1)
    .strokeColor(COLORS.edge)
    .stroke()
    .moveDown(1);
};

const body = (pdf: Pdf) =>
  pdf.font("Helvetica").fontSize(BODY_SIZE).fillColor(COLORS.ink);

const drawBlock = (pdf: Pdf, block: RenderBlock) => {
  const left = pdf.page.margins.left;
  pdf.x = left;

  switch (block.type) {
    case "heading":
      ensureSpace(pdf, 60);
      pdf
        .moveDown(0.4)
        .font("Helvetica-Bold")
        .fontSize(13.5)
        .fillColor(COLORS.brand)
        .text(printable(block.text), left)
        .moveDown(0.4);
      return;
    case "paragraph":
      body(pdf)
        .text(printable(block.text), left, pdf.y, {
          width: contentWidth(pdf),
          lineGap: 3,
          align: "justify",
        })
        .moveDown(0.8);
      return;
    case "bullets":
      body(pdf).list(block.items.map(printable), left + 4, pdf.y, {
        width: contentWidth(pdf) - 4,
        bulletRadius: 2,
        textIndent: 12,
        lineGap: 2,
        paragraphGap: 3,
      });
      pdf.moveDown(0.8);
      return;
    case "fields":
      drawFields(pdf, block.fields);
      return;
    case "table":
      drawTable(pdf, block.columns, block.rows);
      return;
    case "property":
      drawProperty(pdf, block.property);
      return;
    case "signatures":
      drawSignatures(pdf, block.names);
      return;
    case "page_break":
      pdf.addPage();
      return;
  }
};

const drawFields = (pdf: Pdf, fields: { label: string; value: string }[]) => {
  const left = pdf.page.margins.left;
  const labelWidth = contentWidth(pdf) * 0.34;
  const valueWidth = contentWidth(pdf) - labelWidth - 10;

  fields.forEach((field) => {
    const label = printable(field.label);
    const value = printable(field.value) || "-";
    pdf.font("Helvetica").fontSize(BODY_SIZE);
    const height = Math.max(
      pdf.heightOfString(label, { width: labelWidth }),
      pdf.heightOfString(value, { width: valueWidth }),
    );
    ensureSpace(pdf, height + 8);
    const top = pdf.y;
    pdf
      .font("Helvetica-Bold")
      .fillColor(COLORS.soft)
      .text(label, left, top, { width: labelWidth })
      .font("Helvetica")
      .fillColor(COLORS.ink)
      .text(value, left + labelWidth + 10, top, { width: valueWidth });
    pdf.y = top + height + 6;
  });
  pdf.x = left;
  pdf.moveDown(0.6);
};

const drawTable = (pdf: Pdf, columns: string[], rows: string[][]) => {
  const left = pdf.page.margins.left;
  const width = contentWidth(pdf);
  const columnCount = Math.max(columns.length, 1);
  const cellWidth = width / columnCount;
  const padding = 5;
  const fontSize = columnCount > 4 ? 8.5 : 9.5;

  const drawRow = (cells: string[], header: boolean) => {
    pdf.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);
    const texts = Array.from({ length: columnCount }, (_, index) =>
      printable(cells[index] ?? ""),
    );
    const height =
      Math.max(
        ...texts.map((text) =>
          pdf.heightOfString(text || " ", { width: cellWidth - padding * 2 }),
        ),
      ) +
      padding * 2;
    if (pdf.y + height > bottomLimit(pdf)) {
      pdf.addPage();
      if (!header) drawRow(columns, true);
    }
    // The repeated header above leaves its bold font behind.
    pdf.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);
    const top = pdf.y;
    if (header) pdf.rect(left, top, width, height).fill(COLORS.sunken);
    texts.forEach((text, index) => {
      pdf
        .fillColor(header ? COLORS.brand : COLORS.ink)
        .text(text, left + index * cellWidth + padding, top + padding, {
          width: cellWidth - padding * 2,
        });
    });
    pdf
      .moveTo(left, top + height)
      .lineTo(left + width, top + height)
      .lineWidth(0.6)
      .strokeColor(COLORS.edge)
      .stroke();
    pdf.y = top + height;
  };

  ensureSpace(pdf, 60);
  drawRow(columns, true);
  rows.forEach((row) => drawRow(row, false));
  pdf.x = left;
  pdf.moveDown(1);
};

const drawProperty = (pdf: Pdf, property: RenderedProperty) => {
  const left = pdf.page.margins.left;
  const width = contentWidth(pdf);
  const photoHeight = property.photo
    ? Math.min(220, (width * property.photo.height) / property.photo.width)
    : 0;
  pdf.font("Helvetica").fontSize(BODY_SIZE);
  const factsHeight = property.facts.length * 15 + 60;
  ensureSpace(pdf, Math.min(photoHeight + factsHeight, 600));

  pdf
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(COLORS.ink)
    .text(printable(property.title), left)
    .moveDown(0.3);

  if (property.photo) {
    const top = pdf.y;
    pdf.image(property.photo.buffer, left, top, {
      fit: [width, photoHeight],
      align: "center",
    });
    pdf.y = top + photoHeight + 8;
  }

  property.facts.forEach((fact) => {
    body(pdf).text(`• ${printable(fact)}`, left, pdf.y, { width });
  });
  if (property.link) {
    pdf.moveDown(0.3).fillColor(COLORS.brand).text(property.link, left, pdf.y, {
      link: property.link,
      underline: true,
    });
  }
  pdf.moveDown(1.2);
};

const drawSignatures = (pdf: Pdf, names: string[]) => {
  const left = pdf.page.margins.left;
  const width = contentWidth(pdf);
  const columnWidth = (width - 30) / 2;

  for (let index = 0; index < names.length; index += 2) {
    ensureSpace(pdf, 80);
    const top = pdf.y + 40;
    names.slice(index, index + 2).forEach((name, column) => {
      const x = left + column * (columnWidth + 30);
      pdf
        .moveTo(x, top)
        .lineTo(x + columnWidth, top)
        .lineWidth(0.8)
        .strokeColor(COLORS.ink)
        .stroke()
        .font("Helvetica")
        .fontSize(9.5)
        .fillColor(COLORS.ink)
        .text(printable(name), x, top + 5, {
          width: columnWidth,
          align: "center",
        });
    });
    pdf.y = top + 30;
  }
  pdf.x = left;
  pdf.moveDown(1);
};

const drawPageNumbers = (pdf: Pdf, document: RenderDocument) => {
  const range = pdf.bufferedPageRange();
  for (let index = 0; index < range.count; index++) {
    pdf.switchToPage(range.start + index);
    const bottom = pdf.page.margins.bottom;
    pdf.page.margins.bottom = 0;
    pdf
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.soft)
      .text(
        printable(`${document.title} · Página ${index + 1} de ${range.count}`),
        pdf.page.margins.left,
        pdf.page.height - 34,
        { width: contentWidth(pdf), align: "center", lineBreak: false },
      );
    pdf.page.margins.bottom = bottom;
  }
};
