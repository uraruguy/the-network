/**
 * Demo data for the videos. Every name comes from the public repo: the README screenshots (Alex,
 * Sara Rossi, Max Larsen, Valentina Dubois, Nik Zupan, Ola Müller, the Aarav/Aljaž rows) and the
 * first/last-name, role, company and tag lists in scripts/dev/seed-people.ts. Dates follow the
 * screenshots: today is Friday 30 October.
 */

export const OWNER = "Alex";
export const TODAY_LABEL = "Friday 30 October";
export const STATS = { people: 285, cities: 79, due: 3 };

export type Warmth = "inner" | "active" | "dormant" | "archive";
export const WARMTH_LABEL: Record<Warmth, string> = { inner: "Close", active: "Active", dormant: "Dormant", archive: "Archive" };
export const WARMTH_VAR: Record<Warmth, string> = {
  inner: "var(--warm-inner)",
  active: "var(--warm-active)",
  dormant: "var(--warm-dormant)",
  archive: "var(--warm-archive)",
};

export type Person = {
  name: string;
  role?: string;
  company?: string;
  city?: string;
  flag?: string;
  warmth: Warmth;
  /** Relative "last contact" label as the People list shows it. */
  last?: string;
  /** Activity emojis (People list right column). */
  acts?: string[];
};

/** The People list exactly as in docs/screenshots/people.jpg, continued alphabetically. */
export const PEOPLE: Person[] = [
  { name: "Aarav García", city: "Köln", flag: "🇩🇪", role: "Head of Growth", company: "Figma", warmth: "active", last: "1y" },
  { name: "Aarav Lindqvist", city: "Warsaw", flag: "🇵🇱", role: "Product designer", warmth: "active", last: "4mo", acts: ["🍽️", "🥪", "✈️"] },
  { name: "Aarav Santos", city: "Vienna", flag: "🇦🇹", role: "Product manager", warmth: "active", acts: ["🎲"] },
  { name: "Aarav Zupan", city: "Düsseldorf", flag: "🇩🇪", role: "Co-founder & CEO", warmth: "active", acts: ["🍽️", "🎾"] },
  { name: "Aljaž Jovanović", city: "Hamburg", flag: "🇩🇪", warmth: "dormant", last: "1y", acts: ["🤺", "🏋️"] },
  { name: "Aljaž Nowak", city: "Tokyo", flag: "🇯🇵", warmth: "dormant", last: "1mo", acts: ["⚽", "🥾"] },
  { name: "Aljaž Santos", city: "London", flag: "🇬🇧", role: "Head of Growth", warmth: "dormant", last: "1y", acts: ["🥾"] },
  { name: "Aljaž van der Berg", city: "Delhi", flag: "🇮🇳", role: "Chef", warmth: "active", last: "8h", acts: ["🏋️"] },
  { name: "Aljaž Wang", city: "Munich", flag: "🇩🇪", role: "Founder", company: "Notion", warmth: "archive", last: "1y" },
  { name: "Amara Kos", city: "Ljubljana", flag: "🇸🇮", role: "Photographer", warmth: "dormant", last: "1mo", acts: ["📷"] },
  { name: "Ana Kolenič", city: "Ljubljana", flag: "🇸🇮", role: "Software engineer", company: "Linear", warmth: "active", last: "2w", acts: ["🧗", "☕"] },
  { name: "Björn Østergaard", city: "Copenhagen", flag: "🇩🇰", role: "Partner", company: "Index Ventures", warmth: "active", last: "3w" },
  { name: "Chloé Lefèvre", city: "Paris", flag: "🇫🇷", role: "Journalist", warmth: "dormant", last: "5mo", acts: ["📚"] },
];

/** The featured cast (Today, person card, follow-ups) from the README screenshots. */
export const SARA: Person & { note: string } = {
  name: "Sara Rossi",
  role: "Designer",
  company: "Studio Mono",
  city: "Tokyo",
  flag: "🇯🇵",
  warmth: "active",
  note: "Send her the deck from Tuesday",
};

export type FollowUp = { name: string; text: string; when: string; due?: boolean };
export const DUE: FollowUp[] = [
  { name: "Sara Rossi", text: "Send her the deck from Tuesday", when: "Today", due: true },
  { name: "Max Larsen", text: "Ask how the Copenhagen move went", when: "Today", due: true },
  { name: "Valentina Dubois", text: "Intro to the design studio in Lisbon", when: "Today", due: true },
];
export const THIS_WEEK: FollowUp[] = [
  { name: "Nik Zupan", text: "Padel rematch", when: "Tomorrow" },
  { name: "Ola Müller", text: "Congratulate on the new role", when: "Sun, 1 Nov" },
];
export const RECONNECT = ["Inês Sampaio", "Mateo Fernández", "Yuki Tanaka", "Lukas Schröder"];

