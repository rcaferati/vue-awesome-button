import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue';
import type { AwesomeButtonProps } from '../../types';
import {
  AUTO_WIDTH_TRANSITION_FALLBACK_MS,
  DEFAULT_AUTO_WIDTHS,
  captureAutoWidthInlineStyleSnapshot,
  readClonedAutoWidths,
  readMeasuredAutoWidths,
  readSnappedWidth,
  restoreAutoWidthInlineStyles,
  restoreAutoWidthTransitionStart,
} from './autoWidthMeasurement';
import { isAutoWidthTransitionEnd } from './transitionEvents';
import type { AutoWidthValues } from './types';

type UseAutoWidthMeasurementParams = {
  props: Readonly<AwesomeButtonProps>;
  shouldSnapAutoWidth: ComputedRef<boolean>;
  autoWidthContentSignature: ComputedRef<string | null>;
  getMeasurementLabelText: () => string | null;
  onAfterSizeWrite: () => void;
  onMeasurementDisabled: () => void;
  shouldSuppressMeasure: () => boolean;
};

type UseAutoWidthMeasurementResult = {
  contentRef: Ref<HTMLSpanElement | null>;
  labelRef: Ref<HTMLSpanElement | null>;
  autoWidths: Ref<AutoWidthValues>;
  autoWidthReady: Ref<boolean>;
  autoWidthTransitioning: Ref<boolean>;
  contentInlineStyle: ComputedRef<string | undefined>;
  labelInlineStyle: ComputedRef<string | undefined>;
  getMeasuredAutoWidthsForText: (text: string) => AutoWidthValues | null;
  replayDeferredAutoWidthMeasure: () => void;
  scheduleAutoWidthMeasure: () => void;
  updateAutoWidths: (nextWidths: AutoWidthValues) => void;
};

