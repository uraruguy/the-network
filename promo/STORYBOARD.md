# The Network: launch videos

Two 30-second videos for an X launch post, built with [Remotion](https://remotion.dev) so every
frame is code, deterministic and re-renderable. Same app, two different films. Pick one.

| | **Pocket** (phone) | **Studio** (desktop) |
| --- | --- | --- |
| Canvas | 1080×1350 (4:5, most space in X's mobile feed) | 1920×1080 (16:9, X's default) |
| Device | iPhone, light app UI | macOS window, light app UI that flips to dark mid-video |
| Stage | Dark ink-teal night (`DarkStage`) | Deep saturated teal behind a light app → dark after the flip |
| Language | Data-kicker chapters, kinetic headlines above the phone, phone camera moves, one person (John Doe) carried from capture to card, a globe that breaks out of the screen | One continuous 3D camera over a Mac window, a cursor drives the app, graph pull-back hook, paste-import, globe + dark flip, Claude over MCP in a terminal |

Both: 60 fps, 1800 frames. Scene cuts land on multiples of 30 frames (a 120 BPM beat grid), so
any 120 BPM track can be laid under them in an editor. No audio is rendered: X autoplays muted.

## Ground rules

- **Data:** only `src/data/demo.ts`. Names come from the public repo (README screenshots + the seed
  lists in `scripts/dev/seed-people.ts`). Today is Friday 30 October. Owner is Alex.
  285 people, 79 cities.
- **Fidelity:** recreate the real app. Read the component you are recreating in `../src/components`
  and reuse its Tailwind classes; `src/styles/app-tokens.css` is the app's own `globals.css`
  (`pnpm sync:tokens`), so `surface`, `glass`, `glass-thick`, `specular`, `text-headline`,
  `text-fg-2`, `rounded-lg`, `bg-accent-soft`, `var(--palette-*)` etc. all work. Wrap a subtree in
  `className="dark"` for the dark theme. Icons: `lucide-react` (same set as the app).
- **Motion:** every value is a pure function of `useCurrentFrame()`. No CSS transitions, no
  `Math.random()` (use `rng(seed)`), no timers. Use `src/kit/motion.ts` (`EASE`, `springAt`,
  `tween`, `progress`, `typed`). App-level UI motion uses the app's eases (`EASE.ios`,
  `EASE.out`) and springs; camera moves use `EASE.glide`.
- **Type on canvas:** `Headline` (`src/kit/Headline.tsx`): mono kicker chip, words rising out of a
  blur, accent segments in the logo's turquoise gradient. Short copy only.
- **Legibility:** X shows these videos ~390 pt wide on a phone. A 1440 pt desktop window at full
  view has ~3 pt text there; a full phone frame ~7 pt. So every key interaction gets a camera
  push-in (phone 1.6–2.4×, Mac window into the relevant region) and the headline carries the
  message; full-device views are for transitions and establishing shots.
- **Inspect frames:** `node scripts/stills.mjs <Composition> 180-420:30 --cols=5 --scale=0.4`
  renders a contact sheet to `out/stills/` (export `REMOTION_BROWSER` first, see Render). Check
  transitions densely (every 4–6 frames), not just scene middles.
- **Polish bar:** this goes on X to go viral. Every scene needs one satisfying micro-interaction,
  continuous motion (nothing fully static for more than ~0.4 s except the final hold), motion blur
  feel on fast moves (blur filter proportional to velocity), and clean transitions (no hard cuts
  unless on a beat, and then intentional).

## Kit (shared, done)

`src/kit`: `motion.ts`, `Avatar` (the app's name-hashed gradient, verified against the
screenshots), `Logo` (animatable `draw`/`nodes`), `Headline`, `DarkStage` / `LightStage` / `Grain`,
`FontGate`. `src/devices`: `IPhone` (402×874 pt screen, Dynamic Island, status bar; scale with a
wrapper transform), `MacWindow` (1440×900 pt content + 38 pt title bar).

## Ownership (parallel build)

| Area | Files | Owner |
| --- | --- | --- |
| Globe + introducer graph renderers | `src/ui/common/*`, `src/videos/previews/*` | agent C |
| Phone screens + Pocket | `src/ui/phone/*`, `src/scenes/pocket/*`, `src/videos/Pocket.tsx` | agent A |
| Desktop screens + Studio | `src/ui/desktop/*`, `src/scenes/studio/*`, `src/videos/Studio.tsx` | agent B |

Don't edit files you don't own; `src/kit`, `src/devices`, `src/data` changes are additive only
(new exports), never breaking.

### Globe contract (`src/ui/common/Globe.tsx`)

```tsx
<Globe
  width={number} height={number}       // SVG box; sphere centred unless `center` given
  radius={number}                       // sphere radius in px
  center?={[x, y]}
  rotate={[lambda, phi]}                // d3-geo rotation in degrees (animate it)
  theme="light" | "dark"
  reveal?={0..1}                        // clusters/pins pop in, staggered by distance from home
  home?="Ljubljana"
  arcs?={{ to: string; progress: number }[]}   // great-circle arcs from home, drawn 0..1
  labels?={boolean}                     // country labels like the app (letter-spaced caps)
  clusterRadius?={number}               // px merge distance (screen-space clustering)
  focus?={string}                       // a city that lifts and glows
/>
```

Looks like the app's MapLibre globe (`docs/screenshots/globe.jpg`): light blue ocean, white land,
thin borders, letter-spaced country labels, turquoise count bubbles with a white ring, single
people as avatar pins. Dark theme: deep slate ocean, slightly lighter land, glowing turquoise.
Back-hemisphere features hidden. Atmosphere halo around the sphere.

### Graph contract (`src/ui/common/Graph.tsx`)

