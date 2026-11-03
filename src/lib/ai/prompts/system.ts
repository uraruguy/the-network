/**
 * Whose notes the import reads: the owner's name (their profile) and an optional line about them
 * (`IMPORT_CONTEXT`, e.g. "Designer in Lisbon; notes in Portuguese and English"). The prompts
 * use it to skip the owner and to read "met", "we", "jaz" from their point of view.
 */
export type ImportOwner = { name: string | null; context: string | null };

export const importOwner = (name: string | null | undefined, context?: string | null): ImportOwner => ({
  name: name?.trim() || null,
  context: context?.trim() || null,
});

/** How the prompts refer to the owner: their first name, else "the owner". */
export const ownerFirstName = (o: ImportOwner) => o.name?.split(/\s+/)[0] ?? "the owner";

/** The ways the owner shows up in their own notes, for the `self` disposition. */
export const ownerSelfForms = (o: ImportOwner) => [...new Set([ownerFirstName(o), o.name].filter((n): n is string => !!n && n !== "the owner")), "I", "me", "jaz"];

/** Shared context for every import prompt. */
export function importSystem(owner: ImportOwner) {
  return `You help ${owner.name ?? "the owner"} organise their personal network from their own notes.${owner.context ? `\nAbout them: ${owner.context}` : ""}
Notes can mix languages and colloquial spelling (e.g. Slovenian with English; colloquial spelling: "rekou" = rekel, "biu" = bil, "šou" = šel, "tko" = tako, "blo" = bilo). Read them fluently.
Names can be declined (Slovenian: Matevž/Matevža/Matevžu/Matevžem, Neža/Neže/Neži/Nežo, Miha/Mihe/Mihi/Miho, Jani/Janija/Janiju/Janijem). Always report names in the nominative.
Be precise, never invent facts. Prefer null over guessing. Keep names exactly as written (diacritics included).`;
}
