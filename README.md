# 🧠 SensoryScope

**Discover sensory-friendly places around you.**

SensoryScope helps users with sensory sensitivities find comfortable environments. Search nearby places, view community sensory ratings (noise, light, crowd), explore an interactive map, and submit reviews — powered by Google Places API, Mapbox, and Supabase.

---

## 🔑 API Keys Required

The app needs the following keys in a `.env` file at the project root:

| Key | Service | Notes |
|-----|---------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase | Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Public anon key |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud | Needs **Places API** + **Places Photo API** enabled |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox | Public token for map rendering |
| `MAPBOX_DEFAULT_PUBLIC_TOKEN` | Mapbox | Used by `@rnmapbox/maps` plugin at build time |

---

## 🚀 Running the App

> **This app requires a development build** — it uses `@rnmapbox/maps` (native module) which does not work in Expo Go.

```bash
npm install

# Build a development client (first time only)
npx eas build --profile development --platform android

# Install the generated APK on your device, then:
npx expo start --dev-client
```

---

## 📱 App Overview

### 4-Tab Structure

| Tab | Screen | Description |
|-----|--------|-------------|
| 🧭 **Explore** | `explore.tsx` | Searchable place directory with category chips, distance/rating sort, radius filter, Open Now toggle |
| 🗺️ **Map** | `map.tsx` | Interactive Mapbox dark-style map with color-coded sensory markers, legend, and location FAB |
| ➕ **Rate** | `submit.tsx` | Submit sensory reviews with Google Places search, animated sliders, and live score preview |
| 👤 **Profile** | `profile.tsx` | Auth status, sign in/out |

### Key Features

- **Onboarding Flow** — 6-slide animated introduction for first-time users with sensory preference selection
- **Google Places Search** — Text search with debounced results, photos, ratings, and distance
- **Place Detail Sheet** — Bottom sheet with hero photo, meta chips (rating, distance, open/closed), averaged sensory bars, review history, inline review form, and Google/Apple Maps deep links
- **Mapbox Map** — Dark-styled map with GeoJSON markers color-coded by sensory score (green = calm, yellow = moderate, red = intense)
- **Sensory Review System** — Rate any place on 3 dimensions (Sound, Light, Crowd) from 1-10 with community averages
- **GPS Location** — High-accuracy user positioning for nearest-first sorting and location-biased search

---

## 🏗️ Architecture

### Frontend Stack

- **Expo SDK 52** with Expo Router (file-based routing)
- **React Native** with Reanimated 3 for animations
- **@rnmapbox/maps** for the interactive map
- **@rneui/themed** for UI components
- **expo-haptics** for tactile feedback

### Backend

- **Supabase** (PostgreSQL + Auth + RLS)
- **Google Places API** for place search, photos, and details

### Database Tables

| Table | Purpose |
|-------|---------|
| `place_reviews` | Sensory reviews keyed by Google `place_id` — used by both Explore (PlaceDetailSheet) and Rate tabs |
| `locations` | Legacy preset locations with coords (PostGIS geography) |
| `reviews` | Legacy reviews linked to `locations` table |
| `profiles` | User profiles linked to Supabase auth |

**`place_reviews` schema:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint | Auto-increment PK |
| `place_id` | text | Google Places ID |
| `place_name` | text | Cached place name |
| `user_id` | uuid | FK → auth.users |
| `sound_rating` | numeric | 1–10, with check constraint |
| `light_rating` | numeric | 1–10, with check constraint |
| `crowd_rating` | numeric | 1–10, with check constraint |
| `comment` | text | Optional |
| `created_at` | timestamptz | Auto |

**RLS:** Anyone can read. Auth'd users can create. Users can only update/delete their own.

---

## 📁 Project Structure

```
app/
├── _layout.tsx              # Root layout: auth, onboarding routing
├── onboarding/
│   ├── index.tsx            # 6-slide animated onboarding
│   ├── constants.ts         # Slide data, colors, preferences
│   └── hooks/               # Slide animation hooks
└── (tabs)/
    ├── _layout.tsx          # 4-tab layout with FloatingTabBar
    ├── explore.tsx          # Place directory with search + filters
    ├── map.tsx              # Mapbox map with sensory markers
    ├── submit.tsx           # Rate a place (Google search + sliders)
    └── profile.tsx          # Auth & profile

components/
├── PlaceCard.tsx            # Place card with photo, rating, distance
├── PlaceDetailSheet.tsx     # Full detail bottom sheet with reviews
├── LocationModal.tsx        # Map pin detail modal
├── PlaceSearchBar.tsx       # Reusable search bar
├── SensoryMap.native.tsx    # Mapbox map (native)
├── SensoryMap.web.tsx       # Map placeholder (web)
└── ui/
    ├── FloatingTabBar.tsx   # Custom animated tab bar
    └── AnimatedSlider.tsx   # Gradient slider with haptics

hooks/
└── useMapLocations.ts       # Fetches & formats Supabase data for map

constants/
└── theme.ts                 # Colors, spacing, radius, shadows

lib/
└── supabase.ts              # Supabase client init
```

---

## 📋 Recent Changes

### UI/UX Fixes
- **Fixed layout clipping** in PlaceDetailSheet — close button and hero image were being cut off by container bounds. Moved close button inside ScrollView as an overlay on the hero image
- **Fixed filter overlap** — category chips and filter bar now hide when PlaceDetailSheet is open, preventing them from overlaying the sheet content

### Submit Tab Redesign
- **Replaced preset location picker** with Google Places text search — users can now find and review any place
- **Search results sorted nearest-first** using GPS with distance displayed (e.g. "2.1 mi")
- **Switched to `place_reviews` table** — reviews submitted from the Rate tab now appear in the Explore tab's PlaceDetailSheet for the same location

---

## 📄 License

MIT
