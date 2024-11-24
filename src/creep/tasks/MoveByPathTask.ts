import { CreepAI } from '../CreepAI';
import { CreepTask, CreepTaskResult, CreepTaskStatus } from '../CreepTask';

export enum MoveFailure {
    STUCK,
    NOT_IN_PATH,
    UNKNOWN,
}

/**
 * # 根据路径移动
 *
 * 在此任务下，creep根据路径移动。如果creep被障碍物阻挡的时间超过`stuckTimeout`或者不在指定路径上，任务失败。
 */
export class MoveByPathTask extends CreepTask<MoveFailure> {
    private hasSucceeded = false;
    private hasFailed = false;

    private oldX: number;
    private oldY: number;
    private lastMoved = false;

    stuckTime = 0;

    constructor(
        readonly creep: CreepAI,
        readonly path: PathStep[],
        readonly priority: number = 1000,
        readonly stuckTimeout: number = 5
    ) {
        super(creep);
        const pos = creep.value!.pos;
        this.oldX = pos.x;
        this.oldY = pos.y;
    }

    override tick(): CreepTaskResult<MoveFailure> {
        if (this.hasSucceeded) {
            return { status: CreepTaskStatus.SUCCESS };
        }
        if (this.hasFailed) {
            return { status: CreepTaskStatus.FAIL, reason: MoveFailure.UNKNOWN };
        }

        if (!this.path || this.path.length == 0) {
            return { status: CreepTaskStatus.SUCCESS };
        }

        const lastElem = this.path[this.path.length - 1];
        const targetX = lastElem.x;
        const targetY = lastElem.y;
        const pos = this.creep.value!.pos;
        const currentX = pos.x;
        const currentY = pos.y;

        if (currentX == targetX && currentY == targetY) {
            this.hasSucceeded = true;
            return { status: CreepTaskStatus.SUCCESS };
        }

        if (this.lastMoved && currentX == this.oldX && currentY == this.oldY) {
            this.stuckTime++;
            if (this.stuckTime > this.stuckTimeout) {
                this.hasFailed = true;
                return { status: CreepTaskStatus.FAIL, reason: MoveFailure.STUCK };
            }
        }

        this.oldX = currentX;
        this.oldY = currentY;

        let stepToGo: PathStep | undefined;
        for (const step of this.path) {
            if (step.x - step.dx == currentX && step.y - step.dy == currentY) {
                stepToGo = step;
                break;
            }
        }

        if (!stepToGo) {
            this.hasFailed = true;
            return { status: CreepTaskStatus.FAIL, reason: MoveFailure.NOT_IN_PATH };
        }

        const code = this.creep.requestMove(stepToGo.direction, this.priority);
        this.lastMoved = code == OK;
        return { status: CreepTaskStatus.IN_PROGRESS };
    }
}
