import { AI, AIManager } from './AI';

export class VirtualAI<M extends VirtualAIManager = VirtualAIManager, Me = any> extends AI<undefined, M, Me> {
    constructor(className: string, idGetter: () => string, manager: M, initMemory?: () => Me) {
        super(undefined, manager, idGetter, initMemory);
    }

    override get value() {
        return undefined;
    }

    override get alive() {
        return true;
    }
}

export class VirtualAIManager<T extends VirtualAI = VirtualAI<any>> extends AIManager<undefined, T> {}
