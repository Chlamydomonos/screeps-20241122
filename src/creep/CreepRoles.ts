import { EarlyHarvester } from './roles/EarlyHarvester';
import { EarlyUpgrader } from './roles/EarlyUpgrader';

export const CreepRoles = {
    EarlyHarvester,
    EarlyUpgrader,
};

export type CreepRoleName = keyof typeof CreepRoles;
