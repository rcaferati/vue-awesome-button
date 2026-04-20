<script setup lang="ts">
import {
  Comment,
  Fragment,
  Text,
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  useAttrs,
  useSlots,
  watch,
  type ComponentPublicInstance,
  type VNode,
} from 'vue';
import type {
  AwesomeButtonProps,
  ButtonPressEvent,
  ButtonReleasedPayload,
  ThemeName,
} from '../types';

defineOptions({
  name: 'AwesomeButton',
  inheritAttrs: false,
});

type PointerZone = 'left' | 'middle' | 'right';
type PressPhase = 'idle' | 'pressed' | 'locked' | 'releasing';
type AutoWidthValues = {
  content: number | null;
  label: number | null;
};
type AutoTextTransitionFlow = 'grow-first' | 'text-first' | 'text-only';
type AutoTextTransitionPhase =
  | 'grow-sizing'
  | 'grow-text'
  | 'shrink-text'
  | 'shrink-sizing';
type AutoTextTransitionState = {
  targetText: string;
  targetWidths: AutoWidthValues;
  phase: AutoTextTransitionPhase;
  runId: number;
};
type AutoWidthInlineStyleSnapshot = {
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
type TextTransitionFrame = {
  from: string;
  to: string;
  startedAt: number;
};

const DEFAULT_AUTO_WIDTHS = Object.freeze({
  content: null as number | null,
  label: null as number | null,
});
const RELEASE_FALLBACK_MS = 220;
const RIPPLE_FALLBACK_MS = 420;
const AUTO_WIDTH_TRANSITION_FALLBACK_MS = 175;
const TEXT_TRANSITION_DURATION = 320;
const TEXT_TRANSITION_SETTLE_START = 0.45;
const UPPERCASE_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE_POOL = 'abcdefghijklmnopqrstuvwxyz';
const DIGIT_POOL = '0123456789';
const SYMBOL_POOL = '#%&^+=-';

const props = withDefaults(defineProps<AwesomeButtonProps>(), {
  type: 'primary',
  size: 'medium',
  active: false,
  disabled: false,
  visible: true,
  placeholder: false,
  animateSize: true,
  textTransition: false,
  between: false,
  ripple: false,
  moveEvents: true,
  href: null,
  as: 'button',
  theme: null,
});

const emit = defineEmits<{
  press: [event: ButtonPressEvent];
  pressed: [event: ButtonPressEvent];
  released: [payload: ButtonReleasedPayload];
}>();

const attrs = useAttrs();
const slots = useSlots();

const rootRef = ref<HTMLElement | ComponentPublicInstance | null>(null);
const wrapperRef = ref<HTMLSpanElement | null>(null);
const contentRef = ref<HTMLSpanElement | null>(null);
const labelRef = ref<HTMLSpanElement | null>(null);

const pressPhase = ref<PressPhase>('idle');
const pointerZone = ref<PointerZone | null>(null);
const autoWidths = ref({
  content: null as number | null,
  label: null as number | null,
});
const autoWidthReady = ref(false);
const autoWidthTransitioning = ref(false);
const deferredAutoWidthMeasureRequested = ref(false);
const skipNextAutoWidthUpdatedMeasure = ref(false);
const lastAutoWidthContentSignature = ref<string | null>(null);
const autoWidthTransitionRunId = ref(0);
const activePointerId = ref<number | null>(null);
const pointerStartY = ref<number | null>(null);
const releaseRunId = ref(0);
const autoWidthRafId = ref<number | null>(null);
const autoWidthTargetRafId = ref<number | null>(null);
const resizeObserverRef = ref<ResizeObserver | null>(null);
const textTransitionRafId = ref<number | null>(null);
const textTransitionDelayRafId = ref<number | null>(null);
const slotString = ref<string | null>(null);
const displayedText = ref<string | null>(null);
const targetText = ref<string | null>(null);
const autoTextTransitionState = ref<AutoTextTransitionState | null>(null);
const autoTextTransitionRunId = ref(0);

let releaseCleanup: (() => void) | null = null;
let autoWidthTransitionCleanup: (() => void) | null = null;
let fontsReadyCancelled = false;

function isMeaningfulVNode(node: VNode | null | undefined): boolean {
  if (!node) {
    return false;
  }

  if (node.type === Comment) {
    return false;
  }

  if (node.type === Text) {
    return String(node.children ?? '').trim().length > 0;
  }

  if (node.type === Fragment) {
    return Array.isArray(node.children)
      ? node.children.some((child) => isMeaningfulVNode(child as VNode))
      : false;
  }

  return true;
}

function hasMeaningfulSlot(name: 'before' | 'default' | 'after' | 'extra') {
  return computed(() => {
    const vnodeList = slots[name]?.();
    if (!vnodeList?.length) {
      return false;
    }
    return vnodeList.some((node) => isMeaningfulVNode(node));
  });
}

function collectStringContent(
  node: VNode | null | undefined,
  chunks: string[]
): boolean {
  if (!node || node.type === Comment) {
    return true;
  }

  if (node.type === Text) {
    chunks.push(String(node.children ?? ''));
    return true;
  }

  if (node.type === Fragment) {
    if (!Array.isArray(node.children)) {
      return true;
    }

    return node.children.every((child) =>
      collectStringContent(child as VNode, chunks)
    );
  }

  return false;
}

function extractStringSlotValueFromNodes(vnodeList: VNode[] | undefined): string | null {
  if (!vnodeList?.length) {
    return null;
  }

  const chunks: string[] = [];
  const isStringOnly = vnodeList.every((node) => collectStringContent(node, chunks));

  if (!isStringOnly) {
    return null;
  }

  const normalized = chunks.join('').replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function isActivationKey(event: KeyboardEvent) {
  return event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
}

function isKeyboardClick(event: MouseEvent) {
  return event.detail === 0;
}

function getMoveState(clientX: number, element: HTMLElement): PointerZone {
  const { left } = element.getBoundingClientRect();
  const width = element.offsetWidth;

  if (clientX < left + width * 0.3) {
    return 'left';
  }
  if (clientX > left + width * 0.65) {
    return 'right';
  }
  return 'middle';
}

function readSnappedWidth(element: HTMLElement | null): number | null {
  if (!element) {
    return null;
  }

  const scrollWidth = element.scrollWidth;
  if (scrollWidth > 0) {
    return scrollWidth;
  }

  const rectWidth = element.getBoundingClientRect().width;
  if (Number.isFinite(rectWidth) && rectWidth > 0) {
    return Math.ceil(rectWidth);
  }

  return null;
}

function readClonedAutoWidths(
  contentElement: HTMLElement,
  measurementLabelText: string
): AutoWidthValues | null {
  const parentElement = contentElement.parentElement;

  if (!parentElement) {
    return null;
  }

  const clone = contentElement.cloneNode(true) as HTMLElement;
  const cloneLabel = clone.querySelector('.aws-btn__label') as HTMLElement | null;

  clone.style.position = 'absolute';
  clone.style.visibility = 'hidden';
  clone.style.pointerEvents = 'none';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.width = 'auto';
  clone.style.flexBasis = 'auto';
  clone.style.flexGrow = '0';
  clone.style.flexShrink = '1';
  clone.style.transition = 'none';

  if (cloneLabel) {
    cloneLabel.textContent = measurementLabelText;
    cloneLabel.style.width = 'auto';
    cloneLabel.style.flexBasis = 'auto';
    cloneLabel.style.flexGrow = '0';
    cloneLabel.style.flexShrink = '1';
    cloneLabel.style.transition = 'none';
  }

  parentElement.appendChild(clone);

  const widths = {
    content: readSnappedWidth(clone),
    label: readSnappedWidth(cloneLabel),
  };

  clone.remove();

  if (widths.content == null && widths.label == null) {
    return null;
  }

  return widths;
}

function getMeasuredAutoWidthsForText(text: string) {
  const contentElement = contentRef.value;

  if (!contentElement) {
    return null;
  }

  return readClonedAutoWidths(contentElement, text);
}

function readLiveAutoWidths(
  contentElement: HTMLElement,
  labelElement: HTMLElement
): AutoWidthValues {
  contentElement.style.width = 'auto';
  contentElement.style.flexBasis = 'auto';
  contentElement.style.flexGrow = '0';
  contentElement.style.flexShrink = '1';
  labelElement.style.width = 'auto';
  labelElement.style.flexBasis = 'auto';
  labelElement.style.flexGrow = '0';
  labelElement.style.flexShrink = '1';

  return {
    content: readSnappedWidth(contentElement),
    label: readSnappedWidth(labelElement),
  };
}

function readMeasuredAutoWidths(
  contentElement: HTMLElement,
  labelElement: HTMLElement,
  measurementLabelText: string | null
): AutoWidthValues {
  return (
    (measurementLabelText != null
      ? readClonedAutoWidths(contentElement, measurementLabelText)
      : null) ?? readLiveAutoWidths(contentElement, labelElement)
  );
}

function getAutoTextTransitionFlow(
  targetWidths: AutoWidthValues | null
): AutoTextTransitionFlow | null {
  const currentWidth = autoWidths.value.content;
  const nextWidth = targetWidths?.content;

  if (currentWidth == null || nextWidth == null) {
    return null;
  }

  if (nextWidth > currentWidth) {
    return 'grow-first';
  }

  if (nextWidth < currentWidth) {
    return 'text-first';
  }

  return 'text-only';
}

function isTransformTransitionEnd(event: Event) {
  return (event as TransitionEvent).propertyName === 'transform';
}

function isAutoWidthTransitionEnd(event: Event) {
  const propertyName = (event as TransitionEvent).propertyName;
  return propertyName === 'width' || propertyName === 'flex-basis';
}

function getTransitionCharacterPool(character: string): string {
  if (/[A-Z]/.test(character)) {
    return UPPERCASE_POOL;
  }

  if (/[a-z]/.test(character)) {
    return LOWERCASE_POOL;
  }

  if (/\d/.test(character)) {
    return DIGIT_POOL;
  }

  return SYMBOL_POOL;
}

function getRandomTransitionCharacter(character: string): string {
  if (!character || /\s/.test(character)) {
    return character;
  }

  const pool = getTransitionCharacterPool(character);
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex] || character;
}

function buildTextTransitionFrame(from: string, to: string, progress: number) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const peakLength = Math.max(from.length, to.length);
  const settleProgress =
    clampedProgress <= TEXT_TRANSITION_SETTLE_START
      ? 0
      : (clampedProgress - TEXT_TRANSITION_SETTLE_START) /
        (1 - TEXT_TRANSITION_SETTLE_START);

  const currentLength =
    clampedProgress < TEXT_TRANSITION_SETTLE_START
      ? Math.ceil(
          from.length +
            (peakLength - from.length) *
              (clampedProgress / TEXT_TRANSITION_SETTLE_START)
        )
      : Math.ceil(peakLength - (peakLength - to.length) * settleProgress);

  const lockedCharacters = Math.floor(to.length * settleProgress);
  let nextText = '';

  for (let index = 0; index < currentLength; index += 1) {
    const sourceCharacter = from[index] ?? to[index] ?? ' ';
    const targetCharacter = to[index] ?? '';

    if (/\s/.test(targetCharacter || sourceCharacter)) {
      nextText += targetCharacter || sourceCharacter || ' ';
      continue;
    }

    if (settleProgress >= 1 && index < to.length) {
      nextText += targetCharacter;
      continue;
    }

    if (index < lockedCharacters && index < to.length) {
      nextText += targetCharacter;
      continue;
    }

    nextText += getRandomTransitionCharacter(targetCharacter || sourceCharacter);
  }

  return nextText;
}

