// Durations (ms)
export const TRANSITION_DURATION_TINY = 100;
export const TRANSITION_DURATION_FASTEST = 120;
export const TRANSITION_DURATION_FAST = 150;
export const TRANSITION_DURATION_NORMAL = 200;
export const TRANSITION_DURATION_MEDIUM = 300;
export const TRANSITION_DURATION_SLOW = 500;
export const TRANSITION_DURATION_SLOWER = 600;
export const TRANSITION_DURATION_LONG = 1000;
export const TRANSITION_DURATION_VERY_SLOW = 1200;

/*
 * Material motion.
 *
 * Duration is not a style preference here — it is a property of the object.
 * A key pressed into a panel moves a millimetre and returns in ~100ms; a sheet
 * of paper lifted off a desk takes ~300ms and settles. Deriving the two from
 * the same elevation ramp (`--lift-1/2/3`) is what keeps a page feeling like
 * one set of physical objects instead of a set of widgets with tuned timings.
 *
 * Three steps, and no more. The site previously shipped seven near-identical
 * hover durations (120/130/140/150/160/180/220ms) that nobody could tell apart
 * but every new rule had to guess at.
 */
export const TRANSITION_DURATION_PRESS = 100;   // contact: finger on key
export const TRANSITION_DURATION_TOUCH = 140;   // hover on a small object
export const TRANSITION_DURATION_SETTLE = 300;  // a sheet changing height

// Easing functions
export const EASE_DEFAULT = "cubic-bezier(0.4, 0, 0.2, 1)";
export const EASE_PAGE_IN = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
export const EASE_PAGE_OUT = "cubic-bezier(0.55, 0.055, 0.675, 0.19)";

/*
 * Decelerating, with a little weight at the end. Things being put down slow
 * before they stop; a linear or symmetric curve reads as a CSS default.
 */
export const EASE_SETTLE = "cubic-bezier(0.22, 0.61, 0.36, 1)";

/*
 * A small overshoot, for objects that were lifted clear of the desk and are
 * being set back down. Used sparingly — a 12% overshoot on a 56px rail looks
 * like a bounce; on a panel that just appeared it reads as mass.
 */
export const EASE_LIFT = "cubic-bezier(0.34, 1.32, 0.64, 1)";
