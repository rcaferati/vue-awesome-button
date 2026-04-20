import { nextTick, onBeforeUnmount, reactive, ref } from 'vue';

type ProgressLifecycleState = {
  active: boolean;
  errorLabel: string | null;
  loadingEnd: boolean;
  loadingError: boolean;
  loadingStart: boolean;
};

export function useProgressLifecycle() {
  const state = reactive<ProgressLifecycleState>({
    active: false,
    errorLabel: null,
    loadingEnd: false,
    loadingError: false,
    loadingStart: false,
  });

  const busy = ref(false);
  const runId = ref(0);

  let resetTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingCleanup: (() => void) | null = null;

  function clearTimeoutIfAny() {
    if (resetTimeoutId !== null) {
      clearTimeout(resetTimeoutId);
      resetTimeoutId = null;
    }
  }

  function clearPendingCleanup() {
    if (pendingCleanup) {
      pendingCleanup();
      pendingCleanup = null;
    }
  }

  function replacePendingCleanup(cleanup: (() => void) | null) {
    clearPendingCleanup();
    pendingCleanup = cleanup;
  }

  function isCurrentRun(candidateRunId: number) {
    return runId.value === candidateRunId;
  }

  function activate() {
    state.active = true;
  }

  function beginRun() {
    if (busy.value === true || state.loadingStart === true) {
      return null;
    }

    busy.value = true;
    runId.value += 1;
    clearPendingCleanup();
    clearTimeoutIfAny();

    return runId.value;
  }

  function markLoadingStart(candidateRunId: number) {
    if (!isCurrentRun(candidateRunId)) {
      return false;
    }

    state.loadingStart = true;
    return true;
  }

  function finishRun(
    candidateRunId: number,
    endState = true,
    errorLabel: string | null = null
  ) {
    if (!isCurrentRun(candidateRunId) || state.loadingEnd === true) {
      return false;
    }

    state.loadingEnd = true;
    state.loadingError = !endState;
    state.errorLabel = errorLabel;
    return true;
  }

  function scheduleReset(candidateRunId: number, releaseDelay: number) {
    if (!isCurrentRun(candidateRunId)) {
      return;
    }

    clearPendingCleanup();
    clearTimeoutIfAny();

    resetTimeoutId = setTimeout(() => {
      if (!isCurrentRun(candidateRunId)) {
        return;
      }

      state.loadingStart = false;
      state.loadingEnd = false;
      state.active = false;

      void nextTick(() => {
        if (!isCurrentRun(candidateRunId)) {
          return;
        }

        state.loadingError = false;
        state.errorLabel = null;
        busy.value = false;
      });
    }, Math.max(0, Number(releaseDelay) || 0));
  }

  function invalidate() {
    runId.value += 1;
    busy.value = false;
    clearPendingCleanup();
    clearTimeoutIfAny();
  }

  onBeforeUnmount(() => {
    invalidate();
  });

  return {
    activate,
    beginRun,
    busy,
    finishRun,
    invalidate,
    isCurrentRun,
    markLoadingStart,
    replacePendingCleanup,
    scheduleReset,
    state,
  };
}
