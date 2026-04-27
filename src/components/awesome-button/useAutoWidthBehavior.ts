import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import type { AwesomeButtonProps } from '../../types';
import { getAutoTextTransitionFlow } from './autoWidthMeasurement';
import { useAutoWidthMeasurement } from './useAutoWidthMeasurement';
import { useTextTransition } from './useTextTransition';
import type { AutoTextTransitionState } from './types';

type UseAutoWidthBehaviorParams = {
  props: Readonly<AwesomeButtonProps>;
  rawStringSlotValue: ComputedRef<string | null>;
  shouldSnapAutoWidth: ComputedRef<boolean>;
  isPlaceholder: ComputedRef<boolean>;
  isIconOnly: ComputedRef<boolean>;
  hasBeforeSlot: ComputedRef<boolean>;
  hasDefaultSlot: ComputedRef<boolean>;
  hasAfterSlot: ComputedRef<boolean>;
};

type UseAutoWidthBehaviorResult = {
  contentRef: Ref<HTMLSpanElement | null>;
  labelRef: Ref<HTMLSpanElement | null>;
  autoWidthReady: Ref<boolean>;
  autoWidthTransitioning: Ref<boolean>;
  contentInlineStyle: ComputedRef<string | undefined>;
  labelInlineStyle: ComputedRef<string | undefined>;
  slotString: Ref<string | null>;
  displayedText: Ref<string | null>;
  shouldRenderAnimatedText: ComputedRef<boolean>;
  shouldRenderLabel: ComputedRef<boolean>;
};

