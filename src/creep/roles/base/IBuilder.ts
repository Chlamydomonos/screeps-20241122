import { BuilderTask } from '../../../room/BuilderTask';

export interface IBuilder {
    taskCount: number;
    addTask(task: BuilderTask): void;
}
