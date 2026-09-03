type HeapNode<T> = { item: T; priority: number };

export class MinHeap<T> {
    heap: Array<T> | Array<HeapNode<T>>;
    cmp?: (a: T, b: T) => number;

    constructor(cmp?: (a: T, b: T) => number) {
        this.cmp = cmp;
        this.heap = [];
    }

    public peek(): T | undefined {
        if (this.isEmpty()) return undefined;
        return this.cmp
            ? (this.heap as T[])[0]
            : (this.heap as HeapNode<T>[])[0].item;
    }

    push(item: T, priority?: number): void {
        if (this.cmp) {
            if (priority !== undefined) {
                throw new Error(
                    "Cannot specify priority when using comparator"
                );
            }
            (this.heap as T[]).push(item);
        } else {
            if (priority === undefined) {
                throw new Error(
                    "Must specify priority when no comparator is provided"
                );
            }
            (this.heap as HeapNode<T>[]).push({ item, priority });
        }
        this.bubbleUp(this.heap.length - 1);
    }

    pop(): T | undefined {
        if (this.heap.length === 0) return undefined;

        const top = this.cmp
            ? (this.heap as T[])[0]
            : (this.heap as HeapNode<T>[])[0].item;

        const end = this.heap.pop()!;

        if (this.heap.length > 0) {
            this.heap[0] = end;
            this.bubbleDown(0);
        }

        return top;
    }

    isEmpty(): boolean {
        return this.heap.length === 0;
    }

    private compare(i: number, j: number): number {
        if (this.cmp) {
            const h = this.heap as T[];
            return this.cmp(h[i], h[j]);
        } else {
            const h = this.heap as HeapNode<T>[];
            return h[i].priority - h[j].priority;
        }
    }

    private bubbleUp(idx: number): void {
        while (idx > 0) {
            const parentIdx = Math.floor((idx - 1) / 2);

            if (this.compare(idx, parentIdx) >= 0) break;

            // swap elements
            [this.heap[idx], this.heap[parentIdx]] = [
                this.heap[parentIdx],
                this.heap[idx],
            ];
            idx = parentIdx;
        }
    }

    private bubbleDown(idx: number): void {
        const length = this.heap.length;

        while (true) {
            let smallest = idx;
            const left = 2 * idx + 1;
            const right = 2 * idx + 2;

            if (left < length && this.compare(left, smallest) < 0) {
                smallest = left;
            }

            if (right < length && this.compare(right, smallest) < 0) {
                smallest = right;
            }

            if (smallest === idx) break;

            // swap elements
            [this.heap[idx], this.heap[smallest]] = [
                this.heap[smallest],
                this.heap[idx],
            ];
            idx = smallest;
        }
    }
}
