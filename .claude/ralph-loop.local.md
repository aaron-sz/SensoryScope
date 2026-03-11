---
active: true
iteration: 1
session_id:
max_iterations: 50
completion_promise: TRAFFIC COMPLETE
started_at: "2026-03-10T00:00:00Z"
---

You are a senior React Native software engineer working on the SensoryScope app.
This is a multi-phase implementation. READ ALL FILES before each iteration. Build incrementally.

════════════════════════════════════════════════════════════════
PROJECT CONTEXT (read before every iteration)
════════════════════════════════════════════════════════════════

- App: SensoryScope — crowdsourced sensory accessibility map for neurodivergent users
- Stack: Expo SDK 54, React Native 0.81.5, @rnmapbox/maps v10.2.10, TypeScript (strict)
- Map screen: `app/(tabs)/map.tsx`
- Theme tokens: `constants/theme.ts` — use DarkColors, Spacing, Radius, Shadows always
- Sub-components already built: `components/map/MapHeader.tsx`, `MapFilterBar.tsx`, `MapLegend.tsx`, `MapFAB.tsx`
- Custom hooks already built: `hooks/useNearbyPlaces.ts`, `hooks/useMapCamera.ts`
- ENV vars available: `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

════════════════════════════════════════════════════════════════
MASTER GOAL
════════════════════════════════════════════════════════════════

Implement a live traffic busyness layer on the Mapbox map.
Roads and highways must be colored using a smooth gradient:
  Free-flowing  → #22C55E (green)
  Light traffic → #84CC16 (yellow-green)
  Moderate      → #EAB308 (yellow)
  Heavy         → #F97316 (orange)
  Severe / Jam  → #EF4444 (red)

The feature must look premium, feel smooth, and be toggleable by the user.

════════════════════════════════════════════════════════════════
PHASE 1 — Mapbox Traffic Tileset Layer (implement first)
════════════════════════════════════════════════════════════════

Mapbox provides a built-in real-time traffic vector tileset:
  Source ID:  mapbox://mapbox.mapbox-traffic-v1
  Layer type: LineLayer
  Key property on each feature: `congestion`
    Values: "low" | "moderate" | "heavy" | "severe"

Implementation steps:

1. In `app/(tabs)/map.tsx`, add a `<VectorSource>` pointing to the traffic tileset:
   ```
   import { VectorSource, LineLayer } from '@rnmapbox/maps';

   <VectorSource id="traffic-source" url="mapbox://mapbox.mapbox-traffic-v1">
     <LineLayer
       id="traffic-layer"
       sourceLayerID="traffic"
       style={trafficLineStyle}
       filter={trafficFilter}
     />
   </VectorSource>
   ```

2. Define `trafficLineStyle` as a `LineLayerStyle` object using Mapbox expressions:
   ```typescript
   const trafficLineStyle: LineLayerStyle = {
     lineColor: [
       'match',
       ['get', 'congestion'],
       'low',      '#22C55E',
       'moderate', '#EAB308',
       'heavy',    '#F97316',
       'severe',   '#EF4444',
       '#94A3B8', // default (unknown)
     ] as unknown as string,
     lineWidth: [
       'interpolate', ['linear'], ['zoom'],
       10, 1.5,
       14, 3.5,
       18, 6,
     ] as unknown as number,
     lineOpacity: [
       'interpolate', ['linear'], ['zoom'],
       8,  0,
       10, 0.85,
       18, 1,
     ] as unknown as number,
     lineCap: 'round',
     lineJoin: 'round',
   };
   ```

3. `trafficFilter` — only show roads with known congestion:
   ```typescript
   const trafficFilter = ['in', 'congestion', 'low', 'moderate', 'heavy', 'severe'] as unknown as FilterExpression;
   ```
   Import `FilterExpression` from `@rnmapbox/maps` if available; otherwise cast with `as any`.

4. Conditionally render the VectorSource only when `showTraffic` state is true.

5. Add a traffic toggle button to `MapHeader` (or as a standalone FAB next to the locate button):
   - Icon: `car-outline` (traffic off) / `car` (traffic on) from Ionicons
   - When ON: button glows with a traffic-red tint (`rgba(239,68,68,0.2)` border + icon color `#EF4444`)
   - When OFF: standard muted appearance
   - Haptic feedback on toggle

6. Add a traffic legend row when traffic is ON:
   - Show a horizontal gradient bar: green → yellow → orange → red
   - Labels: "Free" on left, "Jammed" on right
   - Appears as a new card below the existing MapLegend or as a section inside it
   - Use expo-linear-gradient for the gradient bar

════════════════════════════════════════════════════════════════
PHASE 2 — Google Places Busyness Data (implement after Phase 1)
════════════════════════════════════════════════════════════════

The Google Places API returns `current_opening_hours.periods` and — when available —
`user_ratings_total` and `rating` which can be used to infer relative popularity.

For busyness indication on the LocationModal:

