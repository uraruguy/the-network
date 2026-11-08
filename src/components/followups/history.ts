import type { Recurrence } from "@/lib/constants";
import { formatShortDate } from "@/lib/format";
import { repeatLabel } from "./recurrence";

/** What the meta line under a follow-up history entry is built from. */
export type HistoryFacts = { completedAt: string | Date; dueAt: string | Date; recurrence: Recurrence; recurrenceDays?: number | null; via: string | null };

const DAY = 86_400_000;
const dayIndex = (d: string | Date) => {
  const t = new Date(d);
  return Math.round(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / DAY);
};

const VIA: Record<string, string> = { email: "from the e-mail", assistant: "by the assistant" };

/**
 * "Done Tue, 3 Nov · due Sun, 1 Nov · every month · from the e-mail": when it was done, the due
 * date when that was another day, the repeat, and where it was marked done (the app says
 * nothing). Local calendar days. Pure.
 */
export function historyMeta(e: HistoryFacts, now: number): string[] {
  const parts = [`Done ${formatShortDate(e.completedAt, now)}`];
  if (dayIndex(e.completedAt) !== dayIndex(e.dueAt)) parts.push(`due ${formatShortDate(e.dueAt, now)}`);
  const repeat = repeatLabel(e.recurrence, e.recurrenceDays);
  if (repeat) parts.push(repeat);
  if (e.via && VIA[e.via]) parts.push(VIA[e.via]!);
  return parts;
}

/** "1 done", "12 done". */
export const historyCount = (n: number) => `${n.toLocaleString("en")} done`;
