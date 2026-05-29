# TETHR - iOS App Design Prompt

A design specification for the iOS version of TETHR, part of the NIGHTSHAPE ecosystem.

---

## 1. What TETHR Does

TETHR is a two-track tempo-correction and segment-recomposition tool for iOS. The core loop:

1. User imports an audio file (Track A).
2. TETHR analyzes the audio: detects the average BPM, calculates where each beat drifted from a perfect grid, and corrects the timing so the audio locks to that grid.
3. TETHR also auto-segments the song into labeled structural sections (Segment 1, Segment 2, etc.).
4. The user can adjust the master output BPM after the fact. Playback reflects the new tempo against the shared grid without re-running beat detection or segmentation. The audio engine may reschedule playback, use cached corrected buffers, or perform pitch-preserving stretch as needed.
5. The user can import a second audio file (Track B), which receives the same source-specific analysis and conforming treatment.
6. With both tracks corrected and segmented, the app uses one shared segment map. Segments are analyzed against a shared reference so boundaries align between the two tracks. If implementation requires detecting on Track A first and projecting those boundaries onto Track B, that is acceptable as long as the result is one shared segment map.
7. The user builds a composite arrangement by tapping segments on either track. Each segment position is mutually exclusive between the two tracks: tap a segment on Track A or Track B to select which one is live at that position.
8. Playback and export follow the same selected segment path across the two stacked timelines.

The primary use case to design for: two takes of the same song with different subtle timing imperfections (for example, two Suno renders), where the user wants to cherry-pick the best segment from each take to build a definitive composite.

This is a focused single-purpose tool, not a DAW. The UI should be radically clean.

### 1.1 Core Timeline Rule

TETHR has one shared corrected timeline and one master output BPM/grid for playback and export.

Each source track may store its own detected BPM, correction map, drift metadata, and conforming settings, but composite playback is aligned to the shared master grid. Track-specific BPM controls, if exposed, must adjust that track's conforming into the shared grid. They must not create two independent timelines.

---

## 2. Visual System

### 2.1 Foundation

- Background: true matte near-black, in the `#020203` to `#050509` range. Never lifted to navy or grey. Subtle UV resonance as a hint, not literal purple/blue. Premium and recessive, never flat true black.
- Edge-to-edge layout. No window chrome, no gutters around content. Use safe areas only where iOS requires.
- Hard 90-degree corners on every element. Zero rounded radii anywhere.
- No glows, no soft shadows, no gloss, no filled buttons.
- Outlined glyphs and controls only. Every interactive element is a thin rectangular outline at 1px stroke.
- ALL CAPS for titles and labels by default. Generous letter-tracking, around `0.2em` on titles and `0.14em` on UI labels.
- Atmospheric texture in the waveform/visualization area: wispy, low-noise, slightly glitched. This atmosphere is part of the brand language, carried over from the NIGHTSHAPE splash page.

### 2.2 Canonical Color Palette

The palette is strictly cool-toned. Warm tones (red, orange, yellow, warm brown) do not appear anywhere in the app.

#### Background tones

| Token | Hex | Use |
|---|---|---|
| `bg/true` | `#020203` | Primary background, deepest |
| `bg/lift` | `#050509` | Subtle lift for secondary surfaces |
| `bg/haze` | `#0A0A12` | Very faint UV haze, use sparingly |

#### Three canonical accent colors

These three colors form a tight cool-toned gradient marching cyan -> violet -> magenta. They map both to UI hierarchy and to the timing-shift visualization. They are the same three colors used on the row borders of the DRUMKIT sequencer: one coherent palette across the NIGHTSHAPE ecosystem.

| Token | Hex | Hue | Use |
|---|---|---|---|
| `accent/teal` | `#3AC5C5` | 180 | Primary/active, on-grid beats, Track A identity, system OK |
| `accent/violet` | `#9693E1` | 242 | Secondary/info, beats corrected later/forward in time, mid-row UI elements |
| `accent/magenta` | `#AA56C4` | 286 | Accent/highlight, beats corrected earlier/backward in time, Track B identity |

Note: these hex values were sampled from the DRUMKIT reference renders. If the canonical NIGHTSHAPE design files have exact source values, use those; the values here are accurate within a few RGB points.

