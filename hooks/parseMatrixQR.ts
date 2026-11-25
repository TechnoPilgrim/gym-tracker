// Matrix machine QR stickers come in (at least) two flavors:
//
//   1. A YouTube link:          https://youtu.be/TmY-Mlh35lw
//   2. A short link to Vimeo:   https://qrs.ly/glci2c0
//                                 → redirects to https://player.vimeo.com/video/227437313
//
// Each sticker's URL gives us a stable machine key that works offline:
//   - YouTube:  the video ID, e.g. "TmY-Mlh35lw"  (same key as earlier versions,
//               so machines you've already saved still match)
//   - Vimeo:    "vimeo:227437313"
//   - Other links (e.g. qrs.ly short links): host + path, e.g. "qrs.ly/glci2c0"
//
// On first scan of a new machine we look up the video title once, using the free
// oEmbed endpoints of YouTube and Vimeo (no API key needed), clean it into a
// short name, and the app saves it on the phone.

export type ParsedQR =
  | { kind: 'youtube'; machineId: string; videoId: string }
  | { kind: 'vimeo'; machineId: string; videoId: string }
  | { kind: 'link'; machineId: string; url: string };

type VideoRef = Extract<ParsedQR, { kind: 'youtube' | 'vimeo' }>;

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const LOOKUP_TIMEOUT_MS = 8000;

// Parse the raw QR text. Returns null if it isn't a web link at all.
// (Plain regex rather than `new URL()` so it behaves the same on every JS runtime.)
export function parseMatrixQR(rawValue: string): ParsedQR | null {
  const text = rawValue.trim();
  const m = text.match(/^https?:\/\/([^/?#]+)([^?#]*)(\?[^#]*)?/i);
  if (!m) return null;

  const host = m[1].toLowerCase().replace(/^(www|m)\./, '');
  const path = m[2] ?? '';
  const query = m[3] ?? '';

  // https://youtu.be/VIDEO_ID  (may carry ?si=... tracking params — ignored)
  if (host === 'youtu.be') {
    const id = path.split('/')[1] ?? '';
    if (YT_ID.test(id)) return { kind: 'youtube', machineId: id, videoId: id };
  }

  // youtube.com/watch?v=ID, /shorts/ID, /embed/ID, /live/ID
  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    const fromQuery = query.match(/[?&]v=([A-Za-z0-9_-]{11})/)?.[1];
    const fromPath = path.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/)?.[1];
    const id = fromQuery ?? fromPath;
    if (id) return { kind: 'youtube', machineId: id, videoId: id };
  }

  // vimeo.com/ID or player.vimeo.com/video/ID
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = path.match(/^\/(?:video\/)?(\d+)/)?.[1];
    if (id) return { kind: 'vimeo', machineId: `vimeo:${id}`, videoId: id };
  }

  // Anything else (short links like qrs.ly): key on host + path,
  // and follow the redirect later when we need the name.
  const cleanPath = path.replace(/\/+$/, '');
  return { kind: 'link', machineId: `${host}${cleanPath}`, url: text };
}

// Clean a video title into a short gym-friendly machine name, in the same
// "Series / Machine" style as the Matrix stickers.
//
//   "Ultra Series | Abdominal Crunch | Setup & Movements | Matrix Fitness"
//       → "Ultra / Abdominal Crunch"
//   "Matrix Versa Duals: Chin / Dip Assist Setup & Movements"
//       → "Versa / Chin / Dip Assist"
const BOILERPLATE: RegExp[] = [
  /setup\s*(&|and)\s*movements?/gi,
  /how\s*to\s*use/gi,
  /tutorial/gi,
  /instructional\s*video/gi,
  /\bmatrix\s+fitness\b/gi,
  /\([^)]*\)/g,            // parenthetical notes
];
// Words dropped from the end of the series name ("Ultra Series" → "Ultra").
const SERIES_SUFFIX = /\s+(series|duals?)$/i;

export function cleanVideoTitle(title: string): string {
  let t = title;
  for (const re of BOILERPLATE) t = t.replace(re, ' ');
  t = t.replace(/^\s*matrix\b/i, ' ');  // leading brand name

  // YouTube titles separate parts with "|"; Vimeo titles use "Series: Machine".
  let parts: string[];
  if (t.includes('|')) {
    parts = t.split('|');
  } else if (t.includes(':')) {
    const i = t.indexOf(':');
    parts = [t.slice(0, i), t.slice(i + 1)];
  } else {
    parts = [t];
  }

  parts = parts
    .map((p) => p.replace(/^[\s\-–—]+|[\s\-–—]+$/g, '').replace(/\s{2,}/g, ' '))
    .filter(Boolean);

  if (parts.length >= 2) {
    const series = parts[0].replace(SERIES_SUFFIX, '').trim();
    const machine = parts.slice(1).join(' ');
    return series ? `${series} / ${machine}` : machine;
  }
  return parts[0] ?? '';
}

// Look up a machine name for a scanned code. Returns null if anything fails
// (offline, timeout, unknown link) — the app then asks you to type a name.
export async function fetchMachineName(parsed: ParsedQR): Promise<string | null> {
  try {
    const video = await toVideoRef(parsed);
    if (!video) return null;

    const oembedUrl =
      video.kind === 'youtube'
        ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
            `https://youtu.be/${video.videoId}`
          )}`
        : `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(
            `https://vimeo.com/${video.videoId}`
          )}`;

    const response = await fetchWithTimeout(oembedUrl);
    if (!response.ok) return null;

    const data = await response.json();
    const title = typeof data?.title === 'string' ? data.title : '';
    const name = cleanVideoTitle(title);
    return name || null;
  } catch {
    return null;
  }
}

// For short links, follow the redirect chain and parse where it lands.
async function toVideoRef(parsed: ParsedQR): Promise<VideoRef | null> {
  if (parsed.kind !== 'link') return parsed;
  const response = await fetchWithTimeout(parsed.url); // fetch follows redirects
  const resolved = response.url ? parseMatrixQR(response.url) : null;
  return resolved && resolved.kind !== 'link' ? resolved : null;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
