import {
  escapeHtml,
  MailMessage,
  renderMailHtml,
  renderMailText,
} from "./mail-layout.template";

/** Kept apart, the lint wants double quotes and prettier wants no escapes. */
const QUOTE = String.fromCharCode(34);
const APOSTROPHE = String.fromCharCode(39);

const messageOf = (overrides: Partial<MailMessage> = {}): MailMessage => ({
  kind: "test",
  subject: "Assunto",
  preheader: "Resumo",
  heading: "Olá",
  paragraphs: ["Primeiro parágrafo"],
  ...overrides,
});

describe("mail layout", () => {
  it("escapes every character that could open HTML", () => {
    const hostile = `<a href=${QUOTE}x${QUOTE} onclick=${APOSTROPHE}y${APOSTROPHE}>&</a>`;
    expect(escapeHtml(hostile)).toBe(
      "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
    );
  });

  it("renders a hostile name as text, never as markup", () => {
    const html = renderMailHtml(
      messageOf({
        heading: "Obrigado, <img src=x onerror=alert(1)>!",
        paragraphs: ["<script>alert(1)</script>"],
        details: [{ label: "Plano", value: "<b>Premium</b>" }],
      }),
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>Premium</b>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("drops a button whose link is not http or https", () => {
    const html = renderMailHtml(
      messageOf({ action: { label: "Abrir", url: "javascript:alert(1)" } }),
    );
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("Abrir");
  });

  it("keeps an https button and opens it without the opener", () => {
    const html = renderMailHtml(
      messageOf({
        action: { label: "Abrir", url: "https://app.example.com/assinatura" },
      }),
    );
    expect(html).toContain(
      `href=${QUOTE}https://app.example.com/assinatura${QUOTE}`,
    );
    expect(html).toContain(`rel=${QUOTE}noopener noreferrer${QUOTE}`);
  });

  it("writes a plain text version with the details and the link", () => {
    const text = renderMailText(
      messageOf({
        details: [{ label: "Plano", value: "Premium" }],
        action: { label: "Abrir", url: "https://app.example.com/home" },
      }),
    );
    expect(text).toContain("Plano: Premium");
    expect(text).toContain("Abrir: https://app.example.com/home");
  });
});
