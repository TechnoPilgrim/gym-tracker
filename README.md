# 💪 Gym Weight Tracker

A React Native (Expo) app for tracking per-machine working weights at the gym.
Scan a Matrix equipment QR code → see your last working weight → adjust in ±5 lb increments.
Warm-up weight (70% of working) is calculated automatically.

---

## YouTube API Key Setup

Matrix QR codes encode a YouTube URL (e.g. `https://youtu.be/TmY-Mlh35lw`).
On first scan of any machine, the app calls the YouTube Data API to fetch the
video title and derive the machine name ("Ultra Series Seated Row"). After that
it's cached on-device — no further API calls.

You likely already have a Google Cloud project from your consciousness-briefing
system. You can reuse it:

1. Go to https://console.cloud.google.com
2. Select your existing project (or create a new one)
3. Enable **YouTube Data API v3** (APIs & Services → Library)
4. Create an API key (APIs & Services → Credentials → Create Credentials)
5. Paste the key into `config.ts`:
   ```ts
   export const YOUTUBE_API_KEY = 'AIza...your key here...';
   ```
6. Confirm `config.ts` is in `.gitignore` ✓ (already set up)

The free YouTube API quota (10,000 units/day) is more than enough —
each video lookup costs 1 unit.

---

## Prerequisites

Install these once on your Mac:

```bash
# 1. Node.js (v18 or later) — check if you have it:
node --version

# If not, install via Homebrew:
brew install node

# 2. Expo CLI
npm install -g expo-cli

# 3. On your iPhone: install the "Expo Go" app from the App Store
```

---

## Project Setup

```bash
# Clone / copy this project folder, then:
cd gym-tracker
npm install

# Start the dev server
npm start
```

This opens a terminal UI with a QR code. **Scan it with your iPhone camera** (not Expo Go — just the regular camera app). It will open the app live in Expo Go.

Every time you save a file in VS Code, the app reloads on your phone instantly. This is the inner dev loop — it's fast.

---

## Project Structure

```
gym-tracker/
├── app/
│   └── index.tsx          ← Main screen (scanner + weight card)
├── components/
│   └── WeightCard.tsx     ← Dumb display component for weights
├── hooks/
│   ├── useMachineStore.ts ← Data layer (AsyncStorage read/write)
│   └── parseMatrixQR.ts   ← QR URL parser
├── types/
│   └── index.ts           ← TypeScript interfaces
├── app.json               ← Expo config (name, permissions, etc.)
└── package.json
```

---

## How the QR Parsing Works

Matrix equipment QR codes encode a URL like:

```
https://www.matrixfitness.com/en/support/howto/?model=G3-FW160&sn=ABC123
```

The app extracts the `model` param (`G3-FW160`) as the stable machine ID.
It never contacts Matrix's servers — it just reads the URL string.

If your gym uses a different QR format, edit `hooks/parseMatrixQR.ts`.

---

## When You're Ready for the App Store

```bash
# Install EAS (Expo Application Services) CLI
npm install -g eas-cli

# Log in to your Expo account (free to create)
eas login

# Configure the build
eas build:configure

# Build for iOS (produces .ipa you submit to App Store)
eas build --platform ios
```

You'll need an Apple Developer account ($99/year) for App Store distribution.
For personal use on your own phone, you can sideload with a free account.

---

## Adjusting the Warm-Up Percentage

Currently set to 70%. To change it, edit this line in `app/index.tsx`:

```ts
warmupWeight: Math.round(m.workingWeight * 0.7),
```
