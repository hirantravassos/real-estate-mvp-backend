import { formatMailDate } from "../../../infrastructure/mail/templates/mail-format.helper";
import { MailMessage } from "../../../infrastructure/mail/templates/mail-layout.template";
import { AdminBugReportSummaryDto } from "../dtos/bug-report.dto";

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

/**
 * The daily note to the backoffice: only counts, never what a broker typed,
 * so no customer data ever travels by mail. The details live in /admin/bugs.
 */
export const bugReportDigestMail = (
  summary: AdminBugReportSummaryDto,
  backofficeUrl: string,
): MailMessage => {
  const unresolved = summary.open + summary.inProgress;
  const subject =
    unresolved === 0
      ? "Nenhum bug aberto hoje"
      : `${plural(unresolved, "bug aberto", "bugs abertos")}${summary.criticalUnresolved ? `, ${plural(summary.criticalUnresolved, "crítico", "críticos")}` : ""}`;

  return {
    kind: "bug-report-digest",
    subject: `[BrokerIn admin] ${subject}`,
    preheader: `${plural(summary.newLast24Hours, "reporte novo", "reportes novos")} nas últimas 24 horas.`,
    heading: subject,
    paragraphs: [
      unresolved === 0
        ? "Nenhum reporte de problema esperando. Bom dia!"
        : "Resumo dos reportes de problema enviados pelos corretores. Os detalhes e a telemetria de cada um estão na área de admin.",
    ],
    details: [
      { label: "Abertos", value: String(summary.open) },
      { label: "Em andamento", value: String(summary.inProgress) },
      { label: "Críticos (pânico)", value: String(summary.criticalUnresolved) },
      { label: "Alta prioridade", value: String(summary.highUnresolved) },
      { label: "Novos em 24 horas", value: String(summary.newLast24Hours) },
      {
        label: "Resolvidos em 24 horas",
        value: String(summary.resolvedLast24Hours),
      },
      ...(summary.oldestUnresolvedAt
        ? [
            {
              label: "Mais antigo aberto desde",
              value: formatMailDate(new Date(summary.oldestUnresolvedAt)),
            },
          ]
        : []),
    ],
    action: { label: "Abrir os reportes", url: backofficeUrl },
    footnote:
      "Você recebe este resumo porque seu e-mail está em ADMIN_ALLOWED_EMAILS.",
  };
};