export type NoteKind = "note" | "meeting" | "call" | "message";
export type Note = { kind: NoteKind; title: string; body?: string; time: string; day: string };

/** Sara Rossi's card (docs/screenshots/person.jpg), with richer notes behind it. */
export const SARA_CARD = {
  ...SARA,
  categories: [
    { name: "Design", color: "var(--palette-violet)" },
    { name: "Clients", color: "var(--palette-teal)" },
  ],
  tags: ["design community", "conference speakers"],
  activities: ["☕", "🎨", "✈️"],
  metAt: "Design conference, Tokyo",
  introducedBy: "Max Larsen",
  notes: [
    { kind: "call", title: "Call: she's in Berlin 12–15 May for a client workshop", time: "13:15", day: "Today" },
    { kind: "meeting", title: "Coffee at Fuglen after the design conference", body: "Wants to move Studio Mono to a 4-day week. Loves the Lisbon studio idea.", time: "09:40", day: "Today" },
    { kind: "message", title: "Sent the type specimen she asked for", time: "Tue", day: "This week" },
  ] satisfies Note[],
};

/** What the quick capture box turns into (Capture.tsx → AI filing). */
export const CAPTURE = {
  text: "Coffee with Nik Zupan. He's moving to Lisbon in March and wants an intro to Valentina. Padel rematch in 2 weeks!",
  filed: [
    { icon: "note", label: "Note", target: "Nik Zupan" },
    { icon: "city", label: "Moving to", target: "Lisbon" },
    { icon: "bell", label: "Follow-up", target: "in 2 weeks" },
    { icon: "link", label: "Intro", target: "Valentina Dubois" },
  ],
};

/** The assistant's showcase question and its tool-backed answer. */
export const ASK = {
  question: "Who do I know in Lisbon who climbs?",
  tools: ["Searching people", "Reading notes"],
  toolCalls: ['search_people({ city: "Lisbon", activities: ["Climbing"] })', 'list_notes({ person: "Inês Sampaio" })'],
  answerLead: "Three people in Lisbon climb:",
  answer: [
    { name: "Inês Sampaio", line: "Product designer at Figma. Bouldering on Thursdays." },
    { name: "Mateo Fernández", line: "Founder. Asked you to join a climbing trip to Sintra." },
    { name: "Valentina Dubois", line: "Moves to Lisbon in May. You owe her an intro." },
  ],
};

/** Cities for the globe: lat/lng from scripts/dev/globe-seed.ts; counts sum to 285. */
export type City = { name: string; lat: number; lng: number; count: number; face?: string };
export const CITIES: City[] = [
  { name: "Ljubljana", lat: 46.0511, lng: 14.5051, count: 64 },
  { name: "Vienna", lat: 48.2082, lng: 16.3738, count: 18 },
  { name: "Munich", lat: 48.1351, lng: 11.582, count: 16 },
  { name: "Berlin", lat: 52.52, lng: 13.405, count: 21 },
  { name: "London", lat: 51.5074, lng: -0.1278, count: 24 },
  { name: "Paris", lat: 48.8566, lng: 2.3522, count: 12 },
  { name: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 9 },
  { name: "Copenhagen", lat: 55.6761, lng: 12.5683, count: 7, face: "Max Larsen" },
  { name: "Stockholm", lat: 59.3293, lng: 18.0686, count: 5 },
  { name: "Zagreb", lat: 45.815, lng: 15.9819, count: 9 },
  { name: "Milan", lat: 45.4642, lng: 9.19, count: 8 },
  { name: "Zurich", lat: 47.3769, lng: 8.5417, count: 6 },
  { name: "Barcelona", lat: 41.3874, lng: 2.1686, count: 9 },
  { name: "Lisbon", lat: 38.7223, lng: -9.1393, count: 7, face: "Valentina Dubois" },
  { name: "Athens", lat: 37.9838, lng: 23.7275, count: 3 },
  { name: "Istanbul", lat: 41.0082, lng: 28.9784, count: 3 },
  { name: "Dubai", lat: 25.2048, lng: 55.2708, count: 2, face: "Leila Haddad" },
  { name: "Bangalore", lat: 12.9716, lng: 77.5946, count: 4 },
  { name: "Delhi", lat: 28.6139, lng: 77.209, count: 6, face: "Aljaž van der Berg" },
  { name: "Singapore", lat: 1.3521, lng: 103.8198, count: 4 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503, count: 6, face: "Sara Rossi" },
  { name: "Seoul", lat: 37.5665, lng: 126.978, count: 3 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093, count: 3 },
  { name: "Cape Town", lat: -33.9249, lng: 18.4241, count: 2, face: "Amara Mensah" },
  { name: "Nairobi", lat: -1.2921, lng: 36.8219, count: 1, face: "Kofi Mensah" },
  { name: "New York City", lat: 40.7128, lng: -74.006, count: 11 },
  { name: "San Francisco", lat: 37.7749, lng: -122.4194, count: 9 },
  { name: "Toronto", lat: 43.6532, lng: -79.3832, count: 3 },
  { name: "Mexico City", lat: 19.4326, lng: -99.1332, count: 2 },
  { name: "Buenos Aires", lat: -34.6037, lng: -58.3816, count: 3 },
];

