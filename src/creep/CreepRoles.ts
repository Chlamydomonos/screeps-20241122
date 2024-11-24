import { Carrier } from './roles/Carrier';
import { EarlyBuilder } from './roles/EarlyBuilder';
import { EarlyHarvester } from './roles/EarlyHarvester';
import { EarlyUpgrader } from './roles/EarlyUpgrader';
import { Harvester } from './roles/Harvester';

export const CreepRoles = {
    EarlyHarvester,
    EarlyUpgrader,
    EarlyBuilder,
    Harvester,
    Carrier,
};

export type CreepRoleName = keyof typeof CreepRoles;
