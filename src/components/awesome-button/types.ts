import type { ComponentPublicInstance } from 'vue';
import type {
  AwesomeButtonProps,
  ButtonPressEvent,
  ButtonReleasedPayload,
} from '../../types';

export type PointerZone = 'left' | 'middle' | 'right';
export type PressPhase = 'idle' | 'pressed' | 'locked' | 'releasing';

export type AutoWidthValues = {
  content: number | null;
  label: number | null;
};

export type AutoTextTransitionFlow = 'grow-first' | 'text-first' | 'text-only';

export type AutoTextTransitionPhase =
  | 'grow-sizing'
  | 'grow-text'
  | 'shrink-text'
  | 'shrink-sizing';

export type AutoTextTransitionState = {
  targetText: string;
  targetWidths: AutoWidthValues;
  phase: AutoTextTransitionPhase;
  runId: number;
};

export type AutoWidthInlineStyleSnapshot = {
  contentWidth: string;
  contentFlexBasis: string;
  contentFlexGrow: string;
  contentFlexShrink: string;
  contentTransition: string;
  labelWidth: string;
  labelFlexBasis: string;
  labelFlexGrow: string;
  labelFlexShrink: string;
  labelTransition: string;
};

export type AwesomeButtonEmit = {
  (event: 'press', eventObject: ButtonPressEvent): void;
  (event: 'pressed', eventObject: ButtonPressEvent): void;
  (event: 'released', payload: ButtonReleasedPayload): void;
};

export type AwesomeButtonRootRefValue = HTMLElement | ComponentPublicInstance | null;

export type AwesomeButtonReadonlyProps = Readonly<AwesomeButtonProps>;
