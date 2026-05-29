# AGENTS.md

This repository is for NIGHTSHAPE TETHR, a native iPhone app in its final state.

TETHR belongs in the same NIGHTSHAPE brand universe as NIGHTSHAPE DRUMKIT, but it is a separate product with its own workflow, information hierarchy, and interaction model.

## Core Rules

- Native SwiftUI is the target runtime for the finished iPhone app.
- Do not build WebView or web-wrapper solutions.
- Treat the existing React/Web Audio implementation as prototype/reference material, not the final runtime.
- Preserve the NIGHTSHAPE visual identity.
- Use a near-black matte background (#0C0C0E).
- Primary accent colors:
  - Cyan-teal (#33CCCC)
  - Indigo-blue (#6666FF)
  - Electric purple (#9933FF)
- Accent glow should remain restrained and soft, never oversized or blurry.
- Warm colors should be avoided unless explicitly requested.
- UI style should remain minimal, clean, sharp-edged, and high-contrast.
- Avoid unnecessary gradients, glassmorphism, or decorative clutter.
- Prefer iPhone-first layout behavior and smooth performance.
- Prefer small focused commits.
- Avoid unrelated refactors.
- Keep code readable and modular.
- Maintain scalable architecture suitable for future native audio engine integration.
- When uncertain, preserve existing behavior instead of redesigning.

## Product Boundary

TETHR is not NIGHTSHAPE DRUMKIT.

- Do not import Drumkit-specific concepts unless explicitly requested.
- Do not make drum pads, kits, or a 16-step drum sequencer the core product metaphor.
- Do not copy Drumkit screens directly.
- Shared brand language is welcome; shared product structure is not assumed.

TETHR should feel like a precision audio repair instrument:

- Waveform-first.
- Import, playback, playhead, and timing state first.
- BPM and tempo confidence telemetry should be clear.
- Beat correction status should be legible and trustworthy.
- Structure and segment detection should support the repair workflow.
- Controls should feel surgical, efficient, and restrained rather than performative.

## Visual Direction

TETHR should look like it was made by the same brand as NIGHTSHAPE DRUMKIT:

- Same cool matte NIGHTSHAPE atmosphere.
- Same restrained cyan, indigo, and purple signal language.
- Same sharp, hardware-like cleanliness.
- Same avoidance of warm or decorative drift.

But TETHR should express that identity through audio-repair surfaces:

- Waveforms.
- Timeline/playhead.
- Tempo/grid confidence.
- Correction state.
- Segment structure.
- Export/repaired-track state.

## Audio Rules

- Do not introduce pitch drift.
- Do not present playback-rate stretching as pitch-preserving.
- If pitch-preserving correction is used, it must be backed by an actual pitch-preserving engine or native equivalent.
- Prefer preserving musicality, transients, and source quality over aggressive correction.
- Sparse or low-confidence material should fall back conservatively rather than forcing artifacts.

## Current Prototype

The current web prototype can continue to be used to explore:

- Single-track import.
- BPM detection.
- Beat-map correction behavior.
- Waveform display.
- Playback/export behavior.
- Structure segmentation.

When native SwiftUI work begins, keep the web prototype as reference and migrate behavior intentionally rather than wrapping it.