#### Neutral/text scale (cool-tinted greys)

| Token | Hex | Use |
|---|---|---|
| `fg/primary` | `#CAC8DA` | Primary text, key readouts (BPM, segment labels) |
| `fg/secondary` | `#8E8CA6` | Captions, metadata (44.1 KHZ, 24 BIT) |
| `fg/tertiary` | `#5A586E` | Inactive/dim labels |
| `fg/ghost` | `#2F2D40` | Recessive ghost-state elements, deselected segments |

All greys carry a faint cool tint, with blue slightly above red. Never use true neutral greys.

### 2.3 Typography

Use only the included NIGHTSHAPE-UI font family. iOS system fonts may serve as a fallback only for system UI surfaces (alerts, document picker, share sheet) and never for primary content.

Font files must be bundled into the native iOS target and registered at launch. Any fallback behavior is development-only.

| Style | Font | Size (pt) | Tracking | Case | Use |
|---|---|---:|---|---|---|
| Display | NIGHTSHAPE-UI Bold | 34 | 0.04em | mixed | App wordmark, hero |
| H1 | NIGHTSHAPE-UI Bold | 22 | 0.18em | UPPER | Screen titles (PATTERN, SONG) |
| H2 | NIGHTSHAPE-UI Bold | 16 | 0.2em | UPPER | Section headers |
| Body | NIGHTSHAPE-UI Light | 14 | 0.14em | UPPER | Standard labels |
| Caption | NIGHTSHAPE-UI Light | 11 | 0.18em | UPPER | Metadata, captions |
| Micro | NIGHTSHAPE-UI Light | 9 | 0.2em | UPPER | Tertiary metadata |
| Readout | NIGHTSHAPE-UI Bold | 32-48 | 0 | numeric | BPM, time displays |

Use a monospace-feeling rhythm for all numeric readouts (BPM, dB, sample rate, time codes). NIGHTSHAPE-UI Light is monospaced enough for this; do not introduce a separate mono font.

### 2.4 Brand Wordmark Application

The TETHR wordmark itself should follow the same gradient treatment as the DRUMKIT logo: ALL CAPS NIGHTSHAPE-UI Bold, with a left-to-right cool gradient that traverses teal -> violet -> magenta. The wordmark sits at the top of the launch screen and the main view header.

---

## 3. Interaction Philosophy: Gesture-First

The interface is quiet until you touch it. Controls are not separate widgets; the elements themselves are interactive via gesture. This is a core design principle and should be applied throughout.

| Element | Interaction |
|---|---|
| Master BPM readout | Tap-and-vertical-drag on the readout itself. Drag up to increase BPM, down to decrease. The readout is the control: no slider, no popup, no input field. Drag sensitivity should feel precise, around 1 BPM per 8pt of finger movement, with a haptic tick at each whole BPM. Double-tap to reset to detected/master BPM. |
| Track timing readout | If track-specific timing controls exist, they adjust that track's conforming into the shared master grid. They do not create independent playback timelines. |
| Segments (timeline) | Tap a segment on either track to make it the active segment at that position; the corresponding segment on the other track becomes inactive automatically. |
| Segment label | Long-press to rename. Renaming uses a minimal inline text input, no modal. |
| Waveform / timeline scrub | Tap-and-horizontal-drag on the waveform to scrub playhead. |
| Playhead | Tap anywhere on the timeline area to jump playback to that position. |
| Track expansion / focus | Tap the track header to focus that track slightly; the other track recedes. Tap again or tap the other track to release. |
| Zoom timeline | Pinch on the waveform area. |
| Transport | Single play/pause control. Tap to toggle. |
| Import second track | A subtle, recessive `+ TRACK B` affordance appears when Track A is loaded but Track B is not. Tap to import. |
| Export | Tap-and-hold a dedicated export affordance for about 0.5s. The hold gesture intentionally distinguishes export from accidental taps. A subtle progress fill shows the hold landing. |

Avoid modal dialogs, sliders with thumbs, segmented controls, tabs, hamburger menus, and on-screen buttons that look like buttons. If a control needs to be visible at rest, it should look like a thin rectangular outline or a numeric readout, never a glossy button.

