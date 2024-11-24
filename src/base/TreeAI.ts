import { TreeNode } from './TreeNode';

export class TreeAI<M> extends TreeNode {
    constructor(readonly name: string, initMemory: () => M) {
        super();
        if (!Memory.custom.containers[name]) {
            Memory.custom.containers[name] = initMemory();
        }
    }

    get memory(): M {
        return Memory.custom.containers[this.name];
    }

    protected override onSelfDeath() {
        delete Memory.custom.containers[this.name];
    }
}
