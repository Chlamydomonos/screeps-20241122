import { AIManager } from '../base/AI';
import { RoomAI } from './RoomAI';

export class RoomManager extends AIManager<Room, RoomAI, undefined, undefined> {
    private constructor() {
        super('RoomManager', undefined, undefined);
    }
    static readonly INSTANCE = new RoomManager();
}