Haptic feedback is encouraged for BPM tick, segment toggle, playhead landing on a segment boundary, and export completion. Use `UIImpactFeedbackGenerator` with `.light` style; never aggressive haptics.

---

## 4. The Dual-State Visualization (Hero Element)

This is the signature visual moment of TETHR. It happens during processing and remains as the resting state of the waveform area.

### 4.1 Concept

Each track's waveform area shows two layers simultaneously:

- Ghost layer underneath: the original drifted beats, rendered in `fg/ghost` (`#2F2D40`) with the wispy, glitched, atmospheric texture from the splash page aesthetic. Lower opacity. This is where the beats were before correction.
- Corrected layer on top: the on-grid corrected beats, rendered crisply in the appropriate accent color. Higher opacity, sharper edges. This is where the beats are now.
- Shift trails: thin lines or smears connecting each ghost beat to its corrected position, indicating the shift direction and magnitude.

### 4.2 Three-Color Shift Coding

At each beat, the corrected marker is colored by what kind of shift was applied. Direction is defined from ghost/original position to corrected/on-grid position:

| Color | Hex | Meaning |
|---|---|---|
| `accent/teal` | `#3AC5C5` | Beat was already on-grid or close enough that no meaningful correction was needed. This is the locked-in state. |
| `accent/violet` | `#9693E1` | Beat was early/rushed; correction moved it later/forward in time to lock to the grid. |
| `accent/magenta` | `#AA56C4` | Beat was late/dragged; correction moved it earlier/backward in time to lock to the grid. |

The shift trail itself can fade from the ghost color to the corrected color, reinforcing the direction.

The diagnostic read: at a glance, a player or render that tends to rush shows more violet; one that drags shows more magenta; locked-in material shows mostly teal. This is useful information presented as aesthetic, not decoration.

### 4.3 Processing as the Hero Moment

When the user imports a track, processing takes a few seconds. Do not show a generic spinner. Instead, the visualization animates in real time during the processing window:

1. Phase 1 (0 to about 30% of processing): the ghost beats render in, drifted, wispy, glitched, settling into position. The waveform appears in its ghost form.
2. Phase 2 (about 30% to 90%): corrected beats begin appearing one by one in their color-coded positions on top of the ghost. Shift trails draw in connecting ghosts to corrected positions.
3. Phase 3 (about 90% to 100%): segment boundaries snap in across the timeline as the segmentation algorithm completes. Segment labels fade in.

The processing screen is the show. By the time it finishes, the user has watched the correction happen and understands what TETHR did.

Reduced motion mode skips the animated reveal and shows the final corrected state immediately.

---

## 5. Screen Architecture

The app is structurally single-screen with three logical states. Use a single root view that transitions between states rather than multiple separate screens.

### 5.1 State A: Empty / Launch

- TETHR wordmark centered, with gradient fill (teal -> violet -> magenta, left to right).
- Below the wordmark: a single subtle outlined target reading `TAP TO IMPORT`, or similar.
- iOS document picker triggers on tap.
- The atmospheric texture (low-noise glitch field) is present at very low opacity in the background.

### 5.2 State B: One Track Loaded

- Top: small wordmark plus minimal app chrome (current state, settings access).
- Main area: Track A's stacked waveform/visualization filling most of the screen.
- Track A row contains: waveform with dual-state visualization, segment regions across the bottom of the row with labels, and the source-file caption (filename, sample rate, bit depth, stereo/mono).
- Below Track A: a recessive `+ TRACK B` affordance, outlined, dim, full-width. Tapping it opens the document picker for the second file.
- Right side: the master BPM readout, large and prominent, with tap-and-drag control behavior.
- Optional near Track A: a smaller source BPM/conform readout if needed. It must be clearly secondary to the master output BPM.
- Bottom: transport (single play/pause), playhead time, total duration.
- Bottom-right corner: export affordance (initially dim; exports a single-track corrected file at this stage).

### 5.3 State C: Two Tracks Loaded (Composite Mode)

