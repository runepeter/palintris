import type { Command } from '../core/commands';

export type IntroMechanic = 'swap' | 'rotate' | 'mirror' | 'locked' | 'wild' | 'remove';

/** gesture styrer glyfen og retningen den animeres i; se IntroOverlay. */
export interface IntroSpec {
  readonly id: string;
  readonly mechanic: IntroMechanic;
  readonly title: string;
  readonly text: string;
  readonly gesture: 'drag' | 'hold' | 'tap' | 'dragHand';
}

/** Første nivå i hver verden lærer bort én ting. Rekkefølgen er verdenes. */
export const INTROS: readonly IntroSpec[] = [
  { id: 'w1-01', mechanic: 'swap', title: 'Bytt naboer', text: 'Dra en brikke over på naboen', gesture: 'drag' },
  {
    id: 'w2-01',
    mechanic: 'rotate',
    title: 'Roter en bit',
    text: 'Hold på en brikke og dra over flere, velg ⟲ eller ⟳',
    gesture: 'hold',
  },
  { id: 'w3-01', mechanic: 'mirror', title: 'Speil en bit', text: 'Hold og dra over minst tre, velg ⇋', gesture: 'hold' },
  { id: 'w4-01', mechanic: 'locked', title: 'Låste brikker', text: 'Låste brikker flytter seg ikke. Jobb rundt dem', gesture: 'tap' },
  { id: 'w5-01', mechanic: 'wild', title: 'Joker', text: 'Dra jokeren fra hånden inn i et mellomrom', gesture: 'dragHand' },
  { id: 'w5-02', mechanic: 'remove', title: 'Fjern en brikke', text: 'Dra en brikke ned i hånden for å fjerne den', gesture: 'dragHand' },
];

export const introFor = (levelId: string): IntroSpec | null => INTROS.find((s) => s.id === levelId) ?? null;

/** Sant når kommandoen er den mekanikken introen viser. Låste brikker læres av å prøve, så der teller alt. */
export const introSatisfiedBy = (spec: IntroSpec, cmd: Command): boolean => {
  switch (spec.mechanic) {
    case 'swap':
      return cmd.type === 'swap';
    case 'rotate':
      return cmd.type === 'rotate';
    case 'mirror':
      return cmd.type === 'mirror';
    case 'wild':
      return cmd.type === 'insertWild';
    case 'remove':
      return cmd.type === 'remove';
    case 'locked':
      return true;
  }
};
