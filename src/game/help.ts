import type { OpName } from '../core/rules';
import type { IntroSpec } from './intro';

export const HELP_ID = 'help';

/**
 * Hjelpepanelet for brettets tillatte verktøy, vist i introoverlayet. «locked» som mekanikk
 * gjør at første godtatte trekk lukker panelet, akkurat som en intro.
 */
export const helpSpec = (ops: ReadonlySet<OpName>): IntroSpec => {
  const segment = ops.has('rotate') || ops.has('mirror');
  const swap = ops.has('swap');
  const wild = ops.has('insertWild');
  const remove = ops.has('remove');
  const move = segment && swap ? 'Bytt: dra til naboen. Utsnitt: hold og dra.'
    : segment ? 'Utsnitt: hold og dra over flere brikker.'
      : swap ? 'Dra en brikke til naboen for å bytte.' : null;
  const hand = wild && remove ? 'Joker til et mellomrom. Brikke ned i Fjern.'
    : wild ? 'Dra jokeren fra hånden til et mellomrom.'
      : remove ? 'Dra en brikke ned i Fjern for å fjerne den.' : null;
  const goal = 'Rekken skal være lik fra begge sider.';
  const compact = wild && remove ? 'Joker til mellomrom. Brikke ned i Fjern.'
    : wild ? 'Dra jokeren fra hånden til et mellomrom.'
      : remove ? 'Dra en brikke ned i Fjern.'
        : segment ? 'Bytt: dra til nabo. Utsnitt: hold og dra.' : 'Dra en brikke til naboen. Lik begge veier.';
  return {
    id: HELP_ID,
    mechanic: 'locked',
    title: 'Slik spiller du',
    text: [move, hand ?? goal].filter((line): line is string => line !== null).join('\n'),
    compactText: compact,
    gesture: segment ? 'hold' : hand !== null ? 'dragHand' : 'drag',
  };
};
