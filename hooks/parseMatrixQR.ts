// Matrix QR codes encode a plain YouTube short URL, e.g.:
//   https://youtu.be/TmY-Mlh35lw
//
// The YouTube video ID is our stable machine key.
// On first scan we call the YouTube Data API to get the video title,
// then clean it up into a readable machine name.
// After that the name is stored locally — no further API calls needed.

export interface ParsedQR {
  videoId: string;   // e.g. "TmY-Mlh35lw"  — used as the machine's storage key
}

// Extract the YouTube video ID from a youtu.be or youtube.com URL.
// Returns null if the URL doesn't look like a YouTube link.
export function parseMatrixQR(rawValue: string): ParsedQR | null {
  try {
    const url = new URL(rawValue);

    // Short URL: https://youtu.be/VIDEO_ID
    if (url.hostname === 'youtu.be') {
      const videoId = url.pathname.replace('/', '').trim();
      if (videoId) return { videoId };
    }

    // Long URL: https://www.youtube.com/watch?v=VIDEO_ID
    if (url.hostname.includes('youtube.com')) {
      const videoId = url.searchParams.get('v');
      if (videoId) return { videoId };
    }

    return null;
  } catch {
    return null;
  }
}

// Clean a YouTube video title into a short gym-friendly machine name.
//
// Example input:  "Matrix Ultra Series Seated Row - How To Use | Matrix Fitness"
// Example output: "Ultra Series Seated Row"
//
// Strategy: strip common boilerplate phrases, then take what's left.
export function cleanVideoTitle(title: string): string {
  return title
    .replace(/matrix fitness/gi, '')
    .replace(/\|\s*matrix.*/gi, '')       // drop "| Matrix Fitness" suffix
    .replace(/[-–]\s*how to use.*/gi, '') // drop "- How To Use" suffix
    .replace(/[-–]\s*tutorial.*/gi, '')
    .replace(/\(.*?\)/g, '')              // drop parenthetical notes
    .replace(/\s{2,}/g, ' ')             // collapse multiple spaces
    .trim();
}

// Fetch the video title from YouTube Data API v3.
// Returns a cleaned machine name, or null if the call fails.
//
// IMPORTANT: store your API key in a config file, never hardcode it here.
// See README for setup instructions.
export async function fetchMachineNameFromYouTube(
  videoId: string,
  apiKey: string
): Promise<string | null> {
  try {
    const url =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?part=snippet&id=${videoId}&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const title = data?.items?.[0]?.snippet?.title;
    if (!title) return null;

    return cleanVideoTitle(title);
  } catch {
    return null;
  }
}
