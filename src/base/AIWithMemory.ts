import { AI, AIManager } from './AI';

export class AIWithMemory<T extends { memory: any }, M extends AIManager<T> = AIManager<T>> extends AI<
    T,
    M,
    T['memory']
> {
    override get memory() {
        return this.value!.memory;
    }
}
