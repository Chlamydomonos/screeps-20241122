import { GlobalNamePool } from '../../global/GlobalNamePool';
import { RoomAI } from '../RoomAI';
import { RoomObjectAI, RoomObjectAIManager } from '../RoomObjectAI';

export interface ContainerRequest {
    id: number;
    container: ContainerAI;
    amount: number;
}

export class ContainerAI extends RoomObjectAI<StructureContainer, ContainerManager, undefined> {
    private constructor(container: StructureContainer, manager: ContainerManager) {
        super(container, manager, () => undefined, []);
    }

    static of(container: StructureContainer, manager: ContainerManager) {
        return manager.getOrCreateAI(container.id, container, (container) => new ContainerAI(container, manager));
    }

    energyRequested = 0;
    private requests: Record<number, ContainerRequest> = {};

    get energyFree() {
        return this.value!.store.energy - this.energyRequested;
    }

    requestEnergy(amount: number) {
        if (this.energyFree < amount) {
            return undefined;
        }

        this.energyRequested += amount;
        const request = {
            id: GlobalNamePool.INSTANCE.genId(),
            container: this,
            amount,
        };
        this.requests[request.id] = request;
        return request;
    }

    fulfillRequest(request: ContainerRequest, creep: Creep) {
        creep.withdraw(this.value!, RESOURCE_ENERGY, request.amount);
        delete this.requests[request.id];
        this.energyRequested -= request.amount;
    }
}

export class ContainerManager extends RoomObjectAIManager<StructureContainer, ContainerAI, undefined, undefined> {
    constructor(readonly room: RoomAI) {
        super('ContainerManager', undefined, undefined);
    }

    protected override initSelf() {
        const containers = this.room.value!.find(FIND_STRUCTURES, {
            filter: (s) => s.structureType == STRUCTURE_CONTAINER,
        });

        for (const container of containers) {
            ContainerAI.of(container, this);
        }
    }

    requestEnergy(amount: number) {
        for (const name in this.ais) {
            const ai = this.ais[name];
            const request = ai.requestEnergy(amount);
            if (request) {
                return request;
            }
        }
        return undefined;
    }
}
