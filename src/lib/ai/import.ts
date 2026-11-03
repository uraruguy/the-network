import { generateText, Output } from "ai";
import { aiFastModel, aiModel } from "./provider";
import { classificationSchema, extractionSchema, type Classification, type Extraction } from "./import-schemas";
import { z } from "zod";
import { CandidateV2, ExtractionV2Model, ScreenResult, EXTRACTION_VERSION, type ExtractionV2, type ScreenItem } from "@/lib/import/contracts";
import { mergeChunkCandidates } from "@/lib/import/merge";
import { importSystem, ownerFirstName, type ImportOwner } from "./prompts/system";
import { screenPrompt } from "./prompts/screen";
import { chunkNote, extractPrompt } from "./prompts/extract";

/* ------------------------------------------------------------------ */
/*  v2 pipeline (scripts/import/run-stage.ts)                          */
/* ------------------------------------------------------------------ */

/** Screens up to ~10 notes in one call on their full text (≤8k chars each). */
export async function screenBatch(items: { id: string; title: string | null; text: string; folders: string[] }[], owner: ImportOwner): Promise<ScreenItem[]> {
  const { output } = await generateText({
    model: await aiFastModel(),
    system: importSystem(owner),
    output: Output.object({ schema: ScreenResult, name: "screen" }),
    maxOutputTokens: 4000,
    prompt: screenPrompt(items, owner),
  });
  return output.items;
}

/**
 * Structured outputs on the Anthropic API (direct or via OpenRouter) reject schemas with more than
 * 16 nullable/union parameters; the full v2 schema has 17. The compact variant drops three rarely
 * filled fields (they come back as null) so API-key providers can run the extraction.
 */
const COMPACT_OMIT = { introducedBy: true, whatICanAsk: true, metCity: true } as const;
const ExtractionV2Compact = ExtractionV2Model.extend({ candidates: z.array(CandidateV2.omit(COMPACT_OMIT)) });

/**
 * Extraction v2. Notes longer than the chunk size are split at headings/blank lines and merged by name.
 * `tier: "fast"` uses the fast model; `compact` uses the reduced schema (the in-app quick import
 * sets both for short notes on API-key providers).
 */
export async function extractNoteV2(input: {
  title: string | null;
  text: string;
  created: string | null;
  folders: string[];
  existingNames: string[];
  mode: "full" | "journal";
  owner: ImportOwner;
  tier?: "main" | "fast";
  compact?: boolean;
}): Promise<ExtractionV2> {
  const { tier = "main", compact = false, ...promptInput } = input;
  const chunks = chunkNote(promptInput.text);
  const parts = [];
  for (let i = 0; i < chunks.length; i++) {
    const call = {
      model: tier === "fast" ? await aiFastModel() : await aiModel(),
      system: importSystem(promptInput.owner),
      maxOutputTokens: 16000,
      prompt: extractPrompt({ ...promptInput, text: chunks[i]!, chunk: chunks.length > 1 ? { index: i, total: chunks.length } : undefined }),
    };
    if (compact) {
      const { output } = await generateText({ ...call, output: Output.object({ schema: ExtractionV2Compact, name: "extraction" }) });
      parts.push({ ...output, candidates: output.candidates.map((c) => ({ ...c, introducedBy: null, whatICanAsk: null, metCity: null })) });
    } else {
      const { output } = await generateText({ ...call, output: Output.object({ schema: ExtractionV2Model, name: "extraction" }) });
      parts.push(output);
    }
  }
  const first = parts[0]!;
  return {
    version: EXTRACTION_VERSION,
    noteSummary: parts.map((p) => p.noteSummary).join(" ").slice(0, 1200),
    suggestedTitle: first.suggestedTitle,
    occurredAt: parts.find((p) => p.occurredAt)?.occurredAt ?? null,
    candidates: mergeChunkCandidates(parts.map((p) => p.candidates)),
    chunks: chunks.length,
    mode: promptInput.mode,
  };
}

/* ------------------------------------------------------------------ */
/*  v1 (in-app import flow)                                            */
/* ------------------------------------------------------------------ */

export async function classifyBatch(items: { id: string; title: string | null; text: string; folder: string | null }[], owner: ImportOwner): Promise<Classification[]> {
  const list = items
    .map((it) => `### ${it.id}\nFolder: ${it.folder ?? "-"}\nTitle: ${it.title ?? "-"}\n${it.text.slice(0, 700)}`)
    .join("\n\n");
  const { output } = await generateText({
    model: await aiFastModel(),
    system: importSystem(owner),
    output: Output.object({ schema: classificationSchema, name: "classification" }),
    maxOutputTokens: 4000,
    prompt: `Classify each note below. A note is about people when it records information about specific, named humans ${ownerFirstName(owner)} has met or wants to remember (who they are, what they said, how they met). Meeting notes with a named counterpart count. Daily diary entries, company/task notes, quotes, ideas, travel logs without notable people are not_people.\n\n${list}`,
  });
  return output.items;
}

export async function extractNote(input: {
  title: string | null;
  text: string;
  html: string | null;
  created: string | null;
  folder: string | null;
  existingNames: string[];
  owner: ImportOwner;
}): Promise<Extraction> {
  const me = ownerFirstName(input.owner);
  const known = input.existingNames.length ? `\nPeople already in The Network (use these exact names when the note is about them): ${input.existingNames.slice(0, 400).join("; ")}` : "";
  const { output } = await generateText({
    model: await aiModel(),
    system: importSystem(input.owner),
    output: Output.object({ schema: extractionSchema, name: "extraction" }),
    maxOutputTokens: 12000,
    prompt: `Extract the people from this Apple Note into structured candidates. One candidate per real person ${me} would want as a contact card. Skip ${me} themself, companies, and people mentioned only in passing with nothing memorable.
- metContext: how/where/when ${me} met them — in their own words if present.
- categories: mentor (someone ${me} learns from / wants as mentor), friend, partner (business partner / colleague on a project), investor (VC/angel), client, founder (peer founder), acquaint.
- warmth: inner (very close), active (in touch), dormant, archive. circle: how close ${me} wants them: nice_to_know / hang_out_more / potential_close. Only set when the note gives a signal.
- hobbies only when explicitly mentioned.
- followUps: concrete next steps ${me} wrote (CTA, "moram poklicat", "send him…").
- keyFacts: short, factual, useful later.
Note created: ${input.created ?? "unknown"} · Folder: ${input.folder ?? "-"} · Title: ${input.title ?? "-"}${known}

--- NOTE TEXT ---
${input.text.slice(0, 12000)}`,
  });
  return output;
}
