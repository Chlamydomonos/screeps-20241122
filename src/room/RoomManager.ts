import { AIManager } from '../base/AI';
import { RoomAI } from './RoomAI';

export class RoomManager extends AIManager<Room, RoomAI> {
    static readonly INSTANCE = new RoomManager();
    private constructor() {
        super();
    }
}
