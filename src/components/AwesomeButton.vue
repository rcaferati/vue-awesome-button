<script setup lang="ts">
import {
  computed,
  ref,
  useAttrs,
  useSlots,
  type ComponentPublicInstance,
} from 'vue';
import type {
  AwesomeButtonProps,
  ButtonPressEvent,
  ButtonReleasedPayload,
} from '../types';
import {
  extractStringSlotValueFromNodes,
  hasMeaningfulSlot,
} from './awesome-button/slotContent';
import { useAutoWidthBehavior } from './awesome-button/useAutoWidthBehavior';
import { usePressLifecycle } from './awesome-button/usePressLifecycle';

defineOptions({
  name: 'AwesomeButton',
  inheritAttrs: false,
});

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

const hasBeforeSlot = hasMeaningfulSlot(slots, 'before');
const hasDefaultSlot = hasMeaningfulSlot(slots, 'default');
const hasAfterSlot = hasMeaningfulSlot(slots, 'after');
const hasExtraSlot = hasMeaningfulSlot(slots, 'extra');
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

const {
  contentRef,
  labelRef,
  autoWidthReady,
  autoWidthTransitioning,
  contentInlineStyle,
  labelInlineStyle,
  slotString,
  displayedText,
  shouldRenderAnimatedText,
  shouldRenderLabel,
} = useAutoWidthBehavior({
  props,
  rawStringSlotValue,
  shouldSnapAutoWidth,
  isPlaceholder,
  isIconOnly,
  hasBeforeSlot,
  hasDefaultSlot,
  hasAfterSlot,
});

const {
  pressPhase,
  pointerZone,
  handleClick,
  handleKeyDown,
  handleKeyUp,
  handleMouseEnterFallback,
  handlePointerCancel,
  handlePointerDown,
  handlePointerLeave,
  handlePointerMove,
  handlePointerUp,
} = usePressLifecycle({
  props,
  emit,
  isDisabled,
  needsButtonRole,
  rootRef,
  wrapperRef,
  contentRef,
});

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
  props.theme ? `aws-btn--theme-${props.theme}` : null,
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
