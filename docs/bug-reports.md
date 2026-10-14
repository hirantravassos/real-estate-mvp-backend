# Bug reports

Brokers report problems from inside the app. The backoffice triages them at
`/admin/bugs`, and every day at 9h (Brasília) each `ADMIN_ALLOWED_EMAILS`
address gets a mail with how many are open. There is no mail per report.

## How a report arrives

| Source           | Where                                               | Severity                                            |
| ---------------- | --------------------------------------------------- | --------------------------------------------------- |
| `button`         | The 🐞 tab on the right edge, with a text           | normal, or high when "impede o trabalho" is checked |
| `shake`          | Shaking the phone shows a toast, then the form      | same as button                                      |
| `panic`          | "Botão de pânico" in the same menu, one tap         | critical                                            |
| `error_boundary` | The crash screen of the app (`app/(app)/error.tsx`) | high                                                |

Severity, status and owner are always set by the server. `POST /bug-reports`
works without a subscription and is limited to 10 per broker in 10 minutes.

## Telemetry

The frontend keeps, in memory only, the last 20 errors (window errors,
unhandled rejections, `console.error`, the crash screen), the last 40 API
calls (method, path, status, time, error code and message) and the last 50
steps (navigation, clicks by visible name, tab visibility, connection). It
also sends the page, build (`NEXT_PUBLIC_APP_VERSION`, the Railway commit),
device, viewport, network and timing.

Never sent: request or response bodies, query strings, form values, headers,
tokens. `sanitizeBugReportTelemetry` copies every field by name, cuts it to
size and scrubs bearer tokens, JWTs and secret looking fields again on the
server. The server adds the IP, the user agent and, on read, the broker's
audit trail from 30 minutes before to 5 minutes after the report.

## Fixing one with an agent

Open the report in `/admin/bugs`, press **Copiar para agente** and paste the
markdown brief into the coding agent. It has the broker's words, page, build,
device, errors with stacks, API calls, steps and the server audit trail, but
not the broker's name or email. Then set the status and a note (cause, PR).

## Retention

Closed reports (resolved or dismissed) are deleted six months after their
last change. Deleting an account deletes its reports.