export function useAutoWidthMeasurement({
  props,
  shouldSnapAutoWidth,
  autoWidthContentSignature,
  getMeasurementLabelText,
  onAfterSizeWrite,
  onMeasurementDisabled,
  shouldSuppressMeasure,
}: UseAutoWidthMeasurementParams): UseAutoWidthMeasurementResult {
  const contentRef = ref<HTMLSpanElement | null>(null);
  const labelRef = ref<HTMLSpanElement | null>(null);
  const autoWidths = ref<AutoWidthValues>({
    content: DEFAULT_AUTO_WIDTHS.content,
    label: DEFAULT_AUTO_WIDTHS.label,
  });
  const autoWidthReady = ref(false);
  const autoWidthTransitioning = ref(false);
  const deferredAutoWidthMeasureRequested = ref(false);
  const skipNextAutoWidthUpdatedMeasure = ref(false);
  const lastAutoWidthContentSignature = ref<string | null>(null);
  const autoWidthTransitionRunId = ref(0);
  const autoWidthRafId = ref<number | null>(null);
  const autoWidthTargetRafId = ref<number | null>(null);
  const resizeObserverRef = ref<ResizeObserver | null>(null);

  let autoWidthTransitionCleanup: (() => void) | null = null;
  let fontsReadyCancelled = false;

  const contentInlineStyle = computed(() => {
    if (!shouldSnapAutoWidth.value || autoWidths.value.content == null) {
      return undefined;
    }

    return [
      `width: ${autoWidths.value.content}px`,
      `flex-basis: ${autoWidths.value.content}px`,
      'flex-grow: 0',
      'flex-shrink: 0',
    ].join('; ');
  });
  const labelInlineStyle = computed(() => {
    if (!shouldSnapAutoWidth.value || autoWidths.value.label == null) {
      return undefined;
    }

    return [
      `width: ${autoWidths.value.label}px`,
      `flex-basis: ${autoWidths.value.label}px`,
      'flex-grow: 0',
      'flex-shrink: 0',
    ].join('; ');
  });

  function clearAutoWidthRaf() {
    if (autoWidthRafId.value !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(autoWidthRafId.value);
      autoWidthRafId.value = null;
    }
  }

  function clearAutoWidthTargetRaf() {
    if (autoWidthTargetRafId.value !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(autoWidthTargetRafId.value);
      autoWidthTargetRafId.value = null;
    }
  }

  function cancelAutoWidthTransition() {
    autoWidthTransitionRunId.value += 1;
    clearAutoWidthTargetRaf();

    if (autoWidthTransitionCleanup) {
      autoWidthTransitionCleanup();
      autoWidthTransitionCleanup = null;
    }

    autoWidthTransitioning.value = false;
    deferredAutoWidthMeasureRequested.value = false;
    skipNextAutoWidthUpdatedMeasure.value = false;
  }

  function resetAutoWidthState() {
    cancelAutoWidthTransition();
    autoWidthReady.value = false;
  }

  function deferAutoWidthMeasure() {
    deferredAutoWidthMeasureRequested.value = true;
  }

  function replayDeferredAutoWidthMeasure() {
    if (!deferredAutoWidthMeasureRequested.value) {
      return;
    }

    void nextTick(() => {
      if (!deferredAutoWidthMeasureRequested.value) {
        return;
      }

      deferredAutoWidthMeasureRequested.value = false;
      scheduleAutoWidthMeasure();
    });
  }

  function getMeasuredAutoWidthsForText(text: string) {
    const contentElement = contentRef.value;

    if (!contentElement) {
      return null;
    }

    return readClonedAutoWidths(contentElement, text);
  }

  function finalizeAutoWidthTransition(runId: number) {
    if (autoWidthTransitionRunId.value !== runId) {
      return;
    }

    if (autoWidthTransitionCleanup) {
      autoWidthTransitionCleanup();
      autoWidthTransitionCleanup = null;
    }

    skipNextAutoWidthUpdatedMeasure.value = true;
    autoWidthTransitioning.value = false;
    onAfterSizeWrite();
  }

  function startAutoWidthTransition(nextWidths: AutoWidthValues) {
    if (
      props.animateSize !== true ||
      autoWidthReady.value !== true ||
      !shouldSnapAutoWidth.value ||
      typeof window === 'undefined'
    ) {
      return;
    }

    autoWidthTransitionRunId.value += 1;
    const runId = autoWidthTransitionRunId.value;
    const contentElement = contentRef.value;
    const labelElement = labelRef.value;

    autoWidthTransitionCleanup?.();
    autoWidthTransitionCleanup = null;
    clearAutoWidthTargetRaf();
    autoWidthTransitioning.value = true;

    const cleanup = () => {
      contentElement?.removeEventListener('transitionend', handleTransitionEnd);
      labelElement?.removeEventListener('transitionend', handleTransitionEnd);
      clearAutoWidthTargetRaf();
      window.clearTimeout(timeoutId);
      if (autoWidthTransitionCleanup === cleanup) {
        autoWidthTransitionCleanup = null;
      }
    };

    const finish = () => {
      cleanup();
      finalizeAutoWidthTransition(runId);
    };

    const handleTransitionEnd = (event: Event) => {
      if (event.target !== contentElement && event.target !== labelElement) {
        return;
      }

      if (!isAutoWidthTransitionEnd(event)) {
        return;
      }

      finish();
    };

    const timeoutId = window.setTimeout(
      finish,
      AUTO_WIDTH_TRANSITION_FALLBACK_MS
    );

    contentElement?.addEventListener('transitionend', handleTransitionEnd);
    labelElement?.addEventListener('transitionend', handleTransitionEnd);
    autoWidthTransitionCleanup = cleanup;

    autoWidthTargetRafId.value = window.requestAnimationFrame(() => {
      autoWidthTargetRafId.value = null;

      if (autoWidthTransitionRunId.value !== runId) {
        return;
      }

      autoWidths.value = nextWidths;
      autoWidthReady.value = nextWidths.content != null;
    });
  }

  function updateAutoWidths(nextWidths: AutoWidthValues) {
    const widthsChanged =
      autoWidths.value.content !== nextWidths.content ||
      autoWidths.value.label !== nextWidths.label;

    if (!widthsChanged) {
      onAfterSizeWrite();
      return;
    }

    const shouldTransition =
      autoWidthReady.value === true &&
      props.animateSize === true &&
      shouldSnapAutoWidth.value === true &&
      autoWidths.value.content != null;

    if (shouldTransition) {
      startAutoWidthTransition(nextWidths);
      return;
    }

    autoWidths.value = nextWidths;
    autoWidthReady.value = nextWidths.content != null;
    onAfterSizeWrite();
  }

  function measureAutoWidth() {
    if (!shouldSnapAutoWidth.value) {
      onMeasurementDisabled();
      resetAutoWidthState();

      if (
        autoWidths.value.content !== DEFAULT_AUTO_WIDTHS.content ||
        autoWidths.value.label !== DEFAULT_AUTO_WIDTHS.label
      ) {
        autoWidths.value = {
          content: DEFAULT_AUTO_WIDTHS.content,
          label: DEFAULT_AUTO_WIDTHS.label,
        };
      }
      return;
    }

    const contentElement = contentRef.value;
    const labelElement = labelRef.value;

    if (!contentElement) {
      return;
    }

    if (!labelElement) {
      updateAutoWidths({
        content: readSnappedWidth(contentElement),
        label: null,
      });
      return;
    }

    const inlineStyleSnapshot = captureAutoWidthInlineStyleSnapshot(
      contentElement,
      labelElement
    );
    const nextWidths = readMeasuredAutoWidths(
      contentElement,
      labelElement,
      getMeasurementLabelText()
    );
    const widthsChanged =
      autoWidths.value.content !== nextWidths.content ||
      autoWidths.value.label !== nextWidths.label;
    const shouldPreserveTransitionStart =
      autoWidthReady.value === true &&
      props.animateSize === true &&
      shouldSnapAutoWidth.value === true &&
      widthsChanged &&
      autoWidths.value.content != null;
    const transitionStartWidths: AutoWidthValues = {
      content: autoWidths.value.content,
      label: autoWidths.value.label,
    };

    if (shouldPreserveTransitionStart) {
      restoreAutoWidthTransitionStart(
        contentElement,
        labelElement,
        transitionStartWidths,
        inlineStyleSnapshot
      );
    } else {
      restoreAutoWidthInlineStyles(
        contentElement,
        labelElement,
        inlineStyleSnapshot
      );
    }

    updateAutoWidths(nextWidths);
  }

  function scheduleAutoWidthMeasure() {
    if (shouldSuppressMeasure()) {
      clearAutoWidthRaf();
      deferAutoWidthMeasure();
      return;
    }

    if (autoWidthTransitioning.value) {
      deferAutoWidthMeasure();
      return;
    }

    if (typeof window === 'undefined') {
      measureAutoWidth();
      return;
    }

    clearAutoWidthRaf();
    autoWidthRafId.value = window.requestAnimationFrame(() => {
      autoWidthRafId.value = null;

      if (shouldSuppressMeasure()) {
        deferAutoWidthMeasure();
        return;
      }

      if (autoWidthTransitioning.value) {
        deferAutoWidthMeasure();
        return;
      }

      measureAutoWidth();
    });
  }

  function refreshResizeObserver() {
    resizeObserverRef.value?.disconnect();
    resizeObserverRef.value = null;

    if (!shouldSnapAutoWidth.value || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (shouldSuppressMeasure() || autoWidthTransitioning.value) {
        deferAutoWidthMeasure();
        return;
      }

      scheduleAutoWidthMeasure();
    });

    if (contentRef.value) {
      observer.observe(contentRef.value);
    }

    if (labelRef.value) {
      observer.observe(labelRef.value);
    }

    resizeObserverRef.value = observer;
  }

  onMounted(() => {
    lastAutoWidthContentSignature.value = autoWidthContentSignature.value;
    refreshResizeObserver();
    scheduleAutoWidthMeasure();

    if (
      !shouldSnapAutoWidth.value ||
      typeof document === 'undefined' ||
      !('fonts' in document) ||
      !(document as Document & { fonts?: FontFaceSet }).fonts?.ready
    ) {
      return;
    }

    fontsReadyCancelled = false;

    (document as Document & { fonts: FontFaceSet }).fonts.ready
      .then(() => {
        if (!fontsReadyCancelled) {
          scheduleAutoWidthMeasure();
        }
      })
      .catch(() => {
        // no-op
      });
  });

  onUpdated(() => {
    if (shouldSnapAutoWidth.value) {
      const nextSignature = autoWidthContentSignature.value;

      if (skipNextAutoWidthUpdatedMeasure.value) {
        skipNextAutoWidthUpdatedMeasure.value = false;
        lastAutoWidthContentSignature.value = nextSignature;
        return;
      }

      if (nextSignature !== lastAutoWidthContentSignature.value) {
        lastAutoWidthContentSignature.value = nextSignature;
        scheduleAutoWidthMeasure();
      }
      return;
    }

    lastAutoWidthContentSignature.value = autoWidthContentSignature.value;
  });

  onBeforeUnmount(() => {
    fontsReadyCancelled = true;
    cancelAutoWidthTransition();
    clearAutoWidthRaf();
    resizeObserverRef.value?.disconnect();
    resizeObserverRef.value = null;
  });

  watch(shouldSnapAutoWidth, async () => {
    await nextTick();
    lastAutoWidthContentSignature.value = autoWidthContentSignature.value;
    refreshResizeObserver();
    scheduleAutoWidthMeasure();
  });

  return {
    contentRef,
    labelRef,
    autoWidths,
    autoWidthReady,
    autoWidthTransitioning,
    contentInlineStyle,
    labelInlineStyle,
    getMeasuredAutoWidthsForText,
    replayDeferredAutoWidthMeasure,
    scheduleAutoWidthMeasure,
    updateAutoWidths,
  };
}
