"use client";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { GlassInput } from "@/components/glass/GlassInput";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { collapse } from "@/lib/motion";
import { usePersonWrites } from "@/lib/queries/people";
import { ActivityPicker } from "./ActivityPicker";
import { CityPicker } from "./CityPicker";
import { confirmDiscard, emptyPerson, FormSection, isPersonDirty, PersonFormFields, toPersonInput, validatePerson, type PersonFormErrors, type PersonFormValues } from "./PersonForm";
import { joinQuickAdd, useQuickAddHosted } from "./QuickAddPersonHost";

export { openQuickAdd, QuickAddPersonHost } from "./QuickAddPersonHost";

/* ------------------------------------------------------------------ */
/*  The sheet                                                          */
/* ------------------------------------------------------------------ */

export type QuickAddPersonSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill the name (e.g. from a search that found nobody). */
  initialName?: string;
  /** Called with the new person's id after it's created (default: open their profile). */
  onCreated?: (id: string) => void;
};

/**
 * Add someone in seconds: name, where they live, what you do together. "More details" unfolds
 * the full form in place. The person exists instantly (optimistic, offline-safe) and their
 * profile opens right away.
 */
export function QuickAddPersonSheet({ open, onOpenChange, initialName = "", onCreated }: QuickAddPersonSheetProps) {
  const router = useRouter();
  const writes = usePersonWrites();
  const [values, setValues] = useState<PersonFormValues>(emptyPerson);
  const [errors, setErrors] = useState<PersonFormErrors>({});
  const [more, setMore] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues({ ...emptyPerson, displayName: initialName });
      setErrors({});
      setMore(false);
    }
  }
  useEffect(() => {
    if (open) done.current = false;
  }, [open]);

  const base = { ...emptyPerson, displayName: initialName };
  const dirty = open && isPersonDirty(base, values);

  const change = (patch: Partial<PersonFormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    if (patch.displayName !== undefined && errors.displayName) setErrors((e) => ({ ...e, displayName: undefined }));
  };

  const create = () => {
    const errs = validatePerson(values);
    if (Object.keys(errs).length) {
      setErrors(errs);
      if (errs.displayName) nameRef.current?.focus();
      else setMore(true);
      return false;
    }
    const id = writes.create(toPersonInput(values));
    done.current = true;
    if (onCreated) onCreated(id);
    else router.push(`/people/${id}`);
  };

  const requestOpenChange = (next: boolean) => {
    if (next) return onOpenChange(true);
    if (done.current) return onOpenChange(false);
    void confirmDiscard(dirty).then((ok) => ok && onOpenChange(false));
  };

  /** Return in the name field adds the person (other fields keep Return for themselves). */
  const onNameKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (create() !== false) onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={requestOpenChange}
      title="New person"
      size={more ? "large" : "auto"}
      width={580}
      cancel
      done="Add"
      doneDisabled={!values.displayName.trim()}
      onDone={create}
      dismissible={!dirty}
      initialFocus={nameRef}
    >
      <form noValidate onSubmit={(e) => e.preventDefault()} className="space-y-6 pt-2">
        <FormSection>
          <Field label="Name" required error={errors.displayName}>
            <GlassInput
              ref={nameRef}
              value={values.displayName}
              onChange={(e) => change({ displayName: e.target.value })}
              placeholder="Full name"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="done"
              maxLength={200}
              onKeyDown={onNameKey}
            />
          </Field>
          <Field label="Lives in">
            <CityPicker value={values.homeLocation} onChange={(homeLocation) => change({ homeLocation })} placeholder="Search a city" />
          </Field>
        </FormSection>
        <FormSection title="Do together">
          <ActivityPicker value={values.activityIds} onChange={(activityIds) => change({ activityIds })} />
        </FormSection>

        <AnimatePresence initial={false} mode="popLayout">
          {more ? (
            <motion.div key="more" variants={collapse} initial="initial" animate="animate" exit="exit" className="overflow-hidden">
              <PersonFormFields values={values} onChange={change} errors={errors} hideName />
            </motion.div>
          ) : (
            <motion.div key="toggle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button
                type="button"
                onClick={() => setMore(true)}
                aria-expanded={more}
                className="pressable mx-auto flex h-11 items-center gap-1.5 rounded-full px-4 text-subhead font-medium text-accent-text hover:bg-accent-soft"
              >
                More details
                <ChevronDown size={16} strokeWidth={2.4} aria-hidden />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </Sheet>
  );
}

/**
 * v1-compatible controlled entry point (People list, Today). With `QuickAddPersonHost` mounted it
 * drives the single app-wide sheet; otherwise it renders its own.
 */
export function NewPersonSheet({ open, onClose, initialName }: { open: boolean; onClose: () => void; initialName?: string }) {
  const hosted = useQuickAddHosted();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!hosted || !open) return;
    // Opens the shared sheet; if the shortcut or the ?new=1 deep link got there first, its close is reported to us too.
    joinQuickAdd(initialName, () => onCloseRef.current());
  }, [hosted, open, initialName]);
  if (hosted) return null;
  return <QuickAddPersonSheet open={open} onOpenChange={(o) => !o && onClose()} initialName={initialName} />;
}
