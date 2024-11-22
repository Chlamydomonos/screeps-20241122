export class AI<T, M extends AIManager<T> = AIManager<T>, Me = any> {
    readonly id: string;

    constructor(obj: T, readonly manager: M, idGetter: (obj: T) => string, private initMemory?: (obj: T) => Me) {
        this.id = idGetter(obj);
        manager.registerAI(this);
    }

    get value(): T | undefined {
        return Game.getObjectById(this.id) as T;
    }

    get alive() {
        return !!this.value;
    }

    get memory(): Me {
        if (!Memory.custom.containers[this.id]) {
            Memory.custom.containers[this.id] = this.initMemory ? this.initMemory(this.value!) : {};
        }

        return Memory.custom.containers[this.id];
    }

    tick() {}

    onDeath() {}
}

export class AIManager<T, A extends AI<T> = AI<T, any>> {
    readonly data: Record<string, A> = {};

    constructor(readonly parent?: AIManager<T, A>) {}

    registerAI(ai: A, fromChild: boolean = false) {
        this.data[ai.id] = ai;
        this.parent?.registerAI(ai, true);
    }

    tick() {
        for (const name in this.data) {
            const ai = this.data[name];
            if (!ai) {
                console.log(`wtf: ${name}`);
            }
            if (!ai.alive) {
                console.log(`dead: ${name}`);
                this.onAIDeath(ai);
            } else {
                ai.tick();
            }
        }
    }

    onAIDeath(ai: A, fromChild: boolean = false) {
        ai.onDeath();
        delete this.data[ai.id];
        this.parent?.onAIDeath(ai, true);
    }
}