- Top: same wordmark plus chrome.
- Main area: Track A on top half, Track B on bottom half, both stacked. Each track shows its own dual-state visualization and segment regions.
- Both tracks share one segment map and one corrected timeline. Segment boundaries line up vertically between Track A and Track B.
- Segments are mutually exclusive between rows: at any time position, exactly one track's segment is active (full opacity, accent color), while the other is ghosted (very low opacity, recessive). User taps a segment on either row to toggle which is active at that position.
- The composite path is implicit: visible as the trail of which segments are lit across the two stacked timelines. Optionally, a very thin connecting line traces the active path across the two rows, visualizing the composition.
- The master BPM readout controls the output grid for the composite.
- Each track may display its detected/source BPM and conform status, but those values do not create independent timelines.
- Each track gets one identity color to keep it distinct beyond position:
  - Track A: `accent/teal` (`#3AC5C5`)
  - Track B: `accent/magenta` (`#AA56C4`)
- The shift-coding colors remain local to each beat marker; the track identity color tints filename caption, source status, segment outlines, and similar track-level metadata.
- Transport plays the composite. What the user hears reflects whichever segments are currently active across both tracks.
- Export exports the same composite path heard during live playback.

### 5.4 Settings (Sheet)

A minimal sheet accessed by tapping a small outlined gear-like glyph in the top-right. Contents:

- Tempo correction sensitivity (for example, GENTLE / NORMAL / STRICT)
- Segment detection sensitivity (preset levels for how many segments to detect)
- Audio output device selector, if not auto-routed
- Export format and quality (WAV/AIFF, sample rate, bit depth)
- About / credits

All settings UI uses the same outlined-control language as the main view. No standard iOS toggles or pickers inside custom app surfaces. Standard system document picker and share sheet are acceptable where iOS requires them.

---

## 6. Specific Component Details

### 6.1 BPM Readout

- Large numeric display, NIGHTSHAPE-UI Bold, about 40pt.
- Above it: a small caption `BPM` in NIGHTSHAPE-UI Light micro size.
- Decimal place shown to 1 digit, for example `127.4`.
- The primary BPM readout controls the master output BPM/grid.
- When the user taps and starts dragging, the readout subtly enlarges by about 5% and a faint vertical guide-line appears beside it to confirm gesture state.
- Releasing commits the value. No apply button.
- Double-tap resets to the detected/master BPM.
- If smaller track-level timing readouts exist, label them as source or conforming values so they are not mistaken for independent track timelines.

### 6.2 Segment Region

- A thin outlined rectangle spanning the segment's time range at the bottom of each track row.
- Label centered in the rectangle: `SEGMENT 1`, `SEGMENT 2`, etc., or the user's renamed value.
- Active state: outline in track identity color at full brightness, label in `fg/primary`.
- Inactive state: outline in `fg/ghost`, label in `fg/tertiary`, about 40% opacity.
- Long-press triggers rename inline. The label text becomes editable in place, no modal.
- Tapping a segment updates the lightweight composite plan immediately. It must not wait for heavy audio rendering.

### 6.3 Waveform Rendering

- Render as a thin centered horizontal trace, not a filled volume; keep it light.
- The ghost/drifted waveform sits in `fg/ghost` with the atmospheric/glitched texture overlay.
- The corrected waveform sits on top in the track identity color at higher opacity.
- Optional: a faint vertical scan-line that travels across the waveform during playback to indicate playhead position.

### 6.4 Transport

- A single outlined glyph (play / pause). No rewind/forward buttons; scrubbing the timeline replaces those.
- Time readouts on either side: `MM:SS.ms` format, NIGHTSHAPE-UI Bold readout style.
- Playback follows the current composite plan. Segment selection changes should be audible on the next relevant segment boundary or as soon as the audio engine can switch click-safely.

### 6.5 Export

- A tap-and-hold target labeled `EXPORT` in the bottom-right.
- During hold, an outlined progress arc fills around the label.
- On completion, brief confirmation flash (the label tints in `accent/teal` for about 400ms) and a system share sheet appears to choose where to save the file.
- Export can use a higher-quality offline render path than live preview, but it must render the same composite path the user hears in playback.

---

## 7. Motion & Feel

- All transitions are crisp. No bouncy easing, no overshoots, no spring animations. Custom easing curves preferred: fast-out, slow-in. `cubic-bezier(0.32, 0.72, 0, 1)` is a good baseline.
- Element transitions snap. When a segment toggles active/inactive, it is a clean 120ms opacity plus color shift, not a slide or scale.
- Loading/processing is the exception: the dual-state visualization animation is intentionally cinematic over several seconds.
- Page-to-page transitions, where applicable: cross-fade only, never slide-in or push.
- No skeuomorphic textures, no 3D, no parallax. The app is flat, geometric, and information-dense without being busy.

