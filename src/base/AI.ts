import { ArrayOfLen, Decrement, Increment } from '../utils/TypeUtil';

export type RootManager<M extends AIManager<any, any, any, any>, Depth extends number = 5> = Depth extends 0
    ? never
    : M extends AIManager<infer T, infer A, any, infer P>
    ? P extends AIManager<any, any, any, any>
        ? P extends AIManager<T, A, M, any>
            ? RootManager<P, Decrement<Depth>>
            : never
        : M
    : never;

type TreeDepth<
    M extends AIManager<any, any, undefined, any>,
    StartDepth extends number = 0,
    MaxDepth extends number = 5
> = MaxDepth extends 0
    ? never
    : M extends AIManager<infer T, infer A, any, infer P>
    ? P extends AIManager<any, any, any, any>
        ? P extends AIManager<T, A, M, any>
            ? TreeDepth<P, Increment<StartDepth>, Decrement<MaxDepth>>
            : never
        : StartDepth
    : never;

export type ManagerNames<M extends AIManager<any, any, undefined, any>> = ArrayOfLen<TreeDepth<M>, string>;

export class AI<T, M extends AIManager<T, any, undefined, any>> {
    readonly name: string;
    readonly manager: M;

    private initialized = false;

    constructor(
        obj: T,
        manager: RootManager<M>,
        nameGetter: (obj: T) => string,
        private objGetter: (name: string) => T | undefined,
        managerNames: ManagerNames<M>
    ) {
        this.name = nameGetter(obj);
        this.manager = manager.registerAI(this, managerNames);
    }

    get value() {
        return this.objGetter(this.name);
    }

    get alive() {
        return !!this.value;
    }

    private tickables: { tick(): void }[] = [];
    protected registerTickable<T extends { tick(): void }>(tickable: T) {
        this.tickables.push(tickable);
        return tickable;
    }

    tick() {
        if (!this.initialized) {
            this.initialized = true;
            this.initSelf();
        }

        for (const tickable of this.tickables) {
            tickable.tick();
        }
        this.tickSelf();
    }

    protected initSelf() {}

    protected tickSelf() {}

    onDeath() {}
}

export type LeafManager<M extends AIManager<any, any, any, any>, Depth extends number = 5> = Depth extends 0
    ? never
    : M extends AIManager<infer T, infer A, infer C, any>
    ? C extends AIManager<any, any, any, any>
        ? C extends AIManager<T, A, any, M>
            ? LeafManager<C, Decrement<Depth>>
            : never
        : M
    : never;

export interface AIManagerConstructor<P extends AIManager<any, any, any, any>, M extends AIManager<any, any, any, P>> {
    new (name: string, parent: P): M;
}

export class AIManager<
    T,
    A extends AI<T, any>,
    C extends AIManager<T, A, any, any> | undefined,
    P extends AIManager<T, A, any, any> | undefined
> {
    readonly ais: Record<string, A> = {};
    readonly children: C extends AIManager<T, A, any, any> ? Record<string, C> : undefined;

    private initialized = false;

    constructor(
        readonly name: string,
        private childClass: C extends AIManager<any, any, any, any> ? AIManagerConstructor<any, C> : undefined,
        readonly parent: P
    ) {
        if (!childClass) {
            this.children = undefined as any;
        } else {
            this.children = {} as any;
        }
    }

    getOrCreateAI(name: string, obj: T, factory: (obj: T) => A) {
        if (this.ais[name]) {
            return this.ais[name];
        }
        return factory(obj);
    }

    getOrCreateChild(name: string): C {
        if (!this.childClass) {
            return undefined as C;
        }

        const children = this.children as Record<string, C>;
        if (!children[name]) {
            children[name] = new this.childClass(name, this) as C;
        }
        return children[name];
    }

    registerAI(ai: A, names: string[]): C extends AIManager<T, A, any, any> ? LeafManager<C> : this {
        this.ais[ai.name] = ai;
        if (!this.childClass) {
            return this as any;
        } else {
            const childName = names.shift()!;
            const children = this.children as Record<string, C>;
            if (!children[childName]) {
                children[childName] = new this.childClass!(childName, this) as C;
            }
            return children[childName]?.registerAI(ai, names);
        }
    }

    tick() {
        if (!this.initialized) {
            this.initialized = true;
            this.initSelf();
        }
        if (this.children) {
            for (const name in this.children) {
                this.children[name].tick();
            }
        } else {
            for (const name in this.ais) {
                const ai = this.ais[name];
                if (ai.alive) {
                    ai.tick();
                } else {
                    ai.onDeath();
                    this.onAIDeath(ai);
                }
            }
        }
    }

    onAIDeath(ai: A) {
        delete this.ais[ai.name];
        if (this.parent) {
            this.parent.onAIDeath(ai);
        }
        this.afterAIDeath(ai);
    }

    afterAIDeath(ai: A) {}

    protected initSelf() {}
}
