export interface MailDetail {
  label: string;
  value: string;
}

export interface MailAction {
  label: string;
  /** Absolute https link to the app, built by the sender. */
  url: string;
}

/**
 * Content of one transactional mail. Every string is plain text: the layout
 * escapes it, so a name or a reason coming from outside never becomes HTML.
 */
export interface MailMessage {
  /** Short key for the logs, never personal data. */
  kind: string;
  subject: string;
  /** The line mail clients show next to the subject. */
  preheader: string;
  heading: string;
  paragraphs: string[];
  details?: MailDetail[];
  action?: MailAction;
  footnote?: string;
}

const BRAND_NAME = "BrokerIn";
const BRAND_COLOR = "#4f46e5";

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Only an http(s) link becomes a button, anything else is dropped. */
const safeUrlOf = (url: string) =>
  /^https?:\/\/[^\s"'<>]+$/i.test(url) ? url : null;

const renderDetails = (details: MailDetail[]) => {
  const rows = details
    .map(
      (detail) =>
        `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">${escapeHtml(detail.label)}</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;text-align:right;">${escapeHtml(detail.value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">${rows}</table>`;
};

const renderAction = (action: MailAction) => {
  const url = safeUrlOf(action.url);
  if (!url) return "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:8px;background:${BRAND_COLOR};"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(action.label)}</a></td></tr></table>`;
};

export const renderMailHtml = (message: MailMessage) => {
  const paragraphs = message.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
  const details = message.details?.length ? renderDetails(message.details) : "";
  const action = message.action ? renderAction(message.action) : "";
  const footnote = message.footnote
    ? `<p style="margin:16px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">${escapeHtml(message.footnote)}</p>`
    : "";

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(message.subject)}</title></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;"><span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(message.preheader)}</span><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px;"><tr><td><p style="margin:0 0 24px;color:${BRAND_COLOR};font-size:18px;font-weight:700;">${BRAND_NAME}</p><h1 style="margin:0 0 16px;color:#111827;font-size:22px;line-height:1.3;">${escapeHtml(message.heading)}</h1>${paragraphs}${details}${action}${footnote}</td></tr></table><p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">Você recebeu este e-mail porque tem uma conta no ${BRAND_NAME}.</p></td></tr></table></body></html>`;
};

export const renderMailText = (message: MailMessage) => {
  const lines = [message.heading, "", ...message.paragraphs];
  if (message.details?.length) {
    lines.push(
      "",
      ...message.details.map((detail) => `${detail.label}: ${detail.value}`),
    );
  }
  const actionUrl = message.action ? safeUrlOf(message.action.url) : null;
  if (message.action && actionUrl) {
    lines.push("", `${message.action.label}: ${actionUrl}`);
  }
  if (message.footnote) lines.push("", message.footnote);
  lines.push("", BRAND_NAME);
  return lines.join("\n");
};
