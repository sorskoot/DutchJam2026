/**
 * This code is based on an implementation of the Alea algorithm; (C) 2010 Johannes Baagøe.
 * Alea is licensed according to the http://en.wikipedia.org/wiki/MIT_License.
 */

const FRAC = 2.3283064365386963e-10; /* 2^-32 */

/**
 * Seeded pseudo-random number generator based on the Alea algorithm.
 *
 * @example
 * ```ts
 * import {rng} from './utils/rng.ts';
 * const value = rng.getUniform(); // [0, 1)
 * ```
 */
export class RNG {
    private seed = 0;
    private s0 = 0;
    private s1 = 0;
    private s2 = 0;
    private c = 0;

    /**
     * Returns the current seed value.
     * @returns The seed that was last passed to {@link setSeed}.
     */
    public getSeed(): number {
        return this.seed;
    }

    /**
     * Seeds the number generator.
     * @param seed - Seed value used to initialize the internal state.
     * @returns This instance, to allow chaining.
     */
    public setSeed(seed: number): this {
        seed = seed < 1 ? 1 / seed : seed;

        this.seed = seed;
        this.s0 = (seed >>> 0) * FRAC;

        seed = (seed * 69069 + 1) >>> 0;
        this.s1 = seed * FRAC;

        seed = (seed * 69069 + 1) >>> 0;
        this.s2 = seed * FRAC;

        this.c = 1;
        return this;
    }

    /**
     * @returns Pseudorandom value [0, 1), uniformly distributed.
     */
    public getUniform(): number {
        const t = 2091639 * this.s0 + this.c * FRAC;
        this.s0 = this.s1;
        this.s1 = this.s2;
        this.c = t | 0;
        this.s2 = t - this.c;
        return this.s2;
    }

    /**
     * @param lowerBound - The lower end of the range to return a value from, inclusive.
     * @param upperBound - The upper end of the range to return a value from, inclusive.
     * @returns Pseudorandom integer in [lowerBound, upperBound], uniformly distributed.
     */
    public getUniformInt(lowerBound: number, upperBound: number): number {
        const max = Math.max(lowerBound, upperBound);
        const min = Math.min(lowerBound, upperBound);
        return Math.floor(this.getUniform() * (max - min + 1)) + min;
    }

    /**
     * @param lowerBound - The lower end of the range to return a value from, inclusive.
     * @param upperBound - The upper end of the range to return a value from, inclusive.
     * @returns Pseudorandom float in [lowerBound, upperBound], uniformly distributed.
     */
    public getUniformFloat(lowerBound: number, upperBound: number): number {
        const max = Math.max(lowerBound, upperBound);
        const min = Math.min(lowerBound, upperBound);
        return this.getUniform() * (max - min) + min;
    }

    /**
     * @param mean - Mean value.
     * @param stddev - Standard deviation. ~95 % of values will be within 2 * stddev.
     * @returns A normally distributed pseudorandom value.
     */
    public getNormal(mean = 0, stddev = 1): number {
        let u: number;
        let v: number;
        let r: number;
        do {
            u = 2 * this.getUniform() - 1;
            v = 2 * this.getUniform() - 1;
            r = u * u + v * v;
        } while (r > 1 || r === 0);

        const gauss = u * Math.sqrt((-2 * Math.log(r)) / r);
        return mean + gauss * stddev;
    }

    /**
     * @returns Pseudorandom value [1, 100] inclusive, uniformly distributed.
     */
    public getPercentage(): number {
        return 1 + Math.floor(this.getUniform() * 100);
    }

    /**
     * Picks a random item from an array.
     * @param array - Array to pick a random item from.
     * @returns A randomly selected item, or `null` when the array is empty.
     */
    public getItem<T>(array: T[]): T | null {
        if (!array.length) {
            return null;
        }
        return array[Math.floor(this.getUniform() * array.length)];
    }

    /**
     * Gets a collection of random unique items from an array.
     * @param array - The array to draw items from.
     * @param amount - The number of unique items to return.
     * @returns An array of randomly selected unique items; empty when the source is empty.
     */
    public getItems<T>(array: T[], amount: number): T[] {
        if (!array.length) {
            return [];
        }

        const clamped = Math.min(amount, array.length);
        const result = new Set<T>();
        while (result.size < clamped) {
            result.add(array[Math.floor(this.getUniform() * array.length)]);
        }
        return Array.from(result);
    }

    /**
     * Returns a new array containing the same items in a random order.
     * @param array - Array to randomize.
     * @returns New array with randomized item order.
     */
    public shuffle<T>(array: T[]): T[] {
        const result: T[] = [];
        const clone = array.slice();
        while (clone.length) {
            const item = this.getItem(clone) as T;
            const index = clone.indexOf(item);
            result.push(clone.splice(index, 1)[0]);
        }
        return result;
    }

    /**
     * Picks a key from a weighted map where values represent relative probabilities.
     * @param data - An object whose keys are candidates and values are their weights.
     * @returns The randomly selected key.
     */
    public getWeightedValue(data: Record<string, number>): string | undefined {
        let total = 0;

        for (const id in data) {
            total += data[id];
        }

        const random = this.getUniform() * total;

        let part = 0;
        for (const id in data) {
            part += data[id];
            if (random < part) {
                return id;
            }
        }

        // If by some floating-point annoyance random >= total, return the last key.
        return Object.keys(data).pop();
    }

    /**
     * Returns the current internal state. Useful for storing and restoring via {@link setState}.
     * @returns A snapshot of the four internal state values.
     */
    public getState(): [number, number, number, number] {
        return [this.s0, this.s1, this.s2, this.c];
    }

    /**
     * Restores a previously captured state.
     * @param state - A state snapshot previously returned by {@link getState}.
     * @returns This instance, to allow chaining.
     */
    public setState(state: [number, number, number, number]): this {
        this.s0 = state[0];
        this.s1 = state[1];
        this.s2 = state[2];
        this.c = state[3];
        return this;
    }

    /**
     * Returns a cloned {@link RNG} with an identical internal state.
     * @returns A new independent {@link RNG} instance seeded to the same state.
     */
    public clone(): RNG {
        const clone = new RNG();
        return clone.setState(this.getState());
    }

    /**
     * Returns an array of non-repeating random integers in [min, max).
     * @param min - Inclusive lower bound.
     * @param max - Exclusive upper bound.
     * @param valueCount - How many unique values to return.
     * @returns An array of `valueCount` unique integers drawn from [min, max).
     */
    public randomNonRepeatingValues(min: number, max: number, valueCount: number): number[] {
        const count = max - min;
        const values = new Array<number>(count);
        for (let x = 0; x < count; x++) {
            values[x] = x + min;
        }

        this.shuffleArray(values);

        const results: number[] = [];
        for (let x = 0; x < valueCount && x < values.length; x++) {
            results.push(values[x]);
        }
        return results;
    }

    /**
     * Shuffles an array in place using a Fisher-Yates algorithm driven by this RNG.
     * @param array - The array to shuffle in place.
     */
    public shuffleArray<T>(array: T[]): void {
        for (let x = array.length - 1; x >= 0; x--) {
            const index = this.getUniformInt(0, x);
            const temp: T = array[x];
            array[x] = array[index];
            array[index] = temp;
        }
    }
}

/** Singleton {@link RNG} instance, seeded with the current timestamp at startup. */
export const rng = new RNG().setSeed(Date.now());
