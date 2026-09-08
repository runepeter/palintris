import type { Level } from '../core/level';
import data from './campaign.v1.json';

export interface CampaignContent {
  readonly contentVersion: number;
  readonly levels: readonly Level[];
}

// JSON-typen er strukturelt lik Level, men kommando-unionen blir til string i JSON-typen.
export const CAMPAIGN: CampaignContent = data as unknown as CampaignContent;

const byId = new Map(CAMPAIGN.levels.map((l) => [l.id, l]));

export const getCampaignLevel = (id: string): Level | undefined => byId.get(id);
