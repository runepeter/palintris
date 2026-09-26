import { isLevelUnlocked, isWorldUnlocked, levelId, LEVELS_PER_WORLD, solvedInWorld, WORLD_COUNT, WORLD_GATE, type StarMap } from '../core/progression';
import { INTROS } from './intro';

/** Velger alltid et tilgjengelig, uløst brett i den lengst åpnede verdenen. */
export const journeyDestination = (stars: StarMap): string => {
  for (let world = WORLD_COUNT; world >= 1; world--) {
    if (!isWorldUnlocked(world, stars)) continue;
    for (let n = 1; n <= LEVELS_PER_WORLD; n++) {
      const id = levelId(world, n);
      if ((stars[id] ?? 0) <= 0 && isLevelUnlocked(id, stars)) return id;
    }
  }
  return levelId(WORLD_COUNT, LEVELS_PER_WORLD);
};

export const journeyComplete = (stars: StarMap): boolean => {
  for (let world = 1; world <= WORLD_COUNT; world++) {
    if (solvedInWorld(world, stars) < LEVELS_PER_WORLD) return false;
  }
  return true;
};

export interface JourneyMilestone {
  readonly title: string;
  readonly detail: string;
}

/** Introene beskriver de faktiske mekanikkene i det eksisterende kampanjeinnholdet. */
export const nextJourneyMilestone = (stars: StarMap): JourneyMilestone => {
  const milestones = [
    ...INTROS.map((intro) => ({ id: intro.id, title: intro.title })),
    { id: 'w6-01', title: 'Harmoniens port' },
  ];
  const next = milestones.find(({ id }) => (stars[id] ?? 0) <= 0);
  if (next === undefined) {
    const destination = journeyDestination(stars);
    const parsed = /^w(\d)-(\d+)$/.exec(destination);
    if ((stars[destination] ?? 0) <= 0 && parsed !== null) {
      return { title: `Neste: Verden ${Number(parsed[1])}, nivå ${Number(parsed[2])}`, detail: 'Alle mekanikker er åpnet. Fullfør neste speil.' };
    }
    return { title: 'Reisen fullført', detail: 'Alle speil er åpnet. Spill igjen for flere stjerner.' };
  }
  const world = Number(next.id[1]);
  const n = Number(next.id.slice(3));
  if (isLevelUnlocked(next.id, stars)) return { title: `Neste: ${next.title}`, detail: `Åpent nå · Verden ${world}, nivå ${n}` };
  if (!isWorldUnlocked(world, stars)) {
    const solved = solvedInWorld(world - 1, stars);
    return { title: `Neste: ${next.title}`, detail: `Verden ${world} åpnes ved ${WORLD_GATE} av ${LEVELS_PER_WORLD} speil i verden ${world - 1} · ${solved}/${WORLD_GATE}` };
  }
  return { title: `Neste: ${next.title}`, detail: `Fullfør nivå ${n - 1} i verden ${world} for å åpne nivå ${n}` };
};
