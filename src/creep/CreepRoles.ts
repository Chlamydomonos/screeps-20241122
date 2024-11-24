import { Carrier } from './roles/Carrier';
import { EarlyBuilder } from './roles/EarlyBuilder';
import { EarlyHarvester } from './roles/EarlyHarvester';
import { EarlyUpgrader } from './roles/EarlyUpgrader';

export const CreepRoles = {
    EarlyHarvester,
    EarlyUpgrader,
    EarlyBuilder,
    Carrier,
};

export type CreepRoleName = keyof typeof CreepRoles;
