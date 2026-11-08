# Rheo Motion Doctrine & Interaction Design System

This document specifies the motion design system, interaction physics, and animation doctrine implemented across Rheo's user interfaces.

---

## 18 Core Motion Principles

### 1. Use ease-out for entrances
- **Curve**: `cubic-bezier(0.16, 1, 0.3, 1)` or `easeOut`.
- **Rationale**: Elements entering the viewport should arrive with high initial momentum and sharply decelerate to an authoritative standstill. Avoid lazy linear acceleration for appearing content.

### 2. Keep dropdowns at 150 to 250ms
- **Timing**: `200ms` (clamped between `150ms` and `250ms`).
- **Rationale**: Menus and dropdown select panels must feel responsive without being jarring. 200ms provides perceived immediacy while permitting the eye to track spatial origin.

### 3. Stagger list rows by 30ms
- **Cadence**: `staggerChildren: 0.03` (`30ms` offset per row).
- **Rationale**: Long delays (e.g., 100ms+) feel sluggish on dense lists. A tight 30ms cascade creates a kinetic cascade where items settle rapidly without rendering as a monolithic block.

### 4. Scale buttons to 0.97 on press
- **Scale Factor**: `active:scale-[0.97]` / `whileTap={{ scale: 0.97 }}` with `duration: 0.1s`.
- **Rationale**: Tactile feedback requires perceptible displacement. A 3% compression provides physical haptic response without breaking container borders or layout flow.

### 5. Stretch moving knobs by 12%
- **Deformation**: `scaleX(1.12)` along the travel axis during drag or scrub.
- **Rationale**: Physical knobs and slider thumbs deform in the direction of motion (squash and stretch) under drag acceleration, signaling active manipulation.

### 6. Stagger when details settle
- **Choreography**: When detail panels, accordions, or drawer surfaces expand, orchestrate a brief stagger on the inner elements as the boundary finishes settling.

### 7. Use Arc for object movement
- **Spatial Path**: Non-linear curved bezier trajectory for multi-axis 2D translations.
- **Rationale**: Natural physical movements follow arcs due to pivot joints; rigid diagonal lines look artificial and robotic.

### 8. Use a pulse to confirm success
- **Feedback**: A single gentle confirmation pulse `scale: [1, 1.05, 0.98, 1]` upon completion (voice selection, capture ready, copy success).
- **Rationale**: Discrete confirmation reassures the user that an action was registered without modal interruptions.

### 9. Use ease-in-out for onscreen movements
- **Curve**: `cubic-bezier(0.65, 0, 0.35, 1)` or `easeInOut`.
- **Rationale**: Objects already visible on screen that reposition or transition states must start gradually, travel smoothly, and gently decelerate to rest.

### 10. Start popovers at scale 0.95, transitioning in from the trigger
- **Initial Geometry**: `scale: 0.95`, `opacity: 0`, transform origin aligned to trigger anchor point.
- **Rationale**: Expanding from 95% scale anchors the popover to its invoking control without excessive zoom distension.

### 11. Avoid spring bounce for everyday UI transitions
- **Damping**: Overdamped springs or clean cubic bezier easing curves.
- **Rationale**: Bouncy, oscillatory springs tire the eye over repeated daily use. Reserve elastic reactions exclusively for boundary collisions and gesture drag limits.

### 12. Don't tween a handheld animation
- **Natural Dynamics**: Handheld and organic float effects use subtle perceptual noise or continuous low-frequency physics, never mechanical linear or sinusoidal tweens.

### 13. Make exits 20% shorter than entrances
- **Formula**: `durationExit = durationEntrance * 0.8`.
- **Rationale**: Users focus on what is arriving, not what is departing. Accelerating departures frees visual attention and improves perceived responsiveness.

### 14. Treat new state-in as old state leaves
- **Choreography**: Cross-fade and transition the incoming state synchronously as the outgoing state begins its departure, preventing blank frames or disjointed layout jumps.

### 15. Use mask for reveals and color changes
- **Rendering**: Utilize CSS `clip-path` (circle / polygon) and `mask-image` for reveals, sweeps, and theme shifts rather than opacity-only fading.

### 16. Crossfade icons with scale and blur
- **Icon Morphing**: When swapping icons (e.g. Play ⇄ Pause, Copy ⇄ Check), crossfade combined with subtle scale compression (`0.85 → 1.0`) and micro-blur (`3px → 0px`).

### 17. Rubberband past drag boundaries
- **Resistance**: Exponential damping / resistance (`dragElastic: 0.18`) when pulling past constraints, providing physical tactile resistance before snapping back.

### 18. Reuse the same layout ID across shared objects
- **Framer Motion**: Apply `layoutId="shared-identifier"` across elements that represent the same conceptual entity across view boundaries, enabling seamless shared-element transitions.

---

## Token & Implementation Reference

In CSS (`globals.css`):
```css
:root {
  --ease-entrance: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-onscreen: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-exit: cubic-bezier(0.7, 0, 0.84, 0);
  --dur-dropdown: 200ms;
  --dur-entrance: 250ms;
  --dur-exit: 200ms;
  --stagger-row: 30ms;
  --scale-button-press: 0.97;
  --scale-popover-start: 0.95;
  --stretch-moving-knob: 1.12;
}
```

In TypeScript (`landing/src/lib/motion.ts`):
```ts
import { EASE_ENTRANCE, EASE_ONSCREEN, EASE_EXIT, STAGGER_ROW, SCALE_BUTTON_PRESS } from '@/lib/motion';
```
