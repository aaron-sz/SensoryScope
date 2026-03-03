# 🧠 SensoryScope

**Discover sensory-friendly places around you.**

SensoryScope helps users with sensory sensitivities find comfortable environments. Search nearby places, view community sensory ratings (noise, light, crowd), and submit reviews — powered by Google Places API and Supabase.

---

## � API Keys

- **Google Maps API Key** — kingjas will provide this. Needs **Places API** and **Places Photo API** enabled in Google Cloud Console.
- **Supabase** — you already have access. URL and anon key are in `.env`.

---

## 🚀 Running the App

```bash
npm install
npx expo start
# Press 's' to switch to Expo Go → scan QR with your phone
# No EAS build needed — runs in Expo Go directly
```

---

## 📋 Summary of Changes (vs. GitHub `master`)

Everything below is relative to commit `5ca712f` ("ui + auth").

### 🏗️ Major Architecture Changes

- **Removed the Map tab entirely** — app is now a list-based place directory instead of a map POI viewer
- **Removed the Detect tab** — not needed
- **3 tabs now**: Explore → Rate → Profile
- **Removed `react-native-maps`** — this was blocking Expo Go usage (required native EAS builds). App now works in Expo Go on both iOS and Android with zero native config
- **Added Supabase `place_reviews` table** — stores sensory reviews keyed by Google `place_id` instead of internal location IDs

### 🆕 New Files

| File | What it does |
|------|-------------|
| `components/PlaceCard.tsx` | Place card with Google photo, name, category emoji, address, star rating, distance, open/closed status. Photo auto-scales to 22% screen width |
| `components/PlaceDetailSheet.tsx` | Bottom sheet: hero photo, meta chips, averaged sensory bars (noise/light/crowd), review history, inline review form (1-10 buttons + comment), close button, Google Maps + Apple Maps deep links |
| `eas.json` | EAS config (optional, not required to run) |

### ✏️ What Changed in Existing Files

| File | Changes |
|------|---------|
| **`explore.tsx`** | Complete rewrite. 17 multi-select category chips, Google Text Search API for search (results show as full PlaceCards with photos — not text), sort by distance/rating, radius filter (1-25 mi), Open Now toggle, `BestForNavigation` GPS, instant search (no loading spinners) |
| **`submit.tsx`** | Complete rewrite. Dark gradient UI, animated sliders for noise/light/crowd, location picker overlay, writes to Supabase `place_reviews` table |
| **`profile.tsx`** | Expanded with styled profile card and auth status |
| **`_layout.tsx` (tabs)** | 3-tab structure, hides old index/detect routes |
| **`index.tsx`** | Was the Map screen (284 lines) → now a 10-line redirect to Explore |
| **`detect.tsx`** | Was the Detect screen → now a 10-line redirect to Explore |
| **`FloatingTabBar.tsx`** | Updated to only show Explore, Rate, Profile tabs |
| **`app.json`** | Added Android package name, EAS project ID, removed `googleMaps` native config |
| **`package.json`** | Removed `react-native-maps`, added `expo-dev-client` |

### 🗄️ Database Changes (Supabase)

New table `place_reviews` — you can see it in the Supabase dashboard already:

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint | Auto-increment PK |
| `place_id` | text | Google's place ID string |
| `place_name` | text | Cached place name |
| `user_id` | uuid | FK → auth.users |
| `sound_rating` | numeric | 1–10 |
| `light_rating` | numeric | 1–10 |
| `crowd_rating` | numeric | 1–10 |
| `comment` | text | Optional |
| `created_at` | timestamptz | Auto |

**RLS:** Anyone can read. Auth'd users can create. Users can only update/delete their own.

The old `locations` and `reviews` tables are still there, just unused by the new code.

### ❌ Removed

- `react-native-maps` dependency (was blocking Expo Go)
- Google Maps native config from `app.json`
- Map tab and Detect tab functionality

---

## 📱 How It Works Now

1. **Explore tab** — GPS grabs your location → fetches nearby places from Google for selected categories → shows them as PlaceCards. You can search any place inline (results appear as cards with photos). Tap a card → PlaceDetailSheet opens.

2. **PlaceDetailSheet** — Shows the place photo, rating, distance, open status. Pulls reviews from Supabase `place_reviews` and averages the sensory scores into visual bars. Has an inline review form and Google/Apple Maps deep links. Close button (X) in top-right.

3. **Rate tab** — Submit a sensory review for a place with sliders (1-10 for noise, light, crowd) + optional comment.

4. **Profile tab** — Auth status, sign out.

---

## 📄 License

MIT