/** Who introduced whom (the graph). `from` introduced `to`; Alex is the owner at the centre. */
export const INTROS: [string, string][] = [
  ["Alex", "Max Larsen"],
  ["Max Larsen", "Sara Rossi"],
  ["Sara Rossi", "Valentina Dubois"],
  ["Valentina Dubois", "Inês Sampaio"],
  ["Inês Sampaio", "Mateo Fernández"],
  ["Alex", "Nik Zupan"],
  ["Nik Zupan", "Ana Kolenič"],
  ["Nik Zupan", "Aljaž Nowak"],
  ["Ana Kolenič", "Rok Potočnik"],
  ["Alex", "Ola Müller"],
  ["Ola Müller", "Lukas Schröder"],
  ["Ola Müller", "Björn Østergaard"],
  ["Björn Østergaard", "Yuki Tanaka"],
  ["Max Larsen", "Aarav García"],
  ["Aarav García", "Priya Patel"],
  ["Alex", "Chloé Lefèvre"],
  ["Chloé Lefèvre", "Amara Kos"],
  ["Sara Rossi", "Aljaž Wang"],
  ["Yuki Tanaka", "Mei Kim"],
  ["Lukas Schröder", "Hannah Taylor"],
];

/**
 * The Studio film's graph: INTROS without Inês Sampaio, who is created later in that film by the
 * paste import (Valentina introduced Mateo instead).
 */
export const INTROS_STUDIO: [string, string][] = [
  ...INTROS.filter(([a, b]) => a !== "Inês Sampaio" && b !== "Inês Sampaio"),
  ["Valentina Dubois", "Mateo Fernández"],
];

/** A large, deterministic crowd of names (the seed script's lists) for swarms and counters. */
const FIRST = [
  "Žan", "Ana", "Luka", "Nika", "Matej", "Špela", "Tjaša", "Rok", "Urška", "Jure", "Maša", "Gašper", "Eva", "Nejc", "Teja", "Aljaž",
  "Ivana", "Marko", "Petra", "Filip", "Lucija", "Domen", "Klara", "Tine", "Zoë", "Søren", "Åsa", "Björn", "Jürgen", "Chloé", "José",
  "Inês", "Mateusz", "Łucja", "Đorđe", "Miloš", "Emma", "Oliver", "Sofia", "Lukas", "Mia", "Noah", "Hannah", "Leon", "Amelia", "Ethan",
  "Yuki", "Aarav", "Priya", "Chen", "Mei", "Omar", "Leila", "Mateo", "Valentina", "Camila", "Diego", "Isabella", "Kofi", "Amara",
];
const LAST = [
  "Nartnik", "Habjan", "Kolenič", "Kunstelj", "Zupančič", "Potočnik", "Kos", "Verbič", "Gorjup", "Turk", "Bračič", "Kralj", "Zadnik", "Hribar",
  "Lukić", "Pavković", "Jovanović", "Østergaard", "Lindqvist", "Müller", "Schröder", "Dubois", "Lefèvre", "García", "Fernández",
  "Nowak", "Wiśniewski", "Smith", "Johnson", "Brown", "Taylor", "Wilson", "Rossi", "Bianchi", "Tanaka", "Sato", "Kim", "Park", "Sandhu",
  "Patel", "Wang", "Li", "Haddad", "Mensah", "Silva", "Sampaio", "O'Brien", "MacLeod", "van der Berg", "De Luca",
];
export function crowd(n: number, seed = 7): string[] {
  let s = seed >>> 0;
  const r = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: n }, () => `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`);
}

export const REPO_URL = "github.com/uraruguy/the-network";
export const TAGLINE = "A private vault for everyone you've met.";
