import { Bell, ChevronLeft, ClipboardPaste, Heart, MessageCircle, MoreHorizontal, NotebookPen, Sparkles, SquarePen } from "lucide-react";
import { Avatar } from "../../kit/Avatar";
import { Chip, InsetGroup, ListRow, WARMTH_COLOR } from "./parts";

function QuickAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex min-w-0 flex-col items-center gap-1.5 rounded-md py-1">
      <span className="glass specular grid size-[52px] place-items-center rounded-full text-accent-text [&_svg]:size-[22px]">{icon}</span>
      <span className="max-w-full truncate text-caption font-medium text-accent-text">{label}</span>
    </span>
  );
}

/**
 * PersonDetail at desktop width (max-w-2xl column): Inês Sampaio, freshly created by the paste
 * import. `scroll` moves the page; `avatarIn` (0..1) lets the avatar grow in from the list row.
 */
export function PersonPage({ scroll = 0, avatarIn = 1 }: { scroll?: number; avatarIn?: number }) {
  return (
    <div className="mx-auto w-full" style={{ maxWidth: 1100, padding: "0 40px 32px", transform: `translateY(${-scroll}px)` }}>
      <div className="mx-auto max-w-2xl pb-6">
        <div className="grid h-13 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2" style={{ margin: "0 -32px 4px", padding: "0 32px" }}>
          <span className="-ml-1 inline-flex h-11 items-center gap-0.5 justify-self-start rounded-full pr-3 pl-1 text-body text-accent-text">
            <ChevronLeft size={24} strokeWidth={2.4} /> People
          </span>
          <span />
          <span className="flex items-center gap-0.5 justify-self-end">
            <span className="inline-flex h-8 items-center px-3.5 text-footnote font-semibold text-accent-text">Edit</span>
            <span className="grid size-11 place-items-center text-accent-text">
              <MoreHorizontal size={20} strokeWidth={2.2} />
            </span>
          </span>
        </div>
        <header className="flex flex-col items-center px-2 pt-2 pb-5 text-center">
          <span className="elevation-e2 rounded-full" style={{ transform: `scale(${0.4 + 0.6 * avatarIn})`, opacity: Math.min(1, avatarIn * 2) }}>
            <Avatar name="Inês Sampaio" size={104} />
          </span>
          <h1 className="mt-3.5 max-w-full text-title1 text-fg">Inês Sampaio</h1>
          <p className="mt-1 text-subhead text-fg-2">Product designer · Figma</p>
          <p className="mt-1.5 flex items-center justify-center gap-x-1.5 text-footnote text-fg-3">
            <span>🇵🇹</span> Lisbon <span>·</span> <span className="tabular-nums">13:42 · 1h behind</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <Chip size="sm">
              <span className="size-2 rounded-full" style={{ background: WARMTH_COLOR.inner }} />
              Close
            </Chip>
            <Chip size="sm" color="var(--palette-coral)">
              <Heart size={12} /> Friend
            </Chip>
          </div>
        </header>
        <div className="mb-7 grid grid-cols-4 gap-2 px-6">
          <QuickAction icon={<NotebookPen />} label="Note" />
          <QuickAction icon={<Bell />} label="Follow up" />
          <QuickAction icon={<MessageCircle />} label="Message" />
          <QuickAction icon={<Sparkles />} label="Ask" />
        </div>
        <div className="space-y-7">
          <InsetGroup header="Next follow-up" headerAction={<span className="font-medium text-accent-text">+ Add</span>}>
            <div className="flex min-h-[60px] items-center gap-1 pr-2 pl-1.5">
              <span className="grid size-11 shrink-0 place-items-center">
                <span className="size-[24px] rounded-full border-[1.5px] border-fg-4" />
              </span>
              <span className="min-w-0 flex-1 py-2">
                <span className="block truncate text-body font-medium text-fg">Bouldering at Lisbon Boulder Lab</span>
                <span className="mt-0.5 block text-footnote font-medium text-accent-text">Thu, 5 Nov</span>
              </span>
            </div>
          </InsetGroup>
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3 pl-1">
              <h2 className="flex items-baseline gap-2 text-title3 text-fg">
                Notes <span className="text-subhead font-normal text-fg-3 tabular-nums">1</span>
              </h2>
              <SquarePen size={22} className="mr-1 text-accent-text" />
            </div>
            <div className="space-y-1.5">
              <h3 className="px-4 text-footnote font-semibold tracking-[0.02em] text-fg-3 uppercase">Today</h3>
              <div className="surface overflow-hidden rounded-lg px-4 py-3">
                <div className="truncate text-headline text-fg">Web Summit Lisbon, day 2</div>
                <div className="mt-0.5 truncate text-subhead">
                  <span className="text-fg-2">16:20</span> <span className="text-fg-3">Met Inês Sampaio, product designer at Figma. Climbs on Thursdays.</span>
                </div>
              </div>
            </div>
            <InsetGroup>
              <ListRow icon={<ClipboardPaste />} label="Paste from Apple Notes" description="AI files it as notes on Inês" chevron last />
            </InsetGroup>
          </section>
          <InsetGroup header="Do together" headerAction={<span className="font-medium text-accent-text">Edit</span>}>
            <div className="flex flex-wrap gap-2 p-3">
              <Chip>
                <span className="text-subhead leading-none">🧗</span> Climbing
              </Chip>
              <Chip>
                <span className="text-subhead leading-none">☕️</span> Coffee
              </Chip>
            </div>
          </InsetGroup>
          <InsetGroup header="Who they are" headerAction={<span className="font-medium text-accent-text">Edit</span>}>
            <div className="flex flex-wrap gap-2 p-3">
              <Chip color="var(--palette-violet)">design community</Chip>
              <Chip color="var(--palette-green)">climbing crew</Chip>
            </div>
          </InsetGroup>
          <InsetGroup header="How we met">
            <div className="relative px-4 py-3 after:absolute after:right-0 after:bottom-0 after:left-4 after:h-[0.5px] after:bg-separator">
              <p className="text-body text-fg">Web Summit Lisbon, day 2. Valentina sat us at the same table.</p>
            </div>
            <ListRow label="Met in" value="🇵🇹 Lisbon" />
            <ListRow leading={<Avatar name="Valentina Dubois" size={30} />} label="Valentina Dubois" description="Introduced you" chevron last />
          </InsetGroup>
        </div>
      </div>
    </div>
  );
}