```tsx
<NetworkGraph
  width={number} height={number}
  grow={0..1}                // edges grow out from Alex in BFS order of INTROS, nodes pop in
  theme="light" | "dark"
  zoom?={number} pan?={[x, y]}
  highlight?={string}        // a person whose introduction chain lights up
  labels?={boolean}
/>
```

Deterministic layout (d3-force run synchronously at module load with seeded start positions),
avatars as nodes (Alex bigger, turquoise ring), curved edges with a travelling light pulse.
Style after the app's `src/components/graph/NetworkGraph.tsx`. Optional ambient extra nodes from
`crowd()` for density.

---

## Pocket (phone, 1080×1350)

Final cut (after four review rounds). Headlines sit in a masked band at the top; the phone pushes
in on every payoff.

| # | Frames | Kicker / headline | What happens |
| --- | --- | --- | --- |
| 0 | 0–150 | `OPEN SOURCE · SELF-HOSTED` / "You meet *hundreds* of people." → "Remember *every one.*" | Poster-ready f0. Faces from the seed lists, some with memory chips ("Met at Web Summit", "Owes you an intro"), drift with depth of field, rack focus, then stream into the rising phone as squash-and-stretch smears. |
| 1 | 150–390 | `3 DUE TODAY` → `2 DUE TODAY` / "Never miss / a *follow-up.*" | Today (285 / 79 / 3). Push-in, tap Hanako's circle: check pops, row clip-collapses, Due 3→2, "Done · Hanako Yamada" toast above the tab bar. |
| 2 | 390–660 | `AI CAPTURE` / "Jot it down. / AI *files it.*" | The capture field lifts out of the dimmed phone, the note types, send, colour-matched highlights launch four chips: Note → John Doe, Moving to → Lisbon, Intro → Marie Dupont, Follow-up → in 2 weeks. |
| 3 | 660–930 | `ONE CARD PER PERSON` / "How you met. / *What they said.*" | The chips land in John Doe's card at 1.8×: "Ljubljana → Lisbon in March", the intro this week, the padel rematch moved to Fri 13 Nov, the new note. Captions: daily digest, Apple Notes import. |
| 4 | 930–1110 | `JOSE = JOSÉ` / "Find anyone / in a *second.*" | "jose" filters to the five José rows with accent highlights and a `jose → José` hint; Globe tab tap, one-frame swap. |
| 5 | 1110–1380 | `285 PEOPLE · 79 CITIES` / "Your people, / *on a globe.*" | The globe breaks out of the phone (frozen clustering), arcs alternate west and east from Ljubljana, name chips (Marie · Lisbon, Max · Copenhagen, Hanako · Tokyo), a counter ticks to 79, the globe returns into the phone. |
| 6 | 1380–1620 | `WORKS WITH CLAUDE VIA MCP` / "Ask your *network.*" + "…or ask *Claude.*" | Chat mid-thread (history consistent with the film), "Who do I know in Lisbon who climbs?", tool pills, three person rows. |
| 7 | 1620–1800 | — | The logo draws with its tile, "The Network", tagline, chips, the `github.com/uraruguy/the-network` pill, "★ Star it on GitHub". Still for the last second. |

## Studio (desktop, 1920×1080)

Final cut (after five review rounds). A 200 px headline band at the top; the camera pushes into
every payoff and whip-pans between scenes (one establishing pull-back, on Today).

| # | Frames | Headline | What happens |
| --- | --- | --- | --- |
| 0 | 0–120 | "Everyone you've met. / …and who *introduced you.*" | Tight on "You", fast pull-back while the introducer graph and an ambient crowd fill in; a counter ticks to 285, lands in the People tile, the graph implodes into the window. |
| 1 | 120–360 | "Follow-ups that *find you.*" | The Mac app (sidebar + Today). The daily digest e-mail at 2.1×: Done on Hanako → "✓ Marked done"; whip to the app, her row checks itself, Due 3→2. |
| 2 | 360–660 | "Paste anything. / AI *files it.*" | ⌘V keycap, the paste sheet with a Web Summit Lisbon note, highlights, names lift into four proposal cards (new person Anna Kowalska, Juan, Sven, Jan). Save: avatars fly into People, 285→286, toast. |
| 3 | 660–810 | "Type a city. / *Get your people.*" | Whip to People; "lisbon" filters to all 7 Lisbon people (7 of 286), "Show on globe". |
| 4 | 810–1110 | "Landing in Lisbon? / *Know who's there.*" → "Installs like an app. / *Works offline.*" | Globe on Europe, Lisbon panel at 1.6×, arcs; a circular dark wipe from the Lisbon pin; the dark planet outgrows the window; an iPhone with the same globe, Offline · 2 changes waiting → Synced. |
| 5 | 1110–1320 | "Ask your *network.*" | Dark Chat thread: the question rises from the composer, tool pills, an answer card with three person rows. |
| 6 | 1320–1620 | "…or ask *Claude.*" | Terminal: the real `claude mcp add …` from docs/mcp.md, `claude mcp list` → `network: … (HTTP) - ✓ Connected`, `# 13 tools: …`, then `claude -p "Who should I catch up with in Lisbon?" --allowedTools mcp__network` and its answer. |
| 7 | 1620–1800 | "Open source. Self-hosted. *Yours.*" | Lockup over a dimmed globe, "★ Star on GitHub · uraruguy/the-network", "Runs on Vercel + Supabase · MIT licensed". Still from ~f1730. |

## Render

```bash
pnpm install
pnpm render:pocket   # out/the-network-phone.mp4
pnpm render:studio   # out/the-network-desktop.mp4
```

Set `REMOTION_BROWSER` to a local Chrome Headless Shell to skip Remotion's browser download.
