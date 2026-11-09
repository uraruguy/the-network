# The Network: launch videos

Two 30-second videos for an X launch post, built with [Remotion](https://remotion.dev) so every
frame is code, deterministic and re-renderable. Same app, two different films. Pick one.

| | **Pocket** (phone) | **Studio** (desktop) |
| --- | --- | --- |
| Canvas | 1080×1350 (4:5, most space in X's mobile feed) | 1920×1080 (16:9, X's default) |
| Device | iPhone, light app UI | macOS window, light app UI that flips to dark mid-video |
| Stage | Dark ink-teal night (`DarkStage`) | Bright app canvas (`LightStage`) → dark after the flip |
| Language | Numbered chapters, kinetic headlines above the phone, phone camera moves, a globe that breaks out of the screen | One continuous 3D camera over a Mac window, a cursor drives the app, graph bloom intro, paste-import, terminal/MCP |

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

Layout: headline zone at the top (y ≈ 80–380), phone below it, large (about 1.1–1.25× of its
426×900 frame), often slightly cropped by the bottom edge. Camera moves between scenes: the phone
travels, tilts (`perspective` + `rotateX/rotateY`), zooms into the relevant UI.

| # | Frames | Seconds | Kicker / headline | What happens |
| --- | --- | --- | --- | --- |
| 0 | 0–180 | 0.0–3.0 | — / "You meet *hundreds* of people." → "Remember *every one.*" | ~160 avatar bubbles (`crowd()`) drift in depth, parallax, some showing names. Line 1 lands at ~f8. At ~f90 line 2 replaces it while the bubbles swirl into a vortex and stream into the phone, which rises from below. |
| 1 | 180–420 | 3.0–7.0 | `01 · Follow-ups` / "Never forget / to *reach out.*" | Today screen (faithful to `today.jpg`): date, greeting, capture field, stat tiles counting up (285 / 79 / 3), Due (Sara, Max, Valentina), This week (Nik, Ola), tab bar. A tap on Sara's circle: ring fills turquoise, check pops, row collapses, Due 3→2, toast "Done · Sara Rossi". |
| 2 | 420–690 | 7.0–11.5 | `02 · Quick capture` / "Jot it down. / AI *files it.*" | The capture field lifts out of the phone as a large floating glass card; the phone dims behind. `CAPTURE.text` types with a caret. Send. Shimmer. Key phrases highlight, then four filed chips fly out of them: Note → Nik Zupan, Moving to → Lisbon, Follow-up → in 2 weeks, Intro → Valentina Dubois, each landing with a check. |
| 3 | 690–960 | 11.5–16.0 | `03 · A card for everyone` / "Everything you know, / *in one place.*" | iOS push to Sara Rossi's card (faithful to `person.jpg`). Phone slides left; callout pills with leader lines appear on the right pointing at: warmth, next follow-up, introduced by Max Larsen, notes (meeting / call / message). The card scrolls to reveal categories, tags, "How you met". |
| 4 | 960–1170 | 16.0–19.5 | `04 · Search` / "Find anyone / in a *second.*" | People list (faithful to `people.jpg`). Typing "aljaz" filters live to the five Aljaž rows with the match highlighted (accent-insensitive search). A–Z index visible. Fast, snappy. |
| 5 | 1170–1440 | 19.5–24.0 | `05 · Globe` / "Your people, / *on a globe.*" | Globe screen (faithful to `globe.jpg`), globe turning with clusters. Then the globe breaks out: it grows past the phone's edges to fill the canvas, the phone falls away, arcs fly from Ljubljana to Tokyo (Sara), Lisbon (Valentina), Copenhagen (Max), New York, San Francisco; avatar pins pop. Counter "79 cities". |
| 6 | 1440–1650 | 24.0–27.5 | `06 · AI assistant` / "Ask your *network.*" sub: "Your own key. Or from Claude, ChatGPT, Cursor via MCP." | Phone returns with Chat: the question types into the composer, sends as a bubble, tool pills ("Searching people" → done), the answer streams with three person rows (Inês Sampaio, Mateo Fernández, Valentina Dubois). |
| 7 | 1650–1800 | 27.5–30.0 | — | Phone recedes and dissolves. Logo draws itself (`draw`, then `nodes`), "The Network", tagline, chips "Open source · Self-hosted · MIT", `github.com/uraruguy/the-network` in mono. Settled and still from ~f1750. |

## Studio (desktop, 1920×1080)

One continuous camera: the Mac window lives in 3D (`perspective` on a wrapper; animate
`rotateX/rotateY/translateZ/scale`), the camera pushes into regions of interest and pulls back
between scenes. A macOS cursor (with click ripple) drives the app. Headlines sit centred above the
window (or the window shifts to make room). The light canvas flips to dark at ~f1260 with a
circular reveal from the cursor.

| # | Frames | Seconds | Kicker / headline | What happens |
| --- | --- | --- | --- | --- |
| 0 | 0–200 | 0.0–3.3 | — / "Everyone you've met." → "*Connected.*" | Light canvas. Alex's node at the centre; introduction edges grow out (`NetworkGraph grow`), avatars pop, light pulses run along edges; slow camera rotation/zoom-out. |
| 1 | 200–500 | 3.3–8.3 | `Today` / "Follow-ups that *find you.*" | The graph shrinks into the Mac window, which settles from a tilt. Desktop Today (sidebar + content column). Cursor checks off Max Larsen. Then the daily e-mail digest card slides in from the right over the window (3 follow-ups, one-tap **Done** / **Snooze**); the cursor clicks Done → ✓. |
| 2 | 500–800 | 8.3–13.3 | `Import` / "Paste anything. / AI *files it.*" | Paste sheet (faithful to `QuickImportSheet`): ⌘V drops a messy note from Web Summit Lisbon. AI pass: names and dates highlight in sequence; proposals appear in a side column (new person Inês Sampaio, note to Mateo Fernández, intro to Björn Østergaard, follow-up for Chloé Lefèvre). Cursor clicks Save; cards fly into place. |
| 3 | 800–1080 | 13.3–18.0 | `People` / "Find anyone / *in a second.*" | People page: cursor clicks search, types "lisbon", list filters to the Lisbon people, click Inês → person page. Camera pushes into her card. |
| 4 | 1080–1380 | 18.0–23.0 | `Globe` / "Your world, *mapped.*" → `Works like an app` / "Light, dark, *offline.*" | Sidebar → Globe (full bleed): globe turns, clusters, cursor hovers Lisbon → peek. At ~f1260 the theme flips to dark with a circular reveal from the cursor (window + stage). An iPhone slides in beside the window showing the same globe; an "Offline · synced" pill. |
| 5 | 1380–1620 | 23.0–27.0 | `AI + MCP` / "Ask your *network.*" → "…or ask *Claude.*" | Dark Chat: question, tool pills, streamed answer with person rows. A terminal slides over the corner: `claude mcp add --transport http --scope user network https://your-network/api/mcp --header "Authorization: Bearer ntk_…"`, then `claude mcp list` → `network … ✓ Connected`, the 13 tool names stream in. |
| 6 | 1620–1800 | 27.0–30.0 | "Open source. Self-hosted. *Yours.*" | Window pulls away; logo lockup, tagline, `github.com/uraruguy/the-network`, "MIT · Next.js · Supabase". Still from ~f1750. |

## Render

```bash
pnpm install
pnpm render:pocket   # out/the-network-phone.mp4
pnpm render:studio   # out/the-network-desktop.mp4
```

Set `REMOTION_BROWSER` to a local Chrome Headless Shell to skip Remotion's browser download.
