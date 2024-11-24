import _ from 'lodash';
import { CreepAI } from '../creep/CreepAI';
import { RoomAI } from './RoomAI';

export interface CreepMovementRequest {
    creep: CreepAI;
    x: number;
    y: number;
    direction: DirectionConstant;
    priority: number;
}

export interface DodgeRequest {
    from: CreepAI;
    x: number;
    y: number;
    direction: DirectionConstant;
    priority: number;
}

export class CreepMovementManager {
    constructor(readonly room: RoomAI) {}

    private get requests() {
        return this.room.value!.creepMoveRequests();
    }

    getRequests(x: number, y: number) {
        if (!this.requests[x]) {
            this.requests[x] = {};
        }

        if (!this.requests[x][y]) {
            this.requests[x][y] = [];
        }

        return this.requests[x][y];
    }

    maxRequestOf(x: number, y: number) {
        const requests = this.getRequests(x, y);
        if (requests.length == 0) {
            return -1;
        }
        return _.maxBy(requests, (r) => r.priority);
    }

    static handleRequests(room: Room) {
        const requests = room.creepMoveRequests();
        for (const x in requests) {
            for (const y in requests[x]) {
                const requestList = requests[x][y];
                if (requestList.length > 0) {
                    const sorted = requestList.sort((a, b) => b.priority - a.priority);
                    const highest = sorted[0];
                    highest.creep.value!.move(highest.direction);
                }
            }
        }
    }

    onRequest(creep: CreepAI, direction: DirectionConstant, priority: number) {
        const pos = creep.value!.pos;
        const newPos = pos.offset(direction);
        if (newPos) {
            const hasCreep = Game.rooms[newPos.roomName].lookForAt(LOOK_CREEPS, newPos.x, newPos.y);
            for (const theCreep of hasCreep) {
                if (theCreep.my) {
                    theCreep.getDodgeRequests().push({
                        from: creep,
                        x: pos.x,
                        y: pos.y,
                        direction,
                        priority,
                    });
                }
            }

            const requests = this.getRequests(pos.x, pos.y);
            requests.push({
                creep,
                x: newPos.x,
                y: newPos.y,
                direction,
                priority,
            });
        }
    }
}