---

## 8. Accessibility

- All gesture-driven controls must have an accessibility label describing what they are and how they work, for example: "BPM, 127.4 beats per minute. Adjustable: swipe up or down to change."
- VoiceOver users can adjust BPM by swiping the value with VoiceOver focus.
- Segments must be individually focusable and labeled with their position and active state.
- Color is never the only conveyor of information. The three-color shift visualization is informative but not required for use; the underlying correction works regardless of whether the user can see the colors.
- Provide a reduced motion mode that skips the dual-state animated reveal and shows the final corrected state immediately.
- Minimum tap target sizes: 44x44pt per Apple HIG.
- Support Dynamic Type for non-display text where possible. Readouts and the wordmark stay at fixed sizes for visual integrity.

---

## 9. Constraints & Notes for Implementation

- Segmentation runs against a shared reference when two tracks are loaded. The algorithm should produce identical segment boundaries on both tracks so the mutual-exclusion toggle behaves correctly.
- If implementation requires running detection on Track A first and projecting boundaries onto Track B, that is acceptable. The result must still be one shared segment map.
- When Track B is imported after Track A, the app may invalidate the one-track segment map and re-run paired shared analysis.
- The app handles one audio file per track. No multi-track-per-row.
- Live playback during composition is required. When the user taps a segment to toggle the composite arrangement, hitting play immediately reflects the new arrangement. No render-to-preview step.
- Segment toggles and BPM drags should update a lightweight composite plan immediately. Heavy correction/render work should be cached ahead of playback or reserved for export.
- Live playback must not block on heavy correction rendering. Use cached/prepared corrected audio, a real-time pitch-preserving path, or an immediate conservative fallback while higher-quality correction prepares asynchronously.
- Tempo changes are seamless from the user's perspective. They should not re-run beat detection or segmentation. The engine may reschedule playback, retime cached buffers, or update stretch parameters as needed.
- Segment boundaries must be click-safe. Use zero-crossing preference, transient-aware boundary handling, short micro-crossfades, or equivalent native audio safety logic.
- Export must render the same composite path heard in live playback.
- No account, no cloud, no sync for v1. Files are loaded from local storage / iCloud Drive via the standard document picker. Exports go to the standard share sheet.
- No in-app recording for v1. Load-only.
- Do not request microphone permission in v1.
- Single language: English for v1. All UI text is hard-coded; localization is a future concern.

---

## 10. Out of Scope for This Prompt

Decisions intentionally left for later iterations:

- Onboarding flow (the app is simple enough that a first-launch tutorial may not be needed)
- Pro/paid feature gating (NIGHTSHAPE-wide one-time Pro unlock model applies but specifics TBD)
- Watch / iPad-specific layouts (iPhone first; iPad will follow with the same language adapted to the larger canvas)
- Integration with the broader NIGHTSHAPE ecosystem (DRUMKIT export/import, Wh0mst project files, etc.)
- File library / project save-state (assume one session at a time for v1)

---

## 11. Deliverables Expected From This Prompt

A designer or AI design tool working from this spec should produce:

1. Three primary screens as high-fidelity mockups, iPhone Pro size (393x852pt):
   - State A: empty/launch
   - State B: Track A loaded, processing complete
   - State C: both tracks loaded, composite mode mid-composition
2. The processing animation described as keyframes or a short motion study (the dual-state reveal).
3. A component library showing:
   - BPM readout in rest and dragging states
   - Segment region active and inactive
   - Transport
   - Export tap-and-hold states
   - Settings sheet
4. The wordmark application at the top of the launch screen with the gradient treatment.
5. A short interaction notes document describing the gesture mappings. Section 3 can serve as the source.

---

## End of Prompt

This is a living document. Decisions flagged as defaults or assumptions can be overridden in future iterations. The aesthetic system (Section 2), interaction philosophy (Section 3), and shared timeline rules (Sections 1 and 9) are foundational and should not be diluted. The screen architecture (Section 5) and component details (Section 6) are open to refinement based on usability testing.