1. Create `hooks/usePlaceBusyness.ts`:
   - Accepts `googlePlaceId: string | null`
   - Fetches Place Details from Google:
     ```
     GET https://maps.googleapis.com/maps/api/place/details/json
       ?place_id={placeId}
       &fields=name,opening_hours,user_ratings_total,rating,price_level,business_status
       &key={GOOGLE_MAPS_API_KEY}
     ```
   - Returns `{ rating, userRatingsTotal, isOpenNow, businessStatus, priceLevel, loading }`

2. Derive a "busyness score" (0–100) from available signals:
   ```typescript
   function deriveBusynessScore(userRatingsTotal: number, rating: number): number {
     // More ratings + moderate-to-high rating = busier place
     const ratingFactor = Math.min(userRatingsTotal / 500, 1); // cap at 500 reviews
     const popularityBoost = rating >= 4.0 ? 1.2 : 1.0;
     return Math.min(Math.round(ratingFactor * popularityBoost * 100), 100);
   }
   ```

3. Add a `BusynessBar` component in `LocationModal.tsx`:
   - Shows a horizontal bar with a gradient: `#22C55E → #EAB308 → #EF4444`
   - Fill width = busynessScore %
   - Label: "Quiet" / "Moderate" / "Busy" based on score
   - Only renders when busynessScore > 0
   - Uses expo-linear-gradient for the gradient

4. Call `usePlaceBusyness` from the LocationModal (or from map.tsx passing data in),
   triggered when a place is selected (and it has a Google Place ID).

5. In `MapPlace` type (`hooks/useNearbyPlaces.ts`), add:
   ```typescript
   googlePlaceId?: string;   // Google place_id — already available from the API fetch
   ```
   Ensure this is populated during the `mergePlaces()` call.

════════════════════════════════════════════════════════════════
PHASE 3 — Polish, Animation, and Final QA (implement after Phase 2)
════════════════════════════════════════════════════════════════

1. TRAFFIC LAYER ANIMATION:
   - When traffic is toggled ON, the LineLayer should fade in smoothly.
   - Use Reanimated's `useSharedValue` + `withTiming` to animate an opacity value.
   - Pass the animated opacity into the lineOpacity expression using Mapbox style expressions
     (or simply toggle the layer with an animated wrapper View using `pointerEvents`).
   - When toggled OFF, fade out before hiding.

2. TRAFFIC LEGEND GRADIENT:
   - Use `expo-linear-gradient` with `LinearGradient` component.
   - Colors: `['#22C55E', '#84CC16', '#EAB308', '#F97316', '#EF4444']`
   - Direction: left to right (start={[0,0]} end={[1,0]})
   - Height: 6px, borderRadius: pill
   - Labels row below: "Free" · "Light" · "Moderate" · "Heavy" · "Severe"

3. TRAFFIC TOGGLE FAB ANIMATION:
   - Use Reanimated `useAnimatedStyle` on the traffic toggle button.
   - When toggling ON: scale 1 → 1.12 → 1 (spring bounce).
   - When toggling OFF: scale 1 → 0.92 → 1.

4. RESPONSIVE LAYOUT:
   - Use `useSafeAreaInsets` + `useWindowDimensions` to ensure all floating elements
     (legend, FABs, header) are correctly positioned on:
     - Small phones (SE, 390px width)
     - Standard phones (430px)
     - Tablets (768px+, landscape)
   - On tablets in landscape: move legend to top-right, not bottom-left.

5. ACCESSIBILITY:
   - All toggle buttons have `accessibilityLabel` and `accessibilityState={{ checked: showTraffic }}`.
   - Traffic legend has `accessibilityLabel="Traffic congestion color key"`.
   - BusynessBar has `accessibilityLabel={Busyness: ${score}% — ${label}}`.

6. CODE QUALITY CHECKLIST (verify before completing):
   - [ ] Zero TypeScript errors (check with IDE diagnostics or tsc --noEmit)
   - [ ] No unused imports or variables
   - [ ] No hardcoded colors outside of the traffic-specific gradient constants
   - [ ] All theme colors from `constants/theme.ts` (DarkColors)
   - [ ] All async operations have loading + error states
   - [ ] All components under ~120 lines; extract if larger
   - [ ] React.memo on every pure sub-component
   - [ ] useCallback on every handler passed as a prop
   - [ ] useMemo on every derived value

════════════════════════════════════════════════════════════════
EXECUTION ORDER (follow strictly across iterations)
════════════════════════════════════════════════════════════════

Iteration 1: Read ALL files. Implement Phase 1 completely (traffic tileset layer + toggle button + traffic legend). Verify zero TypeScript errors.

Iteration 2: Implement Phase 2 completely (usePlaceBusyness hook + BusynessBar in LocationModal + googlePlaceId in MapPlace). Verify zero TypeScript errors.

Iteration 3: Implement Phase 3 completely (animations, responsive layout, accessibility, full code quality pass). Verify zero TypeScript errors. If all checks pass, output the completion promise.

If any iteration has TypeScript errors or missing pieces, fix them before moving to the next phase.

════════════════════════════════════════════════════════════════
COMPLETION
════════════════════════════════════════════════════════════════

When ALL THREE PHASES are fully implemented, bug-free, and TypeScript-error-free, output:

<promise>TRAFFIC COMPLETE</promise>

Do NOT output this until all three phases are genuinely done.

