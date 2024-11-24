export class TreeNode {
    private initialized = false;

    tick() {
        if (!this.initialized) {
            this.initialized = true;
            this.initSelf();
        }

        for (const tickable of this.children) {
            tickable.tick();
        }
        this.tickSelf();
    }

    protected initSelf() {}

    protected tickSelf() {}

    private children: { tick: () => void; onDeath(): void }[] = [];
    protected registerChild<T extends { tick: () => void; onDeath: () => void }>(child: T) {
        this.children.push(child);
        return child;
    }

    onDeath() {
        for (const child of this.children) {
            child.onDeath();
        }

        this.onSelfDeath();
    }

    protected onSelfDeath() {}
}