function getRootElement(): HTMLElement | null {
  return rootRef.value instanceof HTMLElement ? rootRef.value : null;
}

const hasBeforeSlot = hasMeaningfulSlot('before');
const hasDefaultSlot = hasMeaningfulSlot('default');
const hasAfterSlot = hasMeaningfulSlot('after');
const hasExtraSlot = hasMeaningfulSlot('extra');
const rawStringSlotValue = computed(() =>
  extractStringSlotValueFromNodes(slots.default?.())
);

const isPlaceholder = computed(
  () => props.placeholder === true && hasDefaultSlot.value === false
);
const isDisabled = computed(() => props.disabled === true || isPlaceholder.value);
const isIconOnly = computed(
  () =>
    hasDefaultSlot.value === false &&
    (hasBeforeSlot.value === true || hasAfterSlot.value === true)
);
const isAutoSize = computed(() => props.size == null);
const shouldSnapAutoWidth = computed(
  () => isAutoSize.value === true && isPlaceholder.value === false
);

const resolvedTag = computed(() => {
  if (props.href) {
    return 'a';
  }
  return props.as || 'button';
});

const isNativeButton = computed(() => resolvedTag.value === 'button');
const isAnchorLike = computed(
  () => resolvedTag.value === 'a' && Boolean(props.href)
);
const needsButtonRole = computed(
  () => !isNativeButton.value && !isAnchorLike.value
);

