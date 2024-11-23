export class Heap<T> {
    private data: T[];
    private comparator: (a: T, b: T) => number;

    constructor(comparator: (a: T, b: T) => number, array: T[] = []) {
        this.data = [];
        this.comparator = comparator;

        if (array.length > 0) {
            this.buildHeap(array);
        }
    }

    private buildHeap(array: T[]): void {
        this.data = [...array];
        for (let i = Math.floor((this.data.length - 1) / 2); i >= 0; i--) {
            this.heapifyDown(i);
        }
    }

    private heapifyDown(index: number): void {
        const leftChild = (index: number) => 2 * index + 1;
        const rightChild = (index: number) => 2 * index + 2;

        let largest = index;

        const left = leftChild(index);
        const right = rightChild(index);

        if (left < this.data.length && this.comparator(this.data[left], this.data[largest]) < 0) {
            largest = left;
        }

        if (right < this.data.length && this.comparator(this.data[right], this.data[largest]) < 0) {
            largest = right;
        }

        if (largest !== index) {
            [this.data[index], this.data[largest]] = [this.data[largest], this.data[index]];
            this.heapifyDown(largest);
        }
    }

    private heapifyUp(index: number): void {
        const parent = (index: number) => Math.floor((index - 1) / 2);

        while (index > 0 && this.comparator(this.data[index], this.data[parent(index)]) < 0) {
            [this.data[index], this.data[parent(index)]] = [this.data[parent(index)], this.data[index]];
            index = parent(index);
        }
    }

    public insert(value: T): void {
        this.data.push(value);
        this.heapifyUp(this.data.length - 1);
    }

    public removeTop(): T | null {
        if (this.data.length === 0) {
            return null;
        }

        const top = this.data[0];
        const last = this.data.pop();

        if (this.data.length > 0 && last !== undefined) {
            this.data[0] = last;
            this.heapifyDown(0);
        }

        return top;
    }

    public peek(): T | null {
        return this.data.length > 0 ? this.data[0] : null;
    }

    public size(): number {
        return this.data.length;
    }

    public isEmpty(): boolean {
        return this.data.length === 0;
    }
}
