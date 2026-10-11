import {
  AlignmentType,
  BorderStyle,
  Document as WordDocument,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import {
  RenderBlock,
  RenderDocument,
  RenderedProperty,
} from "./document-spec.helper";

const BRAND = "1A66D1";
const INK = "0F2A4A";
const SOFT = "4B6584";
const EDGE = "CFE6FB";
const SUNKEN = "EEF7FF";
const FONT = "Calibri";
/** A4 width minus the margins, in pixels as Word reads images. */
const CONTENT_WIDTH_PIXELS = 600;

const text = (
  value: string,
  options: { bold?: boolean; color?: string } = {},
) => new TextRun({ text: value, font: FONT, size: 22, color: INK, ...options });

/** Writes the document as a Word file the broker can still edit. */
export const renderDocx = async (document: RenderDocument): Promise<Buffer> => {
  const word = new WordDocument({
    creator: document.author,
    title: document.title,
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [
                      `${document.title} · Página `,
                      PageNumber.CURRENT,
                    ],
                    size: 16,
                    color: SOFT,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            children: [
              text(`${document.author} · ${document.date}`, { color: SOFT }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.TITLE,
            spacing: { before: 120, after: document.subtitle ? 60 : 240 },
            children: [
              new TextRun({
                text: document.title,
                bold: true,
                size: 40,
                color: INK,
              }),
            ],
          }),
          ...(document.subtitle
            ? [
                new Paragraph({
                  spacing: { after: 240 },
                  children: [
                    new TextRun({
                      text: document.subtitle,
                      size: 24,
                      color: SOFT,
                    }),
                  ],
                }),
              ]
            : []),
          ...document.blocks.flatMap((block) => renderBlock(block)),
        ],
      },
    ],
  });
  return Packer.toBuffer(word);
};

const renderBlock = (block: RenderBlock): (Paragraph | Table)[] => {
  switch (block.type) {
    case "heading":
      return [
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: block.text,
              bold: true,
              size: 28,
              color: BRAND,
            }),
          ],
        }),
      ];
    case "paragraph":
      return block.text.split(/\n+/).map(
        (line) =>
          new Paragraph({
            spacing: { after: 160, line: 300 },
            alignment: AlignmentType.JUSTIFIED,
            children: [text(line)],
          }),
      );
    case "bullets":
      return block.items.map(
        (item) =>
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [text(item)],
          }),
      );
    case "fields":
      return [fieldsTable(block.fields), spacer()];
    case "table":
      return [dataTable(block.columns, block.rows), spacer()];
    case "property":
      return renderProperty(block.property);
    case "signatures":
      return block.names.flatMap((name) => [
        new Paragraph({
          spacing: { before: 600 },
          children: [text("_".repeat(45))],
        }),
        new Paragraph({ spacing: { after: 120 }, children: [text(name)] }),
      ]);
    case "page_break":
      return [new Paragraph({ children: [new PageBreak()] })];
  }
};

const spacer = () => new Paragraph({ spacing: { after: 120 }, children: [] });

const cell = (
  value: string,
  options: { header?: boolean; width?: number } = {},
) =>
  new TableCell({
    width: options.width
      ? { size: options.width, type: WidthType.PERCENTAGE }
      : undefined,
    shading: options.header
      ? { type: ShadingType.CLEAR, color: "auto", fill: SUNKEN }
      : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        children: [
          text(value, options.header ? { bold: true, color: BRAND } : {}),
        ],
      }),
    ],
  });

const borders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: EDGE },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: EDGE },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: EDGE },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

const fieldsTable = (fields: { label: string; value: string }[]) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders,
    rows: fields.map(
      (field) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 34, type: WidthType.PERCENTAGE },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [text(field.label, { bold: true, color: SOFT })],
                }),
              ],
            }),
            cell(field.value || "-", { width: 66 }),
          ],
        }),
    ),
  });

const dataTable = (columns: string[], rows: string[][]) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders,
    rows: [
      new TableRow({
        tableHeader: true,
        children: columns.map((column) => cell(column, { header: true })),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: columns.map((_, index) => cell(row[index] ?? "")),
          }),
      ),
    ],
  });

const renderProperty = (property: RenderedProperty): Paragraph[] => {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({ text: property.title, bold: true, size: 26, color: INK }),
      ],
    }),
  ];
  if (property.photo) {
    const width = CONTENT_WIDTH_PIXELS;
    const height = Math.min(
      330,
      Math.round((width * property.photo.height) / property.photo.width),
    );
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: "jpg",
            data: property.photo.buffer,
            transformation: {
              width: Math.round(
                (height * property.photo.width) / property.photo.height,
              ),
              height,
            },
          }),
        ],
      }),
    );
  }
  property.facts.forEach((fact) =>
    paragraphs.push(
      new Paragraph({ bullet: { level: 0 }, children: [text(fact)] }),
    ),
  );
  paragraphs.push(
    new Paragraph({
      spacing: { before: 80, after: 240 },
      children: [
        new ExternalHyperlink({
          link: property.link,
          children: [
            new TextRun({
              text: property.link,
              style: "Hyperlink",
              color: BRAND,
              underline: {},
            }),
          ],
        }),
      ],
    }),
  );
  return paragraphs;
};
