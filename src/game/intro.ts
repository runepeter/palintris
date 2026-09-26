import type { Command } from '../core/commands';

export type IntroMechanic = 'swap' | 'rotate' | 'mirror' | 'locked' | 'wild' | 'remove';

/** gesture styrer glyfen og retningen den animeres i; se IntroOverlay. */
export interface IntroSpec {
  readonly id: string;
  readonly mechanic: IntroMechanic;
  readonly title: string;
  readonly text: string;
  readonly compactText?: string;
  readonly gesture: 'drag' | 'hold' | 'tap' | 'dragHand';
  /** Mekanikk introbrettet krever før dens egen intro, og som teksten derfor også forklarer. */
  readonly alsoTeaches?: readonly IntroMechanic[];
}

/** Første nivå i hver verden lærer bort én ting. Rekkefølgen er verdenes. */
export const INTROS: readonly IntroSpec[] = [
  {
    id: 'w1-01', mechanic: 'swap', title: 'Bytt naboer',
    text: 'Rekken skal være lik fra begge sider.\nDra tredje brikke mot høyre.',
    compactText: 'Lik begge veier. Dra brikke 3 mot høyre.', gesture: 'drag',
  },
  {
    id: 'w2-01',
    mechanic: 'rotate',
    title: 'Roter en bit',
    text: 'Hold på en brikke og dra over flere, velg ⟲ eller ⟳',
    gesture: 'hold',
  },
  { id: 'w3-01', mechanic: 'mirror', title: 'Speil en bit', text: 'Hold og dra over minst tre, velg ⇋', gesture: 'hold' },
  { id: 'w4-01', mechanic: 'locked', title: 'Låste brikker', text: 'Låste brikker flytter seg ikke. Jobb rundt dem', gesture: 'tap' },
  {
    id: 'w5-01', mechanic: 'wild', title: 'Joker og Fjern',
    text: 'Dra jokeren fra hånden inn i et mellomrom.\nDu trenger også Fjern: dra en brikke ned.',
    compactText: 'Joker inn i et mellomrom. Brikke ned i Fjern.', gesture: 'dragHand', alsoTeaches: ['remove'],
  },
  { id: 'w5-02', mechanic: 'remove', title: 'Fjern en brikke', text: 'Dra en brikke ned i hånden for å fjerne den', gesture: 'dragHand' },
  { id: 'journey-quota-01', mechanic: 'swap', title: 'To flytt', text: 'Tallet følger brikken. Hver flytting bruker én. Ved 0 må brikken bli stående.', compactText: 'Tallet følger brikken. Ved 0 kan den ikke flyttes.', gesture: 'drag' },
  { id: 'journey-quota-02', mechanic: 'swap', title: 'Spar flyttene', text: 'Den merkede brikken har to flytt. Planlegg hvor den skal ende.', gesture: 'drag' },
  { id: 'journey-center-01', mechanic: 'swap', title: 'Din midtbrikke', text: 'Alle speil teller. Få et ekstra merke med akkurat den merkede brikken i midten.', compactText: 'Alle speil teller. Merket brikke i midten gir bonus.', gesture: 'drag' },
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
