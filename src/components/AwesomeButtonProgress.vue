<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  ref,
  type ComponentPublicInstance,
} from 'vue';
import AwesomeButton from './AwesomeButton.vue';
import { useProgressLifecycle } from '../composables/useProgressLifecycle';
import type {
  AwesomeButtonProgressProps,
  ButtonPressEvent,
  ButtonReleasedPayload,
  ProgressNext,
} from '../types';

defineOptions({
  name: 'AwesomeButtonProgress',
});

const BUTTON_TRANSITION_FALLBACK_MS = 220;

const props = withDefaults(defineProps<AwesomeButtonProgressProps>(), {
  type: 'primary',
  size: 'medium',
  disabled: false,
  visible: true,
  placeholder: false,
  textTransition: false,
  between: false,
  ripple: false,
  moveEvents: true,
  href: null,
  as: 'button',
  theme: null,
  loadingLabel: 'Wait..',
  resultLabel: 'Success!',
  releaseDelay: 500,
  showProgressBar: true,
  progressLoadingTime: 6000,
});

const emit = defineEmits<{
  press: [event: ButtonPressEvent, next: ProgressNext];
  pressed: [event: ButtonPressEvent];
  released: [payload: ButtonReleasedPayload];
}>();

const instance = getCurrentInstance();
const buttonRef = ref<ComponentPublicInstance | null>(null);
const progress = useProgressLifecycle();

const resolvedProgressLoadingTime = computed(() =>
  Math.max(0, Number(props.progressLoadingTime) || 0)
);
const progressClassName = computed(() => [
  'aws-btn--progress',
  props.showProgressBar ? null : 'aws-btn--progress-bar-hidden',
  progress.state.loadingStart ? 'aws-btn--start' : null,
  progress.state.loadingEnd ? 'aws-btn--end' : null,
  progress.state.loadingError ? 'aws-btn--errored' : null,
]);
const progressStatusLabel = computed(
  () => progress.state.errorLabel ?? props.resultLabel
);
const progressStyle = computed(() => ({
  '--loading-transition-speed': `${resolvedProgressLoadingTime.value}ms`,
  '--loading-transition-end-speed': `${Math.max(
    1,
    Math.ceil(resolvedProgressLoadingTime.value / 20)
  )}ms`,
}));
const progressEndFallbackMs = computed(() =>
  Math.max(300, Math.ceil(resolvedProgressLoadingTime.value / 20) + 120)
);

function getButtonElement() {
  return (buttonRef.value?.$el as HTMLElement | undefined) ?? null;
}

function getContentElement() {
  return getButtonElement()?.querySelector('.aws-btn__content') ?? null;
}

function clearRegisteredTransitionWait() {
  progress.replacePendingCleanup(null);
}

function waitForContentTransition(
  runId: number,
  fallbackMs: number,
  callback: () => void
) {
  const contentElement = getContentElement();

  if (!contentElement || typeof window === 'undefined') {
    clearRegisteredTransitionWait();
    if (progress.isCurrentRun(runId)) {
      callback();
    }
    return;
  }

  let finished = false;

  const cleanup = () => {
    if (finished) {
      return;
    }

    finished = true;
    contentElement.removeEventListener('transitionend', handleTransitionEnd);
    window.clearTimeout(timeoutId);
  };

  const finalize = () => {
    if (finished) {
      return;
    }

    cleanup();
    clearRegisteredTransitionWait();

    if (progress.isCurrentRun(runId)) {
      callback();
    }
  };

  const handleTransitionEnd = (event: Event) => {
    if (event.target !== contentElement) {
      return;
    }

    finalize();
  };

  const timeoutId = window.setTimeout(finalize, fallbackMs);

  progress.replacePendingCleanup(() => {
    cleanup();
  });

  contentElement.addEventListener('transitionend', handleTransitionEnd);
}

function invokePressListeners(event: ButtonPressEvent, next: ProgressNext) {
  const listener = instance?.vnode.props?.onPress as
    | ((event: ButtonPressEvent, next: ProgressNext) => unknown)
    | Array<(event: ButtonPressEvent, next: ProgressNext) => unknown>
    | undefined;

  if (Array.isArray(listener)) {
    for (const item of listener) {
      item(event, next);
    }
    return;
  }

  if (typeof listener === 'function') {
    listener(event, next);
    return;
  }

  emit('press', event, next);
}

function scheduleResetAfterCompletion(runId: number) {
  waitForContentTransition(runId, progressEndFallbackMs.value, () => {
    progress.scheduleReset(runId, props.releaseDelay);
  });
}

function resolveRun(
  runId: number,
  endState = true,
  errorLabel: string | null = null
) {
  if (!progress.finishRun(runId, endState, errorLabel)) {
    return;
  }

  scheduleResetAfterCompletion(runId);
}

function handlePressed(event: ButtonPressEvent) {
  progress.activate();
  emit('pressed', event);
}

function handleReleased(payload: ButtonReleasedPayload) {
  emit('released', payload);
}

function handlePress(event: ButtonPressEvent) {
  progress.activate();

  const runId = progress.beginRun();
  if (runId == null) {
    return;
  }

  progress.markLoadingStart(runId);

  waitForContentTransition(runId, BUTTON_TRANSITION_FALLBACK_MS, () => {
    if (!progress.isCurrentRun(runId)) {
      return;
    }

    const next: ProgressNext = (
      endState = true,
      errorLabel: string | null = null
    ) => {
      resolveRun(runId, endState, errorLabel);
    };

    try {
      invokePressListeners(event, next);
    } catch {
      resolveRun(runId, false, null);
    }
  });
}
</script>

<template>
  <AwesomeButton
    ref="buttonRef"
    :type="props.type"
    :size="props.size"
    :active="progress.state.active"
    :disabled="props.disabled"
    :visible="props.visible"
    :placeholder="props.placeholder"
    :text-transition="props.textTransition"
    :between="props.between"
    :ripple="props.ripple"
    :move-events="props.moveEvents"
    :href="props.href"
    :as="props.as"
    :theme="props.theme"
    :class="progressClassName"
    :style="progressStyle"
    @press="handlePress"
    @pressed="handlePressed"
    @released="handleReleased"
  >
    <template v-if="$slots.before" #before>
      <slot name="before" />
    </template>

    <slot />

    <template v-if="$slots.after" #after>
      <slot name="after" />
    </template>

    <template #extra>
      <span
        class="aws-btn__progress"
        :data-loading="props.loadingLabel"
        :data-status="progressStatusLabel"
      />
      <slot name="extra" />
    </template>
  </AwesomeButton>
</template>