const resolvedThemeClass = computed(() =>
  props.theme ? `aws-btn--theme-${props.theme as ThemeName}` : null
);

const rootClassName = computed(() => [
  'aws-btn',
  isAutoSize.value ? 'aws-btn--auto' : 'aws-btn--fixed',
  props.type ? `aws-btn--${props.type}` : null,
  props.size ? `aws-btn--${props.size}` : null,
  props.visible ? 'aws-btn--visible' : null,
  props.animateSize ? 'aws-btn--animate-size' : null,
  props.animateSize && shouldSnapAutoWidth.value && autoWidthReady.value
    ? 'aws-btn--auto-size-ready'
    : null,
  autoWidthTransitioning.value ? 'aws-btn--auto-size-transitioning' : null,
  props.between ? 'aws-btn--between' : null,
  isPlaceholder.value ? 'aws-btn--placeholder' : null,
  isDisabled.value ? 'aws-btn--disabled' : null,
  pressPhase.value === 'pressed' || pressPhase.value === 'locked'
    ? 'aws-btn--active'
    : null,
  pressPhase.value === 'releasing' ? 'aws-btn--releasing' : null,
  pointerZone.value ? `aws-btn--${pointerZone.value}` : null,
  isIconOnly.value ? 'aws-btn--icon' : null,
  resolvedThemeClass.value,
]);

