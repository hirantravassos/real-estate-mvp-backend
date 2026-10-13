import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

/** Brokers read the dates where they live, not in the server's zone. */
const MAIL_TIMEZONE = process.env.APP_TIMEZONE || "America/Sao_Paulo";

export const formatMailDate = (date: Date) =>
  dayjs(date).tz(MAIL_TIMEZONE).format("DD/MM/YYYY");

export const formatMailCurrency = (amountInBrl: number) =>
  amountInBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatMailCount = (value: number) => value.toLocaleString("pt-BR");
