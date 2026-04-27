import { onBeforeUnmount, ref, type Ref } from 'vue';
import {
  TEXT_TRANSITION_DURATION,
  buildTextTransitionFrame,
  type TextTransitionFrame,
} from './textTransitionFrame';

type UseTextTransitionResult = {
  slotString: Ref<string | null>;
  displayedText: Ref<string | null>;
  targetText: Ref<string | null>;
  clearTextTransitionDelayRaf: () => void;
  clearTextTransitionRaf: () => void;
  isTextTransitionRunning: () => boolean;
  scheduleTextTransitionDelay: (callback: () => void) => void;
  setDisplayedText: (value: string | null) => void;
  startTextTransitionTo: (nextString: string, onComplete?: () => void) => void;
};

export function useTextTransition(): UseTextTransitionResult {
  const slotString = ref<string | null>(null);
  const displayedText = ref<string | null>(null);
  const targetText = ref<string | null>(null);
  const textTransitionRafId = ref<number | null>(null);
  const textTransitionDelayRafId = ref<number | null>(null);

  function clearTextTransitionRaf() {
    if (textTransitionRafId.value !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(textTransitionRafId.value);
      textTransitionRafId.value = null;
    }
  }

  function clearTextTransitionDelayRaf() {
    if (textTransitionDelayRafId.value !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(textTransitionDelayRafId.value);
      textTransitionDelayRafId.value = null;
    }
  }

  function isTextTransitionRunning() {
    return textTransitionRafId.value !== null;
  }

  function setDisplayedText(value: string | null) {
    displayedText.value = value;
  }

  function scheduleTextTransitionDelay(callback: () => void) {
    if (typeof window === 'undefined') {
      callback();
      return;
    }

    clearTextTransitionDelayRaf();
    textTransitionDelayRafId.value = window.requestAnimationFrame(() => {
      textTransitionDelayRafId.value = null;
      callback();
    });
  }

  function startTextTransitionTo(nextString: string, onComplete?: () => void) {
    const transitionFrame: TextTransitionFrame = {
      from: displayedText.value ?? '',
      to: nextString,
      startedAt:
        typeof window.performance?.now === 'function'
          ? window.performance.now()
          : Date.now(),
    };

    targetText.value = nextString;
    clearTextTransitionRaf();

    const tick = (timestamp: number) => {
      const elapsed = Math.max(0, timestamp - transitionFrame.startedAt);
      const progress = Math.min(1, elapsed / TEXT_TRANSITION_DURATION);

      if (progress >= 1) {
        textTransitionRafId.value = null;
        setDisplayedText(transitionFrame.to);
        onComplete?.();
        return;
      }

      setDisplayedText(
        buildTextTransitionFrame(transitionFrame.from, transitionFrame.to, progress)
      );

      textTransitionRafId.value = window.requestAnimationFrame(tick);
    };

    textTransitionRafId.value = window.requestAnimationFrame(tick);
  }

  onBeforeUnmount(() => {
    clearTextTransitionRaf();
    clearTextTransitionDelayRaf();
  });

  return {
    slotString,
    displayedText,
    targetText,
    clearTextTransitionDelayRaf,
    clearTextTransitionRaf,
    isTextTransitionRunning,
    scheduleTextTransitionDelay,
    setDisplayedText,
    startTextTransitionTo,
  };
}
