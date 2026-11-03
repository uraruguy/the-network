/** Apple Notes folders named after a person ("Ana", "Matevž") vs context folders ("Work", "Travel"). */
import { deaccent, nicknameCanon } from "./names";

const listed = (raw: string | undefined) => (raw ?? "").split(",").map((f) => f.trim()).filter(Boolean);

/** Folders you named after a person, from IMPORT_PERSON_FOLDERS="Ana,Matevž" (a hint, not a requirement: see isPersonFolder). */
export const listedPersonFolders = (raw = process.env.IMPORT_PERSON_FOLDERS) => listed(raw);

/** Diary-style folders: their notes are excerpted, not filed whole. Add yours with IMPORT_JOURNAL_FOLDERS. */
export const JOURNAL_FOLDERS = ["Journal", "Diary", "Daily notes", "Dnevnik"];
export const listedJournalFolders = (raw = process.env.IMPORT_JOURNAL_FOLDERS) => [...JOURNAL_FOLDERS, ...listed(raw)];

/** Folders that look like a single name but are contexts (topics, places, common Apple Notes folders). */
export const CONTEXT_FOLDERS = [
  "Notes", "Business", "Work", "Health", "Goals", "Ideas", "Journal", "Diary", "Travel", "Locked", "Misc", "Meeting Notes",
];

const fold = (s: string) => deaccent(s.normalize("NFC")).toLowerCase().trim();
const CONTEXT = new Set(CONTEXT_FOLDERS.map(fold));

/**
 * A folder is person-named when it is listed (IMPORT_PERSON_FOLDERS), or it is a single
 * capitalised word that is not a known context folder and matches the first name of ≥2 extracted
 * candidates.
 */
export function isPersonFolder(folder: string | null | undefined, firstNameCounts?: Map<string, number>, listed: string[] = listedPersonFolders()): boolean {
  if (!folder) return false;
  const f = fold(folder);
  if (listed.some((p) => fold(p) === f)) return true;
  if (CONTEXT.has(f)) return false;
  if (!/^\p{Lu}[\p{Ll}]+$/u.test(folder.normalize("NFC").trim())) return false;
  const canon = nicknameCanon(f);
  return (firstNameCounts?.get(f) ?? 0) + (canon !== f ? (firstNameCounts?.get(canon) ?? 0) : 0) >= 2;
}

/** The person-named folder of a note, if any. */
export function personFolderOf(folders: string[], firstNameCounts?: Map<string, number>, listed?: string[]): string | null {
  return folders.find((f) => isPersonFolder(f, firstNameCounts, listed)) ?? null;
}

export function isJournalFolder(folders: string[], journal: string[] = listedJournalFolders()) {
  const names = journal.map(fold);
  return folders.some((f) => names.includes(fold(f)));
}