export function useAutoWidthBehavior({
  props,
  rawStringSlotValue,
  shouldSnapAutoWidth,
  isPlaceholder,
  isIconOnly,
  hasBeforeSlot,
  hasDefaultSlot,
  hasAfterSlot,
}: UseAutoWidthBehaviorParams): UseAutoWidthBehaviorResult {
  const textTransition = useTextTransition();
  const autoTextTransitionState = ref<AutoTextTransitionState | null>(null);
  const autoTextTransitionRunId = ref(0);

  const shouldRenderAnimatedText = computed(
    () => props.textTransition === true && textTransition.slotString.value != null
  );
  const shouldRenderLabel = computed(
    () => shouldRenderAnimatedText.value === true || hasDefaultSlot.value === true
  );
  const autoWidthContentSignature = computed(() => {
    if (!shouldSnapAutoWidth.value) {
      return null;
    }

    return [
      `placeholder:${isPlaceholder.value}`,
      `iconOnly:${isIconOnly.value}`,
      `before:${hasBeforeSlot.value}`,
      `default:${hasDefaultSlot.value}`,
      `after:${hasAfterSlot.value}`,
      `text:${rawStringSlotValue.value ?? ''}`,
    ].join('||');
  });

  const autoWidth = useAutoWidthMeasurement({
    props,
    shouldSnapAutoWidth,
    autoWidthContentSignature,
    getMeasurementLabelText: getAutoWidthMeasurementLabelText,
    onAfterSizeWrite: advanceAutoTextChoreographyAfterSizeWrite,
    onMeasurementDisabled: clearAutoTextTransitionState,
    shouldSuppressMeasure: shouldSuppressAutoWidthMeasureForTextTransition,
  });

  function clearAutoTextTransitionState() {
    autoTextTransitionRunId.value += 1;
    autoTextTransitionState.value = null;
    textTransition.clearTextTransitionDelayRaf();
  }

  function isAutoTextChoreographyActive() {
    return autoTextTransitionState.value != null;
  }

  function shouldSuppressAutoWidthMeasureForTextTransition() {
    return (
      shouldSnapAutoWidth.value === true &&
      props.textTransition === true &&
      (isAutoTextChoreographyActive() || textTransition.isTextTransitionRunning())
    );
  }

  function getAutoWidthMeasurementLabelText() {
    const state = autoTextTransitionState.value;

    if (
      props.textTransition !== true ||
      shouldSnapAutoWidth.value !== true ||
      state?.phase !== 'grow-sizing' ||
      textTransition.slotString.value == null
    ) {
      return null;
    }

    return state.targetText;
  }

  function finishAutoTextChoreography() {
    autoTextTransitionState.value = null;
    autoWidth.replayDeferredAutoWidthMeasure();
  }

  function completeGrowTextPhase(runId: number) {
    const latestState = autoTextTransitionState.value;

    if (
      latestState == null ||
      latestState.runId !== runId ||
      latestState.phase !== 'grow-text'
    ) {
      return;
    }

    finishAutoTextChoreography();
  }

  function startGrowTextPhase(runId: number) {
    textTransition.scheduleTextTransitionDelay(() => {
      const state = autoTextTransitionState.value;

      if (state == null || state.runId !== runId || state.phase !== 'grow-sizing') {
        return;
      }

      autoTextTransitionState.value = {
        ...state,
        phase: 'grow-text',
      };

      textTransition.startTextTransitionTo(state.targetText, () =>
        completeGrowTextPhase(runId)
      );
    });
  }

  function completeShrinkTextPhase(runId: number) {
    const latestState = autoTextTransitionState.value;

    if (
      latestState == null ||
      latestState.runId !== runId ||
      latestState.phase !== 'shrink-text'
    ) {
      return;
    }

    autoTextTransitionState.value = {
      ...latestState,
      phase: 'shrink-sizing',
    };
    autoWidth.updateAutoWidths(latestState.targetWidths);
  }

  function advanceAutoTextChoreographyAfterSizeWrite() {
    const activeState = autoTextTransitionState.value;

    if (activeState != null) {
      if (activeState.phase === 'grow-sizing') {
        startGrowTextPhase(activeState.runId);
        return;
      }

      if (activeState.phase === 'shrink-sizing') {
        finishAutoTextChoreography();
        return;
      }

      return;
    }

    autoWidth.replayDeferredAutoWidthMeasure();
  }

  function setImmediateText(nextString: string | null) {
    textTransition.targetText.value = nextString;
    textTransition.setDisplayedText(nextString);
  }

  function syncTextTransitionState(nextString = rawStringSlotValue.value) {
    textTransition.slotString.value = nextString;

    if (props.textTransition !== true || nextString == null) {
      textTransition.clearTextTransitionRaf();
      clearAutoTextTransitionState();
      setImmediateText(nextString);
      return;
    }

    if (textTransition.displayedText.value == null) {
      clearAutoTextTransitionState();
      setImmediateText(nextString);
      return;
    }

    if (
      textTransition.targetText.value === nextString &&
      (autoTextTransitionState.value?.targetText === nextString ||
        textTransition.isTextTransitionRunning() ||
        textTransition.displayedText.value === nextString)
    ) {
      return;
    }

    if (typeof window === 'undefined') {
      clearAutoTextTransitionState();
      setImmediateText(nextString);
      return;
    }

    textTransition.clearTextTransitionRaf();
    clearAutoTextTransitionState();

    if (shouldSnapAutoWidth.value) {
      textTransition.targetText.value = nextString;
      const targetWidths = autoWidth.getMeasuredAutoWidthsForText(nextString);
      const flow = getAutoTextTransitionFlow(autoWidth.autoWidths.value, targetWidths);

      if (targetWidths == null || flow == null) {
        textTransition.startTextTransitionTo(
          nextString,
          autoWidth.scheduleAutoWidthMeasure
        );
        return;
      }

      if (flow === 'text-only') {
        textTransition.startTextTransitionTo(nextString);
        return;
      }

      const runId = autoTextTransitionRunId.value + 1;

      autoTextTransitionRunId.value = runId;
      autoTextTransitionState.value = {
        targetText: nextString,
        phase: flow === 'grow-first' ? 'grow-sizing' : 'shrink-text',
        runId,
        targetWidths,
      };

      if (flow === 'grow-first') {
        autoWidth.updateAutoWidths(targetWidths);
        return;
      }

      textTransition.startTextTransitionTo(nextString, () =>
        completeShrinkTextPhase(runId)
      );
      return;
    }

    autoTextTransitionState.value = null;
    textTransition.startTextTransitionTo(nextString);
  }

  watch(
    [rawStringSlotValue, () => props.textTransition],
    ([nextString]) => {
      syncTextTransitionState(nextString);
    },
    {
      immediate: true,
    }
  );

  return {
    contentRef: autoWidth.contentRef,
    labelRef: autoWidth.labelRef,
    autoWidthReady: autoWidth.autoWidthReady,
    autoWidthTransitioning: autoWidth.autoWidthTransitioning,
    contentInlineStyle: autoWidth.contentInlineStyle,
    labelInlineStyle: autoWidth.labelInlineStyle,
    slotString: textTransition.slotString,
    displayedText: textTransition.displayedText,
    shouldRenderAnimatedText,
    shouldRenderLabel,
  };
}
