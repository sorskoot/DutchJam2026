import {SystemBase} from './SystemBase.ts';

export type GameState = 'playing' | 'dead';

/**
 * Tracks overall game state and shows a game-over overlay when the player falls
 * off the tiles.  MainScene stops calling gameSystems.update() when dead so all
 * other systems freeze automatically.
 */
export class GameStateSystem extends SystemBase {
    public state: GameState = 'playing';

    triggerGameOver(): void {
        if (this.state === 'dead') return;
        this.state = 'dead';
        this._showOverlay();
    }

    reset(): void {
        this.state = 'playing';
        const existing = document.getElementById('gameover-overlay');
        if (existing) document.body.removeChild(existing);
    }

    // ── Internals ────────────────────────────────────────────────────────────
    // TK: Convert to Babylon GUI
    private _showOverlay(): void {
        const overlay = document.createElement('div');
        overlay.id = 'gameover-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            background: 'rgba(0,0,10,0.82)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Segoe UI', sans-serif",
            color: '#fff',
            zIndex: '9999',
        });

        overlay.innerHTML = `
            <h1 style="font-size:3rem;margin:0 0 0.5rem;letter-spacing:0.1em;color:#ff4444;">
                GAME OVER
            </h1>
            <p style="font-size:1.2rem;margin:0 0 2rem;opacity:0.75;">You fell off the track!</p>
            <button id="gameover-restart" style="
                padding:0.75rem 2.5rem;
                font-size:1.1rem;
                background:#2255cc;
                color:#fff;
                border:none;
                border-radius:6px;
                cursor:pointer;
                letter-spacing:0.05em;
            ">Restart</button>
        `;

        document.body.appendChild(overlay);

        document.getElementById('gameover-restart')?.addEventListener('click', () => {
            window.location.reload();
        });
    }

    // GameStateSystem itself has no per-frame work – state is read externally.
    override update(_delta: number): void {}
}

