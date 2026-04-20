<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, ref } from 'vue';
import AwesomeButton from './AwesomeButton.vue';
import { buildSharePayload, isMobile } from '../composables/sharer';
import type {
  AwesomeButtonSocialProps,
  ButtonPressEvent,
  ButtonReleasedPayload,
  SharePayload,
} from '../types';

defineOptions({
  name: 'AwesomeButtonSocial',
});

const props = withDefaults(defineProps<AwesomeButtonSocialProps>(), {
  type: 'primary',
  size: 'medium',
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
  sharer: () => ({}),
  dimensions: () => ({
    width: 640,
    height: 480,
  }),
});

const emit = defineEmits<{
  press: [event: ButtonPressEvent];
  pressed: [event: ButtonPressEvent];
  released: [payload: ButtonReleasedPayload];
}>();

const DEFAULT_POPUP_DIMENSIONS = {
  width: 640,
  height: 480,
};
const DEFAULT_WINDOW_TITLE = 'Share';

const instance = getCurrentInstance();
const mobileRef = ref(false);

onMounted(() => {
  mobileRef.value = isMobile();
});

const popupDimensions = computed(() => ({
  width: props.dimensions?.width ?? DEFAULT_POPUP_DIMENSIONS.width,
  height: props.dimensions?.height ?? DEFAULT_POPUP_DIMENSIONS.height,
}));

function hasCustomPressListener() {
  return instance?.vnode.props?.onPress != null;
}

function getUrl(): string | null {
  const raw = props.sharer?.url;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  if (typeof window !== 'undefined') {
    return window.location.href || null;
  }

  return null;
}

function getMessage(): string | null {
  const raw = props.sharer?.message;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  if (typeof document !== 'undefined') {
    const title = document.title?.trim();
    return title || null;
  }

  return null;
}

function getImage(): string | null {
  const raw = props.sharer?.image;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  if (typeof document !== 'undefined') {
    const meta = document.querySelector(
      'meta[property="og:image"]'
    ) as HTMLMetaElement | null;
    const content = meta?.getAttribute('content')?.trim();
    return content || null;
  }

  return null;
}

function createPayload(): SharePayload {
  return buildSharePayload({
    width: popupDimensions.value.width,
    height: popupDimensions.value.height,
    url: getUrl(),
    message: getMessage(),
    image: getImage(),
    type: props.type ?? '',
    user: props.sharer?.user ?? null,
    phone: props.sharer?.phone ?? null,
  });
}

async function openNativeShare(payload: SharePayload): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function'
  ) {
    return false;
  }

  try {
    await navigator.share({
      url: payload.url ?? undefined,
      text: payload.text ?? undefined,
      title: payload.title ?? undefined,
    });
    return true;
  } catch {
    return false;
  }
}

function openWindowShare(payload: SharePayload) {
  if (typeof window === 'undefined' || !payload.url) {
    return;
  }

  window.open(
    payload.url,
    payload.title || DEFAULT_WINDOW_TITLE,
    payload.extra || undefined
  );
}

async function handlePress(event: ButtonPressEvent) {
  if (hasCustomPressListener()) {
    emit('press', event);
    return;
  }

  if (props.href) {
    return;
  }

  const payload = createPayload();
  if (!payload.url) {
    return;
  }

  if (mobileRef.value) {
    const shared = await openNativeShare(payload);
    if (shared) {
      return;
    }
  }

  openWindowShare(payload);
}
</script>

<template>
  <AwesomeButton
    :type="props.type"
    :size="props.size"
    :disabled="props.disabled"
    :visible="props.visible"
    :placeholder="props.placeholder"
    :animate-size="props.animateSize"
    :text-transition="props.textTransition"
    :between="props.between"
    :ripple="props.ripple"
    :move-events="props.moveEvents"
    :href="props.href"
    :as="props.as"
    :theme="props.theme"
    @press="handlePress"
    @pressed="emit('pressed', $event)"
    @released="emit('released', $event)"
  >
    <template v-if="$slots.before" #before>
      <slot name="before" />
    </template>

    <slot />

    <template v-if="$slots.after" #after>
      <slot name="after" />
    </template>

    <template v-if="$slots.extra" #extra>
      <slot name="extra" />
    </template>
  </AwesomeButton>
</template>
