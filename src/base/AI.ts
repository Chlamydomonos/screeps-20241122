/**
 * @file AI.ts
 *
 * 互相依赖的两个类：{@link AI} 和 {@link AIManager}
 */

import { ArrayOfLen, Decrement, Increment } from '../utils/TypeUtil';
import { TreeNode } from './TreeNode';

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

/**
 * @class # AI
 *
 * 需要被{@link AIManager}管理的所有AI的基类。一般和某个生命周期为1 tick的对象关联。
 *
 * @typeParam T 关联的对象类型。使用{@link value}获取关联的对象。
 *
 * @typeParam M 管理该AI的**最底层**{@link AIManager}。
 */
export class AI<T, M extends AIManager<T, any, undefined, any>> extends TreeNode {
    readonly name: string;
    readonly manager: M;

    /**
     * @constructor
     * @param obj 构造该AI使用的对象。注意，由于该对象的生命周期一般只有1 tick，它不会被保存。
     * @param manager 管理该AI的**最顶层**{@link AIManager}。
     * @param nameGetter 从对象获取名称的函数，用于跨tick获取对象
     * @param objGetter 从名称获取对象的函数，用于跨tick获取对象
     * @param managerNames 管理该AI的各级{@link AIManager}的名称，顺序自顶向下，不包含最顶层。用于构建AIManager树。
     */
    constructor(
        obj: T,
        manager: RootManager<M>,
        nameGetter: (obj: T) => string,
        private objGetter: (name: string) => T | undefined,
        managerNames: ManagerNames<M>
    ) {
        super();
        this.name = nameGetter(obj);
        this.manager = manager.registerAI(this, managerNames);
    }

    get value() {
        return this.objGetter(this.name);
    }

    get alive() {
        return !!this.value;
    }
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

/**
 * @class # AIManager
 *
 * 组成一棵AIManager树（在TreeNode树结构之外）。
 * 在{@link tickSelf}中执行所管理的所有{@link AI}的{@link TreeNode#tick}。
 * 当管理的AI死亡，执行其{@link TreeNode#onDeath}。
 *
 * @typeParam T AI对应的对象类型
 * @typeParam A AI类型
 * @typeParam C 该manager的子节点类型
 * @typeParam P 该manager的父节点类型
 */
export class AIManager<
    T,
    A extends AI<T, any>,
    C extends AIManager<T, A, any, any> | undefined,
    P extends AIManager<T, A, any, any> | undefined
> extends TreeNode {
    readonly ais: Record<string, A> = {};
    readonly childManagers: C extends AIManager<T, A, any, any> ? Record<string, C> : undefined;

    constructor(
        readonly name: string,
        private childClass: C extends AIManager<any, any, any, any> ? AIManagerConstructor<any, C> : undefined,
        readonly parent: P
    ) {
        super();
        if (!childClass) {
            this.childManagers = undefined as any;
        } else {
            this.childManagers = {} as any;
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

        const children = this.childManagers as Record<string, C>;
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
            const children = this.childManagers as Record<string, C>;
            if (!children[childName]) {
                children[childName] = new this.childClass!(childName, this) as C;
            }
            return children[childName]?.registerAI(ai, names);
        }
    }

    protected override tickSelf() {
        if (this.childManagers) {
            for (const name in this.childManagers) {
                this.childManagers[name].tick();
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

    protected afterAIDeath(ai: A) {}

    get count() {
        return Object.keys(this.ais).length;
    }
}
