import type { OpName } from '../core/rules';
import type { SegmentAction } from './gestures';

export interface SegmentOption {
  readonly action: SegmentAction;
  readonly enabled: boolean;
}

export const segmentOptions = (allowed: ReadonlySet<OpName>, length: number): readonly SegmentOption[] => {
  const options: SegmentOption[] = [];
  if (allowed.has('rotate')) options.push({ action: 'rotateLeft', enabled: true });
  if (allowed.has('mirror')) options.push({ action: 'mirror', enabled: length >= 3 });
  if (allowed.has('rotate')) options.push({ action: 'rotateRight', enabled: true });
  return options;
};

export const operationSummary = (allowed: ReadonlySet<OpName>): string => {
  const labels: string[] = [];
  if (allowed.has('swap')) labels.push(allowed.size === 1 ? 'Bytt naboer' : 'Bytt');
  if (allowed.has('rotate')) labels.push('Roter');
  if (allowed.has('mirror')) labels.push('Speil');
  if (allowed.has('insertWild')) labels.push('Joker');
  if (allowed.has('remove')) labels.push('Fjern');
  return `Tillatt: ${labels.join(' · ')}`;
};
