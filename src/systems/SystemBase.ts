export abstract class SystemBase {
    update(_delta: number) {
    }
}

/**
 * Systems are singleton classes that update on the game tick
 */
class Systems {
    private systems = new Map<string, SystemBase>();

    register(name: string, system: SystemBase) {
        this.systems.set(name, system);
    }

    get(name: string) {
        return this.systems.get(name);
    }

    update(delta: number) {
        // update all systems
        for (const system of this.systems.values()) {
            system.update(delta);
        }
    }
}

export const gameSystems = new Systems();