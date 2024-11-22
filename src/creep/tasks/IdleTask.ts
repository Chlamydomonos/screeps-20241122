import { CreepTask, CreepTaskStatus } from '../CreepTask';

/**
 * # 闲置任务
 *
 * 在此任务下，creep将会闲置，不做任何工作。
 */
export class IdleTask extends CreepTask {
    override tick() {
        return { status: CreepTaskStatus.IN_PROGRESS };
    }
}