const rootAttrs = computed(() => {
  const baseAttrs = { ...attrs } as Record<string, unknown>;

  if (isNativeButton.value) {
    if (baseAttrs.type == null) {
      baseAttrs.type = 'button';
    }
    baseAttrs.disabled = isDisabled.value;
  } else if (isDisabled.value) {
    baseAttrs['aria-disabled'] = 'true';
  }

  if (props.href) {
    baseAttrs.href = props.href;
  }

  if (needsButtonRole.value && baseAttrs.role == null) {
    baseAttrs.role = 'button';
  }

  if (needsButtonRole.value && baseAttrs.tabindex == null) {
    baseAttrs.tabindex = isDisabled.value ? -1 : 0;
  }

  return baseAttrs;
});

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
const shouldRenderAnimatedText = computed(
  () => props.textTransition === true && slotString.value != null
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

function clearPointerZone() {
  pointerZone.value = null;
}

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

function clearAutoTextTransitionState() {
  autoTextTransitionRunId.value += 1;
  autoTextTransitionState.value = null;
  clearTextTransitionDelayRaf();
}

function deferAutoWidthMeasure() {
  deferredAutoWidthMeasureRequested.value = true;
}

function replayDeferredAutoWidthMeasure() {
  if (!deferredAutoWidthMeasureRequested.value) {
    return;
  }

  // Wait for Vue to commit the final label DOM before scheduling the RAF-based
  // remeasurement, otherwise we can read a stale intermediate text frame.
  void nextTick(() => {
    if (!deferredAutoWidthMeasureRequested.value) {
      return;
    }

    deferredAutoWidthMeasureRequested.value = false;
    scheduleAutoWidthMeasure();
  });
}

function isAutoTextChoreographyActive() {
  return autoTextTransitionState.value != null;
}

function shouldSuppressAutoWidthMeasureForTextTransition() {
  return (
    shouldSnapAutoWidth.value === true &&
    props.textTransition === true &&
    (isAutoTextChoreographyActive() || textTransitionRafId.value !== null)
  );
}

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

  pressPhase.value = 'idle';
  emit('released', getRootElement());
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

function clearPress(
  options: {
    force?: boolean;
    leave?: boolean;
  } = {}
) {
  const { force = false, leave = false } = options;

  clearPointerZone();

  if (leave === true && pressPhase.value === 'idle') {
    return;
  }

  if (pressPhase.value === 'releasing') {
    return;
  }

  if (props.active === true && force === false && isDisabled.value === false) {
    pressPhase.value = 'locked';
    return;
  }

  const hadVisualPress = pressPhase.value !== 'idle';

  cancelPendingRelease();
  activePointerId.value = null;
  pointerStartY.value = null;

  if (!hadVisualPress) {
    pressPhase.value = 'idle';
    return;
  }

  pressPhase.value = 'releasing';
  scheduleReleaseFinalize();
}

function handleAction(event: ButtonPressEvent) {
  if (isDisabled.value) {
    return;
  }

  emit('press', event);
}

function createRipple(event: PointerEvent) {
  if (props.ripple !== true || typeof document === 'undefined') {
    return;
  }

  const wrapperElement = wrapperRef.value;
  const contentElement = contentRef.value;

  if (!wrapperElement || !contentElement) {
    return;
  }

  const bounds = wrapperElement.getBoundingClientRect();
  const bubble = document.createElement('span');
  const size = bounds.width < 50 ? bounds.width * 3 : bounds.width * 2;
  const clientX = event.clientX ?? bounds.left + bounds.width / 2;
  const clientY = event.clientY ?? bounds.top + bounds.height / 2;

  bubble.className = 'aws-btn__bubble';
  bubble.style.left = `${clientX - bounds.left - size / 2}px`;
  bubble.style.top = `${clientY - bounds.top - size / 2}px`;
  bubble.style.width = `${size}px`;
  bubble.style.height = `${size}px`;

  let removed = false;
  let timeoutId: number | null = null;

  const cleanup = () => {
    if (removed) {
      return;
    }

    removed = true;
    bubble.removeEventListener('animationend', cleanup);
    if (timeoutId !== null && typeof window !== 'undefined') {
      window.clearTimeout(timeoutId);
    }
    bubble.remove();
  };

  bubble.addEventListener('animationend', cleanup);

  if (typeof window !== 'undefined') {
    timeoutId = window.setTimeout(cleanup, RIPPLE_FALLBACK_MS);
    window.requestAnimationFrame(() => {
      contentElement.appendChild(bubble);
    });
  } else {
    contentElement.appendChild(bubble);
  }
}

function pressIn(event: ButtonPressEvent) {
  if (isDisabled.value || pressPhase.value === 'locked') {
    return;
  }

  cancelPendingRelease();
  pressPhase.value = 'pressed';
  emit('pressed', event);
}

function pressOut(
  event: ButtonPressEvent,
  options: {
    allowRipple?: boolean;
  } = {}
) {
  const { allowRipple = false } = options;
  const isLockedInteractionRelease =
    pressPhase.value === 'locked' &&
    (activePointerId.value !== null || event instanceof KeyboardEvent);

  if (
    isDisabled.value ||
    (pressPhase.value !== 'pressed' && isLockedInteractionRelease === false)
  ) {
    return;
  }

  if (
    allowRipple &&
    typeof PointerEvent !== 'undefined' &&
    event instanceof PointerEvent
  ) {
    createRipple(event);
  }

  handleAction(event);

  if (props.active === true) {
    clearPointerZone();
    pressPhase.value = 'locked';
    return;
  }

  clearPress();
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
  advanceAutoTextChoreographyAfterSizeWrite();
}

function startAutoWidthTransition(nextWidths: {
  content: number | null;
  label: number | null;
}) {
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

function updateAutoWidths(nextWidths: {
  content: number | null;
  label: number | null;
}) {
  const widthsChanged =
    autoWidths.value.content !== nextWidths.content ||
    autoWidths.value.label !== nextWidths.label;

  if (!widthsChanged) {
    advanceAutoTextChoreographyAfterSizeWrite();
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
  advanceAutoTextChoreographyAfterSizeWrite();
}

function captureAutoWidthInlineStyleSnapshot(
  contentElement: HTMLElement,
  labelElement: HTMLElement
): AutoWidthInlineStyleSnapshot {
  return {
    contentWidth: contentElement.style.width,
    contentFlexBasis: contentElement.style.flexBasis,
    contentFlexGrow: contentElement.style.flexGrow,
    contentFlexShrink: contentElement.style.flexShrink,
    contentTransition: contentElement.style.transition,
    labelWidth: labelElement.style.width,
    labelFlexBasis: labelElement.style.flexBasis,
    labelFlexGrow: labelElement.style.flexGrow,
    labelFlexShrink: labelElement.style.flexShrink,
    labelTransition: labelElement.style.transition,
  };
}

function restoreAutoWidthInlineStyles(
  contentElement: HTMLElement,
  labelElement: HTMLElement,
  snapshot: AutoWidthInlineStyleSnapshot
) {
  contentElement.style.width = snapshot.contentWidth;
  contentElement.style.flexBasis = snapshot.contentFlexBasis;
  contentElement.style.flexGrow = snapshot.contentFlexGrow;
  contentElement.style.flexShrink = snapshot.contentFlexShrink;
  contentElement.style.transition = snapshot.contentTransition;
  labelElement.style.width = snapshot.labelWidth;
  labelElement.style.flexBasis = snapshot.labelFlexBasis;
  labelElement.style.flexGrow = snapshot.labelFlexGrow;
  labelElement.style.flexShrink = snapshot.labelFlexShrink;
  labelElement.style.transition = snapshot.labelTransition;
}

function restoreAutoWidthTransitionStart(
  contentElement: HTMLElement,
  labelElement: HTMLElement,
  startWidths: AutoWidthValues,
  snapshot: AutoWidthInlineStyleSnapshot
) {
  contentElement.style.transition = 'none';
  labelElement.style.transition = 'none';
  contentElement.style.width = `${startWidths.content}px`;
  contentElement.style.flexBasis = `${startWidths.content}px`;
  contentElement.style.flexGrow = '0';
  contentElement.style.flexShrink = '0';

  if (startWidths.label != null) {
    labelElement.style.width = `${startWidths.label}px`;
    labelElement.style.flexBasis = `${startWidths.label}px`;
    labelElement.style.flexGrow = '0';
    labelElement.style.flexShrink = '0';
  } else {
    labelElement.style.width = snapshot.labelWidth;
    labelElement.style.flexBasis = snapshot.labelFlexBasis;
    labelElement.style.flexGrow = snapshot.labelFlexGrow;
    labelElement.style.flexShrink = snapshot.labelFlexShrink;
  }

  // Commit the restored pixel start point before Vue patches the new target.
  void contentElement.offsetWidth;
  void labelElement.offsetWidth;
  contentElement.style.transition = snapshot.contentTransition;
  labelElement.style.transition = snapshot.labelTransition;
}

function measureAutoWidth() {
  if (!shouldSnapAutoWidth.value) {
    clearAutoTextTransitionState();
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
    const contentWidth = readSnappedWidth(contentElement);

    updateAutoWidths({
      content: contentWidth,
      label: null,
    });
    return;
  }

  const inlineStyleSnapshot = captureAutoWidthInlineStyleSnapshot(
    contentElement,
    labelElement
  );
  const measurementLabelText = getAutoWidthMeasurementLabelText();
  const nextWidths = readMeasuredAutoWidths(
    contentElement,
    labelElement,
    measurementLabelText
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
  if (shouldSuppressAutoWidthMeasureForTextTransition()) {
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

    if (shouldSuppressAutoWidthMeasureForTextTransition()) {
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

function updateDisplayedText(value: string | null) {
  displayedText.value = value;
}

function getAutoWidthMeasurementLabelText() {
  const state = autoTextTransitionState.value;

  if (
    props.textTransition !== true ||
    shouldSnapAutoWidth.value !== true ||
    state?.phase !== 'grow-sizing' ||
    slotString.value == null
  ) {
    return null;
  }

  return state.targetText;
}

function startTextTransitionTo(
  nextString: string,
  onComplete?: () => void
) {
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
      updateDisplayedText(transitionFrame.to);
      onComplete?.();
      return;
    }

    updateDisplayedText(
      buildTextTransitionFrame(transitionFrame.from, transitionFrame.to, progress)
    );

    textTransitionRafId.value = window.requestAnimationFrame(tick);
  };

  textTransitionRafId.value = window.requestAnimationFrame(tick);
}

function finishAutoTextChoreography() {
  autoTextTransitionState.value = null;
  replayDeferredAutoWidthMeasure();
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
  const execute = () => {
    const state = autoTextTransitionState.value;

    if (state == null || state.runId !== runId || state.phase !== 'grow-sizing') {
      return;
    }

    autoTextTransitionState.value = {
      ...state,
      phase: 'grow-text',
    };

    startTextTransitionTo(state.targetText, () => completeGrowTextPhase(runId));
  };

  if (typeof window === 'undefined') {
    execute();
    return;
  }

  clearTextTransitionDelayRaf();
  textTransitionDelayRafId.value = window.requestAnimationFrame(() => {
    textTransitionDelayRafId.value = null;
    execute();
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
  updateAutoWidths(latestState.targetWidths);
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

  replayDeferredAutoWidthMeasure();
}

function syncTextTransitionState(nextString = rawStringSlotValue.value) {
  slotString.value = nextString;

  if (props.textTransition !== true || nextString == null) {
    clearTextTransitionRaf();
    clearAutoTextTransitionState();
    targetText.value = nextString;
    updateDisplayedText(nextString);
    return;
  }

  if (displayedText.value == null) {
    clearAutoTextTransitionState();
    targetText.value = nextString;
    updateDisplayedText(nextString);
    return;
  }

  if (
    targetText.value === nextString &&
    (autoTextTransitionState.value?.targetText === nextString ||
      textTransitionRafId.value !== null ||
      displayedText.value === nextString)
  ) {
    return;
  }

  if (typeof window === 'undefined') {
    clearAutoTextTransitionState();
    targetText.value = nextString;
    updateDisplayedText(nextString);
    return;
  }

  clearTextTransitionRaf();
  clearAutoTextTransitionState();

  if (shouldSnapAutoWidth.value) {
    targetText.value = nextString;
    const targetWidths = getMeasuredAutoWidthsForText(nextString);
    const flow = getAutoTextTransitionFlow(targetWidths);

    if (targetWidths == null || flow == null) {
      startTextTransitionTo(nextString, scheduleAutoWidthMeasure);
      return;
    }

    if (flow === 'text-only') {
      startTextTransitionTo(nextString);
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
      updateAutoWidths(targetWidths);
      return;
    }

    startTextTransitionTo(nextString, () => completeShrinkTextPhase(runId));
    return;
  }

  autoTextTransitionState.value = null;
  startTextTransitionTo(nextString);
}

function refreshResizeObserver() {
  resizeObserverRef.value?.disconnect();
  resizeObserverRef.value = null;

  if (!shouldSnapAutoWidth.value || typeof ResizeObserver === 'undefined') {
    return;
  }

  const observer = new ResizeObserver(() => {
    if (shouldSuppressAutoWidthMeasureForTextTransition()) {
      deferAutoWidthMeasure();
      return;
    }

    if (autoWidthTransitioning.value) {
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

function handlePointerDown(event: PointerEvent) {
  if (isDisabled.value) {
    return;
  }

  if (event.button !== 0) {
    return;
  }

  if (props.moveEvents === true && event.pointerType === 'mouse' && wrapperRef.value) {
    pointerZone.value = getMoveState(event.clientX, wrapperRef.value);
  }

  activePointerId.value = event.pointerId;
  pointerStartY.value = event.clientY;

  const rootElement = getRootElement();

  if (event.pointerType !== 'mouse' && rootElement?.setPointerCapture) {
    try {
      rootElement.setPointerCapture(event.pointerId);
    } catch {
      // no-op
    }
  }

  pressIn(event);
}

function handlePointerUp(event: PointerEvent) {
  if (
    activePointerId.value !== null &&
    event.pointerId !== activePointerId.value
  ) {
    return;
  }

  const rootElement = getRootElement();

  if (event.pointerType !== 'mouse' && rootElement?.releasePointerCapture) {
    try {
      rootElement.releasePointerCapture(event.pointerId);
    } catch {
      // no-op
    }
  }

  if (
    event.pointerType === 'touch' &&
    pointerStartY.value !== null &&
    wrapperRef.value
  ) {
    const diff = Math.abs(pointerStartY.value - event.clientY);
    const wrapperHeight = wrapperRef.value.offsetHeight;

    if (wrapperHeight > 0 && diff > wrapperHeight) {
      clearPress({ force: true });
      return;
    }
  }

  if (isDisabled.value) {
    activePointerId.value = null;
    pointerStartY.value = null;

    if (props.href) {
      event.preventDefault();
    }
    return;
  }

  pressOut(event, { allowRipple: true });
  activePointerId.value = null;
  pointerStartY.value = null;
}

function handlePointerCancel(event: PointerEvent) {
  if (
    activePointerId.value !== null &&
    event.pointerId !== activePointerId.value
  ) {
    return;
  }

  clearPress({ force: true });
}

function handlePointerLeave(event: PointerEvent) {
  if (event.pointerType && event.pointerType !== 'mouse') {
    return;
  }

  if (props.active === true && pressPhase.value !== 'locked') {
    clearPress({ force: true });
    return;
  }

  clearPress({ leave: true });
}

function handlePointerMove(event: PointerEvent) {
  if (
    props.moveEvents !== true ||
    isDisabled.value === true ||
    event.pointerType !== 'mouse' ||
    !wrapperRef.value
  ) {
    return;
  }

  pointerZone.value = getMoveState(event.clientX, wrapperRef.value);
}

function handleMouseEnterFallback() {
  if (props.moveEvents === true || isDisabled.value === true) {
    return;
  }

  pointerZone.value = 'middle';
}

function handleClick(event: MouseEvent) {
  if (isDisabled.value === true) {
    if (props.href) {
      event.preventDefault();
    }
    event.stopPropagation();
    return;
  }

  if (isKeyboardClick(event)) {
    handleAction(event);
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (!needsButtonRole.value || isDisabled.value) {
    return;
  }

  if (!isActivationKey(event) || event.repeat) {
    return;
  }

  if (event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault();
  }

  pressIn(event);
}

function handleKeyUp(event: KeyboardEvent) {
  if (!needsButtonRole.value || isDisabled.value) {
    return;
  }

  if (!isActivationKey(event)) {
    return;
  }

  event.preventDefault();
  pressOut(event);
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
  cancelPendingRelease();
  cancelAutoWidthTransition();
  clearAutoWidthRaf();
  clearTextTransitionRaf();
  clearTextTransitionDelayRaf();
  resizeObserverRef.value?.disconnect();
  resizeObserverRef.value = null;
});

watch(
  [() => props.active, isDisabled],
  ([active, disabled]) => {
    if (disabled) {
      cancelPendingRelease();
      clearPointerZone();
      activePointerId.value = null;
      pointerStartY.value = null;
      pressPhase.value = 'idle';
      return;
    }

    if (active) {
      cancelPendingRelease();
      clearPointerZone();
      pressPhase.value = 'locked';
      return;
    }

    if (pressPhase.value === 'locked') {
      clearPress({ force: true });
    }
  },
  {
    immediate: true,
  }
);

watch(
  [rawStringSlotValue, () => props.textTransition],
  ([nextString]) => {
    syncTextTransitionState(nextString);
  },
  {
    immediate: true,
  }
);

watch(shouldSnapAutoWidth, async () => {
  await nextTick();
  lastAutoWidthContentSignature.value = autoWidthContentSignature.value;
  refreshResizeObserver();
  scheduleAutoWidthMeasure();
});
</script>

<template>
  <component
    :is="resolvedTag"
    ref="rootRef"
    v-bind="rootAttrs"
    :class="rootClassName"
    @click="handleClick"
    @keydown="handleKeyDown"
    @keyup="handleKeyUp"
    @mouseenter="handleMouseEnterFallback"
    @pointercancel="handlePointerCancel"
    @pointerdown="handlePointerDown"
    @pointerleave="handlePointerLeave"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
  >
    <span ref="wrapperRef" class="aws-btn__wrapper">
      <span
        ref="contentRef"
        class="aws-btn__content"
        :style="contentInlineStyle"
      >
        <span v-if="hasBeforeSlot" class="aws-btn__slot aws-btn__slot--before">
          <slot name="before" />
        </span>
        <span
          v-if="shouldRenderLabel"
          ref="labelRef"
          class="aws-btn__label"
          :style="labelInlineStyle"
        >
          <template v-if="shouldRenderAnimatedText">
            {{ displayedText ?? slotString ?? '' }}
          </template>
          <slot v-else />
        </span>
        <span v-if="hasAfterSlot" class="aws-btn__slot aws-btn__slot--after">
          <slot name="after" />
        </span>
      </span>
      <span v-if="hasExtraSlot" class="aws-btn__extra">
        <slot name="extra" />
      </span>
    </span>
  </component>
</template>
