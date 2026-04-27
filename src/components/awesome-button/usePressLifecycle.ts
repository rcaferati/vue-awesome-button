import { ref, watch, type ComputedRef, type Ref } from 'vue';
import type {
  AwesomeButtonProps,
  ButtonPressEvent,
} from '../../types';
import { getMoveState, isActivationKey, isKeyboardClick } from './pressInput';
import { createRipple } from './ripple';
import { useReleaseTransition } from './useReleaseTransition';
import type {
  AwesomeButtonEmit,
  AwesomeButtonRootRefValue,
  PointerZone,
  PressPhase,
} from './types';

type UsePressLifecycleParams = {
  props: Readonly<AwesomeButtonProps>;
  emit: AwesomeButtonEmit;
  isDisabled: ComputedRef<boolean>;
  needsButtonRole: ComputedRef<boolean>;
  rootRef: Ref<AwesomeButtonRootRefValue>;
  wrapperRef: Ref<HTMLSpanElement | null>;
  contentRef: Ref<HTMLSpanElement | null>;
};

type UsePressLifecycleResult = {
  pressPhase: Ref<PressPhase>;
  pointerZone: Ref<PointerZone | null>;
  handleClick: (event: MouseEvent) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
  handleKeyUp: (event: KeyboardEvent) => void;
  handleMouseEnterFallback: () => void;
  handlePointerCancel: (event: PointerEvent) => void;
  handlePointerDown: (event: PointerEvent) => void;
  handlePointerLeave: (event: PointerEvent) => void;
  handlePointerMove: (event: PointerEvent) => void;
  handlePointerUp: (event: PointerEvent) => void;
};

export function usePressLifecycle({
  props,
  emit,
  isDisabled,
  needsButtonRole,
  rootRef,
  wrapperRef,
  contentRef,
}: UsePressLifecycleParams): UsePressLifecycleResult {
  const pressPhase = ref<PressPhase>('idle');
  const pointerZone = ref<PointerZone | null>(null);
  const activePointerId = ref<number | null>(null);
  const pointerStartY = ref<number | null>(null);
  const { cancelPendingRelease, scheduleReleaseFinalize } = useReleaseTransition({
    contentRef,
    onRelease() {
      pressPhase.value = 'idle';
      emit('released', getRootElement());
    },
  });

  function getRootElement(): HTMLElement | null {
    return rootRef.value instanceof HTMLElement ? rootRef.value : null;
  }

  function clearPointerZone() {
    pointerZone.value = null;
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
      props.ripple === true &&
      typeof PointerEvent !== 'undefined' &&
      event instanceof PointerEvent
    ) {
      createRipple(event, wrapperRef.value, contentRef.value);
    }

    handleAction(event);

    if (props.active === true) {
      clearPointerZone();
      pressPhase.value = 'locked';
      return;
    }

    clearPress();
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

  return {
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
  };
}
