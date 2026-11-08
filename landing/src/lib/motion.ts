/**
 * Rheo Motion System & Animation Doctrine
 *
 * Implements core interaction & animation principles:
 * 1. Use ease-out for entrances.
 * 2. Keep dropdowns at 150 to 250ms.
 * 3. Stagger list rows by 30ms.
 * 4. Scale buttons to 0.97 on press.
 * 5. Stretch moving knobs by 12%.
 * 6. Stagger when details settle.
 * 7. Use Arc for object movement.
 * 8. Use a pulse to confirm success.
 * 9. Use ease-in-out for onscreen movements.
 * 10. Start popovers at scale 0.95, transitioning in from the trigger.
 * 11. Avoid spring bounce for everyday UI transitions.
 * 12. Don't tween a handheld animation.
 * 13. Make exits 20% shorter than entrances.
 * 14. Treat new state-in as old state leaves.
 * 15. Use mask for reveals and color changes.
 * 16. Crossfade icons with scale and blur.
 * 17. Rubberband past drag boundaries.
 * 18. Reuse the same layout ID across shared objects.
 */

import { type Transition, type Variants } from 'framer-motion';

// ─── 1 & 9 & 13. Timing Curves & Durations ────────────────────────────────────

/**
 * 1. Use ease-out for entrances (sharp deceleration as objects arrive into view).
 */
export const EASE_ENTRANCE = [0.16, 1, 0.3, 1] as const; // Custom smooth cubic ease-out

/**
 * 9. Use ease-in-out for onscreen movements (acceleration and deceleration between visible states).
 */
export const EASE_ONSCREEN = [0.65, 0, 0.35, 1] as const; // Smooth cinematic ease-in-out

/**
 * 13. Exits are 20% shorter than entrances and accelerate away.
 */
export const EASE_EXIT = [0.7, 0, 0.84, 0] as const; // Acceleration ease-in

/**
 * 2. Keep dropdowns at 150 to 250ms (default 200ms).
 */
export const DURATION_DROPDOWN = 0.2; // 200ms

/**
 * Standard entrance duration.
 */
export const DURATION_ENTRANCE = 0.25; // 250ms

/**
 * 13. Exit duration: 20% shorter than entrance (250ms * 0.8 = 200ms).
 */
export const DURATION_EXIT = DURATION_ENTRANCE * 0.8; // 200ms

/**
 * 3. Stagger list rows by 30ms (0.03s).
 */
export const STAGGER_ROW = 0.03; // 30ms

/**
 * 4. Scale buttons to 0.97 on press.
 */
export const SCALE_BUTTON_PRESS = 0.97;

/**
 * 5. Stretch moving knobs by 12% (1.12 scale on movement axis).
 */
export const STRETCH_MOVING_KNOB = 1.12;

/**
 * 10. Start popovers at scale 0.95.
 */
export const SCALE_POPOVER_START = 0.95;

// ─── Motion Variants & Transitions ──────────────────────────────────────────

/**
 * 4. Button press / tap transition (active scale 0.97).
 */
export const buttonTapTransition: Transition = {
  duration: 0.1,
  ease: EASE_ENTRANCE,
};

export const buttonMotionProps = {
  whileTap: { scale: SCALE_BUTTON_PRESS },
  transition: buttonTapTransition,
};

/**
 * 2 & 10. Popover & Dropdown transition variants.
 * Starts at scale 0.95 with ease-out entrance, exits 20% faster.
 */
export const popoverVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: SCALE_POPOVER_START,
    transition: {
      duration: DURATION_EXIT,
      ease: EASE_EXIT,
    },
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: DURATION_DROPDOWN, // 200ms (150-250ms)
      ease: EASE_ENTRANCE,
    },
  },
};

/**
 * 3. List & row stagger container (30ms per row item).
 */
export const listStaggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER_ROW, // 30ms stagger
      delayChildren: 0.02,
    },
  },
};

export const listRowItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION_ENTRANCE,
      ease: EASE_ENTRANCE,
    },
  },
};

/**
 * 6. Stagger when details settle.
 */
export const detailsSettleVariants: Variants = {
  collapsed: {
    opacity: 0,
    height: 0,
    transition: {
      duration: DURATION_EXIT,
      ease: EASE_EXIT,
    },
  },
  expanded: {
    opacity: 1,
    height: 'auto',
    transition: {
      duration: DURATION_ENTRANCE,
      ease: EASE_ENTRANCE,
      staggerChildren: STAGGER_ROW,
    },
  },
};

/**
 * 8. Pulse to confirm success.
 */
export const successPulseVariants: Variants = {
  idle: { scale: 1 },
  success: {
    scale: [1, 1.05, 0.98, 1],
    transition: {
      duration: 0.35,
      ease: EASE_ONSCREEN,
      times: [0, 0.35, 0.7, 1],
    },
  },
};

/**
 * 16. Crossfade icons with scale and blur.
 */
export const iconCrossfadeVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.85,
    filter: 'blur(3px)',
  },
  animate: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.18,
      ease: EASE_ENTRANCE,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    filter: 'blur(3px)',
    transition: {
      duration: 0.14, // 20% shorter
      ease: EASE_EXIT,
    },
  },
};

/**
 * 5. Stretch knob animation helper during dragging/scrubbing.
 */
export function getKnobTransform(isMoving: boolean, direction: 'x' | 'y' = 'x') {
  if (!isMoving) return { scaleX: 1, scaleY: 1 };
  return direction === 'x'
    ? { scaleX: STRETCH_MOVING_KNOB, scaleY: 0.92 }
    : { scaleX: 0.92, scaleY: STRETCH_MOVING_KNOB };
}

/**
 * 17. Rubberband elastic drag boundaries configuration.
 */
export const rubberbandDragProps = {
  dragElastic: 0.18, // Rubberband resistance past boundary
  dragTransition: { bounceStiffness: 600, bounceDamping: 35 },
};

/**
 * 15. CSS clip-path mask utilities for reveals and color transitions.
 */
export const maskRevealStyles = {
  circleReveal: (percentage: number) => ({
    clipPath: `circle(${percentage}% at 50% 50%)`,
  }),
  linearReveal: (percentage: number) => ({
    clipPath: `inset(0 ${100 - percentage}% 0 0)`,
  }),
};
