import { EMPTY_ACCESS, isLevelUnlocked, isWorldMastered, isWorldUnlocked, levelId, LEVELS_PER_WORLD, solvedInWorld, WORLD_COUNT, WORLD_GATE, type StarMap, type CampaignAccess } from '../core/progression';
import { INTROS } from './intro';

/** Velger alltid et tilgjengelig, uløst brett i den lengst åpnede verdenen. */
export const journeyDestination = (stars: StarMap, access: CampaignAccess = EMPTY_ACCESS): string => {
  for (let world = WORLD_COUNT; world >= 1; world--) {
    if (!isWorldUnlocked(world, stars, access) || isWorldMastered(world, stars, access)) continue;
    for (let n = 1; n <= LEVELS_PER_WORLD; n++) {
      const id = levelId(world, n);
      if ((stars[id] ?? 0) <= 0 && isLevelUnlocked(id, stars, access)) return id;
    }
  }
  return levelId(WORLD_COUNT, LEVELS_PER_WORLD);
};

export const journeyComplete = (stars: StarMap, access: CampaignAccess = EMPTY_ACCESS): boolean => {
  for (let world = 1; world <= WORLD_COUNT; world++) {
    if (solvedInWorld(world, stars) < LEVELS_PER_WORLD && !isWorldMastered(world, stars, access)) return false;
  }
  return true;
};

export interface JourneyMilestone {
  readonly title: string;
  readonly detail: string;
}

/** Introene beskriver de faktiske mekanikkene i det eksisterende kampanjeinnholdet. */
export const nextJourneyMilestone = (stars: StarMap, access: CampaignAccess = EMPTY_ACCESS): JourneyMilestone => {
  const milestones = [
    ...INTROS.map((intro) => ({ id: intro.id, title: intro.title })),
    { id: 'w6-01', title: 'Harmoniens port' },
  ];
  const next = milestones.find(({ id }) => (stars[id] ?? 0) <= 0);
  if (next === undefined) {
    const destination = journeyDestination(stars, access);
    const parsed = /^w(\d)-(\d+)$/.exec(destination);
    if ((stars[destination] ?? 0) <= 0 && parsed !== null) {
      return { title: `Neste: Verden ${Number(parsed[1])}, nivå ${Number(parsed[2])}`, detail: 'Alle mekanikker er åpnet. Fullfør neste speil.' };
    }
    return { title: 'Reisen fullført', detail: 'Spill bonusbrett eller samle flere stjerner på kartet.' };
  }
  const world = Number(next.id[1]);
  const n = Number(next.id.slice(3));
  if (isLevelUnlocked(next.id, stars, access)) return { title: `Neste: ${next.title}`, detail: `Åpent nå · Verden ${world}, nivå ${n}` };
  if (!isWorldUnlocked(world, stars, access)) {
    const solved = solvedInWorld(world - 1, stars);
    if (access.offeredCheckpoints.includes(levelId(world - 1, LEVELS_PER_WORLD))) {
      return { title: `Neste: ${next.title}`, detail: `Bestå mestringsprøven, eller åpne ${WORLD_GATE} speil · ${solved}/${WORLD_GATE}` };
    }
    return { title: `Neste: ${next.title}`, detail: `Verden ${world} åpnes ved ${WORLD_GATE} av ${LEVELS_PER_WORLD} speil i verden ${world - 1} · ${solved}/${WORLD_GATE}` };
  }
  return { title: `Neste: ${next.title}`, detail: `Fullfør nivå ${n - 1} i verden ${world} for å åpne nivå ${n}` };
};


export const journeyNextLevel = (stars: StarMap, access: CampaignAccess = EMPTY_ACCESS): string | null =>
  journeyComplete(stars, access) ? null : journeyDestination(stars, access);
