"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import { GlassTextarea } from "@/components/glass/GlassInput";
import { KIND_ITEMS, KIND_META } from "@/components/notes/kinds";
import { Sheet } from "@/components/ui/Sheet";
import { ToggleChip } from "@/components/ui/ToggleChip";
import type { NoteKind } from "@/lib/constants";
import type { DoneNote } from "@/lib/queries/reminders";

export type DoneSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "done": mark a follow-up done, the note optional. "note": add the note to a past follow-up. */
  mode?: "done" | "note";
  /** The follow-up's text ("Send her the deck"). */
  title: string;
  /** Under the title: when it's due, or when it was done. */
  subtitle?: string;
  personName: string;
  /** For a repeating follow-up: "every month · next Fri, 5 Dec". */
  repeat?: string | null;
  /** Called once, with the note when it has words. */
  onConfirm: (note: DoneNote | null) => void;
};

/** "Dr. Marija Novak" → "Marija": the first word that isn't a title or an initial. */
export const firstName = (name: string) => {
  const words = name.trim().split(/\s+/);
  return words.find((w) => !w.endsWith(".")) ?? words[0] ?? name;
};
/** Reaching out comes first here: a message is the usual follow-up. */
const KINDS = (["message", "call", "meeting", "note"] as const).map((k) => KIND_ITEMS.find((i) => i.value === k)!);
/** Typing on a phone keyboard is opt-in: only a mouse/trackpad gets the caret right away. */
const finePointer = () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

/**
 * Marking a follow-up done, with an optional note on what was sent or said (a message, call,
 * meeting or plain note). The note is saved to the person's notes and linked to the follow-up's
 * history entry. ⌘↩ confirms from the text field.
 */
export function DoneSheet({ open, onOpenChange, mode = "done", title, subtitle, personName, repeat, onConfirm }: DoneSheetProps) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<NoteKind>("message");
  const [wasOpen, setWasOpen] = useState(open);
  const field = useRef<HTMLTextAreaElement>(null);
  const first = firstName(personName);
  const hasNote = !!text.trim();

  // A fresh, empty sheet every time it opens.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setText("");
      setKind("message");
    }
  }

  const confirm = () => {
    if (mode === "note" && !hasNote) return false;
    onConfirm(hasNote ? { text: text.trim(), kind } : null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (confirm() !== false) onOpenChange(false);
    }
  };

  const hint =
    mode === "note"
      ? `Saved to ${first}’s notes and this follow-up.`
      : hasNote
        ? `Saved to ${first}’s notes and their follow-up history.`
        : `Kept in ${first}’s follow-up history. A note is optional.`;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "note" ? "Add a note" : "Mark as done"}
      description={
        <span className="block min-w-0">
          <span className="block truncate text-fg">{title}</span>
          {subtitle && <span className="block truncate tabular-nums">{subtitle}</span>}
        </span>
      }
      cancel
      done={mode === "note" ? "Save" : "Done"}
      doneDisabled={mode === "note" && !hasNote}
      onDone={confirm}
      width={480}
      initialFocus={finePointer() ? field : undefined}
    >
      <div className="space-y-3 pt-2 pb-1">
        <GlassTextarea
          ref={field}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={4}
          maxLength={20_000}
          autoCapitalize="sentences"
          aria-label={`Note about ${personName}`}
          placeholder={mode === "note" ? `What did you send ${first} or talk about?` : `What did you send ${first} or talk about? (optional)`}
        />
        <div role="group" aria-label="Type of note" className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <ToggleChip key={k.value} pressed={kind === k.value} onPressedChange={() => setKind(k.value)} icon={KIND_META[k.value].icon(13)} size="sm">
              {k.label}
            </ToggleChip>
          ))}
        </div>
        <p className="px-1 text-footnote text-fg-3">
          {repeat && mode === "done" ? <span className="text-fg-2">Repeats {repeat}. </span> : null}
          {hint}
        </p>
      </div>
    </Sheet>
  );
}
