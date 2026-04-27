import { onBeforeUnmount, ref, type Ref } from 'vue';
import { isTransformTransitionEnd } from './transitionEvents';

const RELEASE_FALLBACK_MS = 220;

type UseReleaseTransitionParams = {
  contentRef: Ref<HTMLSpanElement | null>;
  onRelease: () => void;
};

type UseReleaseTransitionResult = {
  cancelPendingRelease: () => void;
  scheduleReleaseFinalize: () => void;
};

export function useReleaseTransition({
  contentRef,
  onRelease,
}: UseReleaseTransitionParams): UseReleaseTransitionResult {
  const releaseRunId = ref(0);
  let releaseCleanup: (() => void) | null = null;

  function cancelPendingRelease() {
    releaseRunId.value += 1;

    if (releaseCleanup) {
      releaseCleanup();
      releaseCleanup = null;
    }
  }

  function finalizeRelease(runId: number) {
    if (releaseRunId.value !== runId) {
      return;
    }

    onRelease();
  }

  function scheduleReleaseFinalize() {
    const runId = releaseRunId.value;
    const contentElement = contentRef.value;

    if (!contentElement || typeof window === 'undefined') {
      finalizeRelease(runId);
      return;
    }

    const handleTransitionEnd = (event: Event) => {
      if (event.target !== contentElement) {
        return;
      }

      if (!isTransformTransitionEnd(event)) {
        return;
      }

      cleanup();
      finalizeRelease(runId);
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      finalizeRelease(runId);
    }, RELEASE_FALLBACK_MS);

    const cleanup = () => {
      contentElement.removeEventListener('transitionend', handleTransitionEnd);
      window.clearTimeout(timeoutId);
      if (releaseCleanup === cleanup) {
        releaseCleanup = null;
      }
    };

    releaseCleanup = cleanup;
    contentElement.addEventListener('transitionend', handleTransitionEnd);
  }

  onBeforeUnmount(() => {
    cancelPendingRelease();
  });

  return {
    cancelPendingRelease,
    scheduleReleaseFinalize,
  };
}
