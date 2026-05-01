import {SystemBase} from './SystemBase.ts';

/**
 * Tracks the player's row-based score during a run and exposes a lightweight
 * DOM placeholder that can be used by the in-progress UI.
 *
 * The score increments whenever a tile row is recycled (i.e. the player has
 * effectively passed one more row). The system is responsible for resetting
 * the score when a new run starts and for updating the simple on-screen
 * placeholder while the game is running.
 */
export class ScoreSystem extends SystemBase {
    /** Current integer score (rows passed). */
    private score = 0;

    /** DOM element used as a live score placeholder. */
    private scoreEl: HTMLDivElement | null = null;

    /** Called when the system is registered; create the DOM placeholder. */
    public override async register(): Promise<void> {
        // Create a minimal floating DOM element for quick debugging / UI hookup.
        const el = document.createElement('div');
        el.id = 'scorePlaceholder';
        el.style.position = 'fixed';
        el.style.left = '12px';
        el.style.top = '12px';
        el.style.zIndex = '9999';
        el.style.color = 'white';
        el.style.fontFamily = 'monospace, Arial, sans-serif';
        el.style.fontSize = '20px';
        el.style.padding = '6px 10px';
        el.style.background = 'rgba(0,0,0,0.4)';
        el.style.borderRadius = '6px';
        el.style.pointerEvents = 'none';
        el.innerText = 'Score: 0';

        document.body.appendChild(el);
        this.scoreEl = el;
    }

    /** Per-frame update — refresh the DOM placeholder if present. */
    public override update(_delta: number): void {
        if (this.scoreEl) {
            this.scoreEl.innerText = `Score: ${this.score}`;
        }
    }

    /** Adds one or more rows to the current score. */
    public addRows(count = 1): void {
        this.score += Math.max(0, Math.floor(count));
    }

    /** Returns the current score. */
    public getScore(): number {
        return this.score;
    }

    /** Resets the score to zero. */
    public reset(): void {
        this.score = 0;
        if (this.scoreEl) {
            this.scoreEl.innerText = 'Score: 0';
        }
    }
}
