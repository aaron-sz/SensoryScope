# 🧭 SENSORYSCOPE: PROJECT PURPOSE & CLAUDE DIRECTIVES

## 1. MISSION STATEMENT
SensoryScope is a crowdsourced accessibility map designed to make the "invisible" sensory environment visible. While traditional maps show physical barriers (stairs, lack of ramps), SensoryScope tracks cognitive and sensory barriers: **Sound, Light, and Crowds**. 

Our primary goal is to empower neurodivergent individuals, veterans with PTSD, and those with sensory processing sensitivities to navigate public spaces with confidence, eliminating the anxiety of unpredictable environments.

## 2. TARGET AUDIENCE & UX PHILOSOPHY
**The User:** May be opening this app while currently experiencing sensory overload, anxiety, or a panic attack.
**The UX Mandate: "Apple Health / Calm Minimalist"**
- **Aesthetic:**the **app interior must be strictly modern, sleek, and highly accessible**. Think large typography, abundant white space, soft rounded corners (Radius 14-20), and extremely subtle diffused shadows.
- **Zero Friction:** The user must be able to find a "Safe Haven" in 2 taps or less.
- **No Aggressive UI:** Do NOT use harsh colors (like pure `#FF0000`). Use soft, pastel-leaning tones (e.g., Emerald Green for safe, Rose/Coral for intense).
- **High Legibility:** Use clear typography, high contrast for text, and distinct visual hierarchy.
- **Predictable:** Loading states should be smooth. Layouts should not jump. Errors must be graceful and reassuring, never technical or alarming.

## 3. TECH STACK & ARCHITECTURE
Agents must strictly adhere to this stack. Do not install alternative libraries unless explicitly instructed by the user.
- **Framework:** React Native via Expo (using Expo Router for navigation).
- **Language:** TypeScript (Strict typing is required for all components and API calls).
- **Backend/Database:** Supabase (PostgreSQL).
- **Geospatial Logic:** PostGIS (Used for calculating distances and querying "nearby" locations).
- **Maps:** `react-native-maps` (Use a muted/retro custom map style JSON if possible to reduce visual clutter).
- **UI/Styling:** `@rneui/themed` + custom `DesignSystem.ts` (using `StyleSheet.create`).
- **Icons:** `lucide-react-native` (Clean, modern, rounded icons).

## 4. CORE FEATURES (MVP SCOPE)
1. **The Heatmap (Home):** A full-screen map centering on the user's location (Pilot data: Huntersville/Davidson, NC). Pins are color-coded based on the aggregate sensory score.
2. **The Scorecard (Modal):** Clicking a pin reveals a bottom sheet showing the 1-10 scores for Sound, Light, and Crowd, plus a "Navigate" button.
3. **The Crowdsource Engine:** A simple, slider-based form allowing users to submit real-time ratings for their current location.

## 5. STRICT AGENT DIRECTIVES (CODING STANDARDS)
When generating code, modifying files, or debugging, Claude MUST follow these rules:

- **Rule 1: Use the Design System.** Never hardcode hex colors or pixel spacing in components. Always import `Colors`, `Spacing`, `Radius`, and `Shadows` from the central theme file.
- **Rule 2: Fail Gracefully.** If the Supabase fetch fails, do not crash the app. Show an empty state or a friendly error message using the `Colors.textMuted` color.
- **Rule 3: Mobile-First Edge Cases.** Always account for SafeArea in React Native (notches, home bars). Wrap top-level screens in `SafeAreaView` from `react-native-safe-area-context`.
- **Rule 4: Keep Components Dumb.** Separate data-fetching logic (Supabase calls) from UI rendering wherever possible. Use custom hooks if the logic gets complex.
- **Rule 5: PostGIS Accuracy.** When querying geographic data, always ensure latitude and longitude are passed in the correct order as expected by the Supabase RPC functions.
- **Rule 6: MVP Velocity.** Time is of the essence. Prioritize rock-solid core functionality (map rendering, database inserts) over complex micro-animations or over-engineered state management.

## 6. THE COMPETITIVE EDGE
This app is being built for a student app competition in North Carolina. The code must be clean, well-commented, and pitch-ready. Features that demonstrate technical complexity (like real-time DB triggers, geolocation, and hardware microphone access) should be prioritized and highlighted in the code structure.