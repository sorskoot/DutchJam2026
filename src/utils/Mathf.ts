import {Vector3} from '@babylonjs/core';

/** Unit vector along the positive X axis. */
export const AxisX = new Vector3(1, 0, 0);
/** Unit vector along the positive Y axis. */
export const AxisY = new Vector3(0, 1, 0);
/** Unit vector along the positive Z axis. */
export const AxisZ = new Vector3(0, 0, 1);
/** Unit vector along the negative Z axis. */
export const AxisNegZ = new Vector3(0, 0, -1);
/** A zero-length vector (0, 0, 0). */
export const Vec3Zero = new Vector3(0, 0, 0);
/** A vector with all components set to one (1, 1, 1). */
export const Vec3One = new Vector3(1, 1, 1);

/**
 * Used for converting radians to degrees.
 * @example
 * ```ts
 * const deg = rad * Rad2Deg;
 * ```
 */
const Rad2Deg = 57.29577951;

/**
 * Used for converting degrees to radians.
 * @example
 * ```ts
 * const rad = deg * Deg2Rad;
 * ```
 */
const Deg2Rad = 0.017453292;

/**
 * Loops the value t so that it is never larger than length and never smaller than 0.
 * @param t - The value to loop.
 * @param length - The upper bound of the loop range.
 * @returns The looped value in [0, length].
 */
function repeat(t: number, length: number): number {
    return clamp(t - Math.floor(t / length) * length, 0.0, length);
}

/**
 * Returns the fractional part of a number.
 * @param value - The input value.
 * @returns The fractional component of value.
 */
function fract(value: number): number {
    // We simply subtract the integer part of the value to get the fractional part.
    // The 0 bitshift is slightly faster than Math.floor.
    return value - (value << 0);
}

/**
 * Clamps an input value to the provided minimum and maximum range.
 * @param value - Numeric input for the clamping operation.
 * @param min - Minimum allowed result after clamping.
 * @param max - Maximum allowed result after clamping.
 * @returns The resulting output within the constraint range [min, max].
 */
function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Compares two floating-point values and returns true if they are similar.
 * @param a - First value.
 * @param b - Second value.
 * @returns `true` if the floating-point values a and b are similar.
 */
function approximately(a: number, b: number): boolean {
    return (
        Math.abs(b - a) <
        Math.max(1e-6 * Math.max(Math.abs(a), Math.abs(b)), Number.EPSILON * 8)
    );
}

export const Mathf = {
    Rad2Deg,
    Deg2Rad,
    repeat,
    clamp,
    approximately,
    fract,
};
