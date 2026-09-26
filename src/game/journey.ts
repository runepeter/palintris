import { isJourneyTrialUnlocked, journeyTrial } from '../content/journeyTrials';
import { EMPTY_ACCESS, isLevelUnlocked, isWorldMastered, isWorldUnlocked, levelId, LEVELS_PER_WORLD, solvedInWorld, WORLD_COUNT, WORLD_GATE, type StarMap, type CampaignAccess } from '../core/progression';
import { INTROS } from './intro';

const newTrialDestination = (stars: StarMap, access: CampaignAccess): string | undefined =>
  ['journey-quota-01', 'journey-center-01'].find((id) => (stars[id] ?? 0) <= 0 && isJourneyTrialUnlocked(id, stars, access));

/** Velger et tilgjengelig, uløst brett i den lengst åpnede verdenen; når den er ferdig, restbrett fra laveste verden. */
export const journeyDestination = (stars: StarMap, access: CampaignAccess = EMPTY_ACCESS): string => {
  const intro = INTROS.find(({ id }) => id.startsWith('w') && (stars[id] ?? 0) <= 0 && isLevelUnlocked(id, stars, access));
  if (intro !== undefined) return intro.id;
  const trial = newTrialDestination(stars, access);
  if (trial !== undefined) return trial;
  const firstOpen = (world: number): string | undefined => {
    if (!isWorldUnlocked(world, stars, access) || isWorldMastered(world, stars, access)) return undefined;
    for (let n = 1; n <= LEVELS_PER_WORLD; n++) {
      const id = levelId(world, n);
      if ((stars[id] ?? 0) <= 0 && isLevelUnlocked(id, stars, access)) return id;
    }
    return undefined;
  };
  const worlds = Array.from({ length: WORLD_COUNT }, (_, i) => i + 1);
  const highest = Math.max(...worlds.filter((world) => isWorldUnlocked(world, stars, access)));
  // Etter fullført reise: et uspilt bonusbrett i en mestret verden før siste brett spilles om igjen.
  const bonus = (): string | undefined => worlds.flatMap((world) => Array.from({ length: LEVELS_PER_WORLD }, (_, i) => levelId(world, i + 1)))
    .find((id) => (stars[id] ?? 0) <= 0 && isLevelUnlocked(id, stars, access));
  return firstOpen(highest) ?? worlds.map(firstOpen).find((id) => id !== undefined) ?? bonus() ?? levelId(WORLD_COUNT, LEVELS_PER_WORLD);
};

export const journeyComplete = (stars: StarMap, access: CampaignAccess = EMPTY_ACCESS): boolean => {
  if (newTrialDestination(stars, access) !== undefined) return false;
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
  const destination = journeyDestination(stars, access);
  const trial = journeyTrial(destination);
  if (trial !== undefined) return { title: `Neste: ${trial.displayTitle}`, detail: trial.bonusGoal === undefined ? 'En brikke har et begrenset antall flytt.' : 'Lag et speil. Få bonus med den merkede brikken i midten.' };
  const milestones = [
    ...INTROS.filter((intro) => intro.id.startsWith('w')).map((intro) => ({ id: intro.id, title: intro.title })),
    { id: 'w6-01', title: 'Harmoniens port' },
  ];
  const next = milestones.find(({ id }) => (stars[id] ?? 0) <= 0);
  if (next === undefined) {
    const destination = journeyDestination(stars, access);
    const parsed = /^w(\d)-(\d+)$/.exec(destination);
    if (!journeyComplete(stars, access) && (stars[destination] ?? 0) <= 0 && parsed !== null) {
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
