import { nextTick } from 'vue';
import { vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AwesomeButton from '../components/AwesomeButton.vue';

function mockRect({
  left = 0,
  top = 0,
  width = 100,
  height = 44,
}: {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}) {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => undefined,
  };
}

function setWrapperMetrics(wrapper: ReturnType<typeof mount>, width = 100, height = 44) {
  const wrapperElement = wrapper.get('.aws-btn__wrapper').element as HTMLElement;

  Object.defineProperty(wrapperElement, 'offsetWidth', {
    configurable: true,
    value: width,
  });

  Object.defineProperty(wrapperElement, 'offsetHeight', {
    configurable: true,
    value: height,
  });

  wrapperElement.getBoundingClientRect = () => mockRect({ width, height });
}

function createTransitionEnd(propertyName = 'transform') {
  const event = new Event('transitionend', { bubbles: true });

  Object.defineProperty(event, 'propertyName', {
    configurable: true,
    value: propertyName,
  });

  return event;
}

async function dispatchContentTransitionEnd(
  wrapper: ReturnType<typeof mount>,
  propertyName = 'transform'
) {
  wrapper
    .get('.aws-btn__content')
    .element.dispatchEvent(createTransitionEnd(propertyName));
  await nextTick();
}

function createRafController() {
  const callbacks: FrameRequestCallback[] = [];
  const originalRaf = window.requestAnimationFrame;
  const originalCancelRaf = window.cancelAnimationFrame;

  window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    callbacks.push(callback);
    return callbacks.length;
  }) as typeof window.requestAnimationFrame;

  window.cancelAnimationFrame = ((id: number) => {
    callbacks[id - 1] = () => undefined;
  }) as typeof window.cancelAnimationFrame;

  return {
    restore() {
      window.requestAnimationFrame = originalRaf;
      window.cancelAnimationFrame = originalCancelRaf;
    },
    flushAll(timestamp: number) {
      while (callbacks.length > 0) {
        const callback = callbacks.shift();
        callback?.(timestamp);
      }
    },
    run(timestamp: number) {
      const callback = callbacks.shift();

      if (!callback) {
        throw new Error('No queued requestAnimationFrame callback to run.');
      }

      callback(timestamp);
    },
    size() {
      return callbacks.length;
    },
  };
}

function mockAutoTextScrollWidths({
  contentMin = 80,
  contentMultiplier = 12,
  labelMin = 40,
  labelMultiplier = 8,
} = {}) {
  const originalScrollWidth = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'scrollWidth'
  );

  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get() {
      const element = this as HTMLElement;

      if (element.classList.contains('aws-btn__content')) {
        const labelText =
          element.querySelector('.aws-btn__label')?.textContent ?? '';
        return Math.max(contentMin, labelText.length * contentMultiplier);
      }

      if (element.classList.contains('aws-btn__label')) {
        return Math.max(labelMin, (element.textContent?.length ?? 0) * labelMultiplier);
      }

      return 0;
    },
  });

  return () => {
    if (originalScrollWidth) {
      Object.defineProperty(
        HTMLElement.prototype,
        'scrollWidth',
        originalScrollWidth
      );
    } else {
      delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
    }
  };
}

function runQueuedFrames(
  rafController: ReturnType<typeof createRafController>,
  timestamp: number,
  maxFrames = 10
) {
  let frameCount = 0;

  while (rafController.size() > 0 && frameCount < maxFrames) {
    rafController.run(timestamp);
    frameCount += 1;
  }

  if (rafController.size() > 0) {
    throw new Error('Exceeded queued requestAnimationFrame drain limit.');
  }
}

function mountAutoWidthTextTransitionHost({
  label,
  animateSize = true,
}: {
  label: string;
  animateSize?: boolean;
}) {
  const animateSizeAttr = animateSize ? '' : ' :animate-size="false"';
  const host = mount({
    components: { AwesomeButton },
    data: () => ({
      label,
    }),
    template: `
      <AwesomeButton text-transition :size="null"${animateSizeAttr}>
        {{ label }}
      </AwesomeButton>
    `,
  });

  return {
    host,
    vm: host.vm as unknown as { label: string },
    contentElement: host.get('.aws-btn__content').element as HTMLElement,
    labelElement: host.get('.aws-btn__label').element as HTMLElement,
  };
}

function setAutoTextElementScrollWidths(
  contentElement: HTMLElement,
  labelElement: HTMLElement,
  {
    contentMin = 80,
    contentMultiplier = 12,
    labelMin = 40,
    labelMultiplier = 8,
  } = {}
) {
  Object.defineProperty(contentElement, 'scrollWidth', {
    configurable: true,
    get: () => Math.max(contentMin, (labelElement.textContent?.length ?? 0) * contentMultiplier),
  });

  Object.defineProperty(labelElement, 'scrollWidth', {
    configurable: true,
    get: () => Math.max(labelMin, (labelElement.textContent?.length ?? 0) * labelMultiplier),
  });
}

describe('AwesomeButton', () => {
  it('renders default, named, and extra slots in the expected structure', () => {
    const wrapper = mount(AwesomeButton, {
      props: {
        theme: 'blue',
        type: 'primary',
      },
      slots: {
        default: 'Button',
        before: '<span data-test="before">Before</span>',
        after: '<span data-test="after">After</span>',
        extra: '<span data-test="extra">Extra</span>',
      },
    });

    expect(wrapper.get('.aws-btn__label').text()).toContain('Button');
    expect(wrapper.find('.aws-btn__slot--before [data-test="before"]').exists()).toBe(
      true
    );
    expect(wrapper.find('.aws-btn__slot--after [data-test="after"]').exists()).toBe(
      true
    );
    expect(wrapper.find('.aws-btn__extra [data-test="extra"]').exists()).toBe(
      true
    );
    expect(wrapper.find('.aws-btn__content [data-test="extra"]').exists()).toBe(
      false
    );
  });

  it('renders anchor mode when href is provided', () => {
    const wrapper = mount(AwesomeButton, {
      props: {
        href: 'https://github.com/rcaferati',
      },
      attrs: {
        target: '_blank',
        rel: 'noreferrer noopener',
      },
      slots: {
        default: 'Open',
      },
    });

    expect(wrapper.element.tagName).toBe('A');
    expect(wrapper.attributes('href')).toBe('https://github.com/rcaferati');
    expect(wrapper.attributes('target')).toBe('_blank');
    expect(wrapper.attributes('rel')).toBe('noreferrer noopener');
  });

  it('renders a custom root with button semantics and keyboard activation', async () => {
    const wrapper = mount(AwesomeButton, {
      props: {
        as: 'div',
      },
      slots: {
        default: 'Custom',
      },
    });

    expect(wrapper.element.tagName).toBe('DIV');
    expect(wrapper.attributes('role')).toBe('button');
    expect(wrapper.attributes('tabindex')).toBe('0');

    await wrapper.trigger('keydown', { key: ' ' });
    expect(wrapper.classes()).toContain('aws-btn--active');

    await wrapper.trigger('keyup', { key: ' ' });
    expect(wrapper.emitted('press')).toHaveLength(1);
    expect(wrapper.classes()).toContain('aws-btn--releasing');

    await dispatchContentTransitionEnd(wrapper);

    expect(wrapper.classes()).not.toContain('aws-btn--active');
    expect(wrapper.classes()).not.toContain('aws-btn--releasing');
    expect(wrapper.emitted('released')).toHaveLength(1);
  });

  it('applies default native button semantics and suppresses disabled press', async () => {
    const wrapper = mount(AwesomeButton, {
      props: {
        disabled: true,
      },
      slots: {
        default: 'Disabled',
      },
    });

    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.attributes('type')).toBe('button');
    expect(wrapper.attributes('disabled')).toBeDefined();

    await wrapper.trigger('click');

    expect(wrapper.emitted('press')).toBeUndefined();
  });

  it('adds theme, active, and class-contract modifiers', () => {
    const wrapper = mount(AwesomeButton, {
      props: {
        theme: 'blue',
        type: 'danger',
        size: 'large',
        active: true,
        between: true,
      },
      slots: {
        default: 'Danger',
      },
    });

    expect(wrapper.classes()).toContain('aws-btn');
    expect(wrapper.classes()).toContain('aws-btn--fixed');
    expect(wrapper.classes()).toContain('aws-btn--danger');
    expect(wrapper.classes()).toContain('aws-btn--large');
    expect(wrapper.classes()).toContain('aws-btn--between');
    expect(wrapper.classes()).toContain('aws-btn--theme-blue');
    expect(wrapper.classes()).toContain('aws-btn--active');
    expect(wrapper.classes()).toContain('aws-btn--animate-size');
  });

  it('allows fixed-size animation to be disabled', () => {
    const wrapper = mount(AwesomeButton, {
      props: {
        animateSize: false,
      },
      slots: {
        default: 'Instant size',
      },
    });

    expect(wrapper.classes()).toContain('aws-btn--fixed');
    expect(wrapper.classes()).not.toContain('aws-btn--animate-size');
  });

  it('keeps animated-size behavior while fixed size classes change', async () => {
    const wrapper = mount(AwesomeButton, {
      props: {
        size: 'small',
      },
      slots: {
        default: 'Resizable',
      },
    });

    expect(wrapper.classes()).toContain('aws-btn--small');
    expect(wrapper.classes()).toContain('aws-btn--animate-size');

    await wrapper.setProps({ size: 'large' });

    expect(wrapper.classes()).not.toContain('aws-btn--small');
    expect(wrapper.classes()).toContain('aws-btn--large');
    expect(wrapper.classes()).toContain('aws-btn--animate-size');
  });

  it('applies placeholder, disabled, and icon-only modifiers correctly', () => {
    const placeholderWrapper = mount(AwesomeButton, {
      props: {
        placeholder: true,
      },
    });

    expect(placeholderWrapper.classes()).toContain('aws-btn--placeholder');
    expect(placeholderWrapper.classes()).toContain('aws-btn--disabled');

    const iconWrapper = mount(AwesomeButton, {
      props: {
        size: null,
      },
      slots: {
        before: '<span data-test="icon">Icon</span>',
      },
    });

    expect(iconWrapper.classes()).toContain('aws-btn--auto');
    expect(iconWrapper.classes()).toContain('aws-btn--icon');
    expect(iconWrapper.find('.aws-btn__label').exists()).toBe(false);
  });

  it('wraps before and after icon content in centered face slots', () => {
    const wrapper = mount(AwesomeButton, {
      slots: {
        default: 'GitHub',
        before:
          '<svg data-test="before-icon" viewBox="0 0 24 24" width="16" height="16"><path d="M12 2" /></svg>',
        after:
          '<svg data-test="after-icon" viewBox="0 0 24 24" width="16" height="16"><path d="M12 2" /></svg>',
      },
    });

    const content = wrapper.get('.aws-btn__content');
    const children = Array.from(content.element.children);

    expect(children[0]).toBe(wrapper.get('.aws-btn__slot--before').element);
    expect(wrapper.find('.aws-btn__slot--before [data-test="before-icon"]').exists()).toBe(
      true
    );
    expect(children[1]).toBe(wrapper.get('.aws-btn__label').element);
    expect(children[2]).toBe(wrapper.get('.aws-btn__slot--after').element);
    expect(wrapper.find('.aws-btn__slot--after [data-test="after-icon"]').exists()).toBe(
      true
    );
  });

  it('keeps auto-width icon and label content in the centered slot contract', () => {
    const wrapper = mount(AwesomeButton, {
      props: {
        size: null,
      },
      slots: {
        default: 'GitHub Auto',
        before:
          '<svg data-test="github-icon" viewBox="0 0 24 24" width="16" height="16"><path d="M12 2" /></svg>',
      },
    });

    const content = wrapper.get('.aws-btn__content');
    const children = Array.from(content.element.children);

    expect(wrapper.classes()).toContain('aws-btn--auto');
    expect(wrapper.classes()).not.toContain('aws-btn--icon');
    expect(children[0]).toBe(wrapper.get('.aws-btn__slot--before').element);
    expect(wrapper.find('.aws-btn__slot--before [data-test="github-icon"]').exists()).toBe(
      true
    );
    expect(children[1]).toBe(wrapper.get('.aws-btn__label').element);
    expect(wrapper.get('.aws-btn__label').text()).toBe('GitHub Auto');
  });

  it('enters releasing phase on partial mouse leave and finalizes on transition end', async () => {
    const wrapper = mount(AwesomeButton, {
      slots: {
        default: 'Button',
      },
    });

    const rootElement = wrapper.element as HTMLElement;
    rootElement.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
      })
    );
    await nextTick();

    expect(wrapper.classes()).toContain('aws-btn--active');
    expect(wrapper.emitted('pressed')).toHaveLength(1);

    rootElement.dispatchEvent(
      new PointerEvent('pointerleave', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
      })
    );
    await nextTick();

    expect(wrapper.classes()).toContain('aws-btn--releasing');
    expect(wrapper.classes()).not.toContain('aws-btn--active');

    await dispatchContentTransitionEnd(wrapper);

    expect(wrapper.classes()).not.toContain('aws-btn--releasing');
    expect(wrapper.emitted('released')).toHaveLength(1);
  });

  it('ignores non-transform content transitionend events while releasing', async () => {
    const wrapper = mount(AwesomeButton, {
      slots: {
        default: 'Button',
      },
    });

    const rootElement = wrapper.element as HTMLElement;
    rootElement.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
      })
    );
    rootElement.dispatchEvent(
      new PointerEvent('pointerleave', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
      })
    );
    await nextTick();

    expect(wrapper.classes()).toContain('aws-btn--releasing');

    await dispatchContentTransitionEnd(wrapper, 'width');

    expect(wrapper.classes()).toContain('aws-btn--releasing');
    expect(wrapper.emitted('released')).toBeUndefined();

    await dispatchContentTransitionEnd(wrapper, 'transform');

    expect(wrapper.classes()).not.toContain('aws-btn--releasing');
    expect(wrapper.emitted('released')).toHaveLength(1);
  });

  it('releases the controlled active state when the prop is turned off', async () => {
    const wrapper = mount(AwesomeButton, {
      props: {
        active: true,
      },
      slots: {
        default: 'Active',
      },
    });

    expect(wrapper.classes()).toContain('aws-btn--active');

    await wrapper.setProps({ active: false });

    expect(wrapper.classes()).toContain('aws-btn--releasing');

    await dispatchContentTransitionEnd(wrapper);

    expect(wrapper.classes()).not.toContain('aws-btn--active');
    expect(wrapper.classes()).not.toContain('aws-btn--releasing');
    expect(wrapper.emitted('released')).toHaveLength(1);
  });

  it('tracks pointer zones and falls back to middle when moveEvents is disabled', async () => {
    const wrapper = mount(AwesomeButton, {
      slots: {
        default: 'Button',
      },
    });

    setWrapperMetrics(wrapper, 100, 44);

    const rootElement = wrapper.element as HTMLElement;

    rootElement.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerType: 'mouse',
        clientX: 10,
      })
    );
    await nextTick();

    expect(wrapper.classes()).toContain('aws-btn--left');

    rootElement.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerType: 'mouse',
        clientX: 90,
      })
    );
    await nextTick();

    expect(wrapper.classes()).toContain('aws-btn--right');

    rootElement.dispatchEvent(
      new PointerEvent('pointerleave', {
        bubbles: true,
        pointerType: 'mouse',
      })
    );
    await nextTick();

    expect(wrapper.classes()).not.toContain('aws-btn--left');
    expect(wrapper.classes()).not.toContain('aws-btn--right');

    const fallbackWrapper = mount(AwesomeButton, {
      props: {
        moveEvents: false,
      },
      slots: {
        default: 'Button',
      },
    });

    await fallbackWrapper.trigger('mouseenter');

    expect(fallbackWrapper.classes()).toContain('aws-btn--middle');
  });

  it('creates a ripple bubble on pointer release when ripple is enabled', async () => {
    const originalRaf = window.requestAnimationFrame;

    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof window.requestAnimationFrame;

    try {
      const wrapper = mount(AwesomeButton, {
        props: {
          ripple: true,
        },
        slots: {
          default: 'Button',
        },
      });

      setWrapperMetrics(wrapper, 100, 44);

      const rootElement = wrapper.element as HTMLElement;

      rootElement.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: 50,
          clientY: 22,
        })
      );
      rootElement.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: 50,
          clientY: 22,
        })
      );
      await nextTick();

      expect(wrapper.find('.aws-btn__bubble').exists()).toBe(true);
    } finally {
      window.requestAnimationFrame = originalRaf;
    }
  });

  it('snaps auto-width content and label widths to integer pixels', async () => {
    const rafController = createRafController();

    try {
      const wrapper = mount(AwesomeButton, {
        props: {
          size: null,
        },
        slots: {
          default: 'Auto width',
        },
      });

      const contentElement = wrapper.get('.aws-btn__content').element as HTMLElement;
      const labelElement = wrapper.get('.aws-btn__label').element as HTMLElement;

      Object.defineProperty(contentElement, 'scrollWidth', {
        configurable: true,
        get: () => 121,
      });

      Object.defineProperty(labelElement, 'scrollWidth', {
        configurable: true,
        get: () => 77,
      });

      contentElement.getBoundingClientRect = () => mockRect({ width: 121 });
      labelElement.getBoundingClientRect = () => mockRect({ width: 77 });

      rafController.flushAll(0);
      await nextTick();

      expect(contentElement.getAttribute('style')).toContain('width: 121px;');
      expect(contentElement.style.flexBasis).toBe('121px');
      expect(contentElement.style.flexGrow).toBe('0');
      expect(contentElement.style.flexShrink).toBe('0');
      expect(labelElement.getAttribute('style')).toContain('width: 77px;');
      expect(labelElement.style.flexBasis).toBe('77px');
      expect(labelElement.style.flexGrow).toBe('0');
      expect(labelElement.style.flexShrink).toBe('0');
      expect(wrapper.classes()).toContain('aws-btn--auto-size-ready');
    } finally {
      rafController.restore();
    }
  });

  it('snaps the initial auto-width measurement instantly and marks it ready', async () => {
    const rafController = createRafController();

    try {
      const wrapper = mount(AwesomeButton, {
        props: {
          size: null,
        },
        slots: {
          default: 'Auto width',
        },
      });

      const contentElement = wrapper.get('.aws-btn__content').element as HTMLElement;
      const labelElement = wrapper.get('.aws-btn__label').element as HTMLElement;

      Object.defineProperty(contentElement, 'scrollWidth', {
        configurable: true,
        get: () => 118,
      });
      Object.defineProperty(labelElement, 'scrollWidth', {
        configurable: true,
        get: () => 74,
      });

      rafController.flushAll(0);
      await nextTick();

      expect(contentElement.getAttribute('style')).toContain('width: 118px;');
      expect(labelElement.getAttribute('style')).toContain('width: 74px;');
      expect(wrapper.classes()).toContain('aws-btn--auto-size-ready');
      expect(wrapper.classes()).not.toContain('aws-btn--auto-size-transitioning');
    } finally {
      rafController.restore();
    }
  });

  it('keeps auto-width interaction updates out of the size measurement path', async () => {
    const rafController = createRafController();

    try {
      const wrapper = mount(AwesomeButton, {
        props: {
          size: null,
        },
        slots: {
          default: 'Auto width',
        },
      });

      const rootElement = wrapper.element as HTMLElement;
      const contentElement = wrapper.get('.aws-btn__content').element as HTMLElement;
      const labelElement = wrapper.get('.aws-btn__label').element as HTMLElement;

      setWrapperMetrics(wrapper, 120, 44);

      Object.defineProperty(contentElement, 'scrollWidth', {
        configurable: true,
        get: () => 120,
      });
      Object.defineProperty(labelElement, 'scrollWidth', {
        configurable: true,
        get: () => 80,
      });

      rafController.flushAll(0);
      await nextTick();

      expect(wrapper.classes()).toContain('aws-btn--auto-size-ready');
      expect(rafController.size()).toBe(0);

      rootElement.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerType: 'mouse',
          clientX: 60,
        })
      );
      await nextTick();

      expect(wrapper.classes()).toContain('aws-btn--middle');
      expect(wrapper.classes()).not.toContain('aws-btn--auto-size-transitioning');
      expect(contentElement.style.transition).not.toBe('none');
      expect(rafController.size()).toBe(0);

      rootElement.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: 60,
          clientY: 22,
        })
      );
      await nextTick();

      expect(wrapper.classes()).toContain('aws-btn--active');
      expect(wrapper.classes()).not.toContain('aws-btn--auto-size-transitioning');
      expect(contentElement.style.transition).not.toBe('none');
      expect(rafController.size()).toBe(0);

      rootElement.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: 60,
          clientY: 22,
        })
      );
      await nextTick();

      expect(wrapper.classes()).toContain('aws-btn--releasing');
      expect(wrapper.classes()).not.toContain('aws-btn--auto-size-transitioning');
      expect(contentElement.style.transition).not.toBe('none');
      expect(rafController.size()).toBe(0);

      contentElement.dispatchEvent(createTransitionEnd('transform'));
      await nextTick();

      expect(wrapper.classes()).not.toContain('aws-btn--releasing');
      expect(rafController.size()).toBe(0);
    } finally {
      rafController.restore();
    }
  });

  it('updates auto-width targets on label changes while preserving animation classes', async () => {
    const rafController = createRafController();

    try {
      const host = mount({
        components: { AwesomeButton },
        data: () => ({
          label: 'Open',
        }),
        template: `
          <AwesomeButton :size="null">
            {{ label }}
          </AwesomeButton>
        `,
      });

      const contentElement = host.get('.aws-btn__content').element as HTMLElement;
      const labelElement = host.get('.aws-btn__label').element as HTMLElement;

      Object.defineProperty(contentElement, 'scrollWidth', {
        configurable: true,
        get: () => Math.max(80, (labelElement.textContent?.length ?? 0) * 12),
      });
      Object.defineProperty(labelElement, 'scrollWidth', {
        configurable: true,
        get: () => Math.max(40, (labelElement.textContent?.length ?? 0) * 8),
      });

      rafController.flushAll(0);
      await nextTick();

      expect(host.classes()).toContain('aws-btn--auto-size-ready');
      expect(contentElement.getAttribute('style')).toContain('width: 80px;');

      (host.vm as unknown as { label: string }).label = 'Open dashboard';
      await nextTick();
      rafController.flushAll(100);
      await nextTick();

      expect(host.classes()).toContain('aws-btn--animate-size');
      expect(host.classes()).toContain('aws-btn--auto-size-ready');
      expect(host.classes()).toContain('aws-btn--auto-size-transitioning');
      expect(contentElement.getAttribute('style')).toContain('width: 168px;');
      expect(labelElement.getAttribute('style')).toContain('width: 112px;');

      contentElement.dispatchEvent(createTransitionEnd('width'));
      await nextTick();

      expect(host.classes()).not.toContain('aws-btn--auto-size-transitioning');
    } finally {
      rafController.restore();
    }
  });

  it('commits the old auto-width pixel size before applying the next animated target', async () => {
    const rafController = createRafController();

    try {
      const host = mount({
        components: { AwesomeButton },
        data: () => ({
          label: 'Open',
        }),
        template: `
          <AwesomeButton :size="null">
            {{ label }}
          </AwesomeButton>
        `,
      });

      const contentElement = host.get('.aws-btn__content').element as HTMLElement;
      const labelElement = host.get('.aws-btn__label').element as HTMLElement;

      Object.defineProperty(contentElement, 'scrollWidth', {
        configurable: true,
        get: () => Math.max(80, (labelElement.textContent?.length ?? 0) * 12),
      });
      Object.defineProperty(labelElement, 'scrollWidth', {
        configurable: true,
        get: () => Math.max(40, (labelElement.textContent?.length ?? 0) * 8),
      });

      rafController.flushAll(0);
      await nextTick();
      rafController.flushAll(1);
      await nextTick();

      expect(contentElement.style.width).toBe('80px');
      expect(labelElement.style.width).toBe('40px');

      (host.vm as unknown as { label: string }).label = 'Open dashboard';
      await nextTick();

      rafController.run(100);
      await nextTick();

      expect(host.classes()).toContain('aws-btn--auto-size-transitioning');
      expect(contentElement.style.width).toBe('80px');
      expect(labelElement.style.width).toBe('40px');

      rafController.run(116);
      await nextTick();

      expect(contentElement.style.width).toBe('168px');
      expect(labelElement.style.width).toBe('112px');
    } finally {
      rafController.restore();
    }
  });

  it('keeps auto-width snapping but disables auto-size transition classes when animateSize is false', async () => {
    const rafController = createRafController();

    try {
      const wrapper = mount(AwesomeButton, {
        props: {
          size: null,
          animateSize: false,
        },
        slots: {
          default: 'Auto width',
        },
      });

      const contentElement = wrapper.get('.aws-btn__content').element as HTMLElement;
      const labelElement = wrapper.get('.aws-btn__label').element as HTMLElement;

      Object.defineProperty(contentElement, 'scrollWidth', {
        configurable: true,
        get: () => 122,
      });
      Object.defineProperty(labelElement, 'scrollWidth', {
        configurable: true,
        get: () => 82,
      });

      rafController.flushAll(0);
      await nextTick();

      expect(contentElement.getAttribute('style')).toContain('width: 122px;');
      expect(labelElement.getAttribute('style')).toContain('width: 82px;');
      expect(wrapper.classes()).not.toContain('aws-btn--animate-size');
      expect(wrapper.classes()).not.toContain('aws-btn--auto-size-ready');
    } finally {
      rafController.restore();
    }
  });

  it('defers ResizeObserver auto-width remeasurement during active size transitions', async () => {
    vi.useFakeTimers();
    const rafController = createRafController();
    const originalResizeObserver = globalThis.ResizeObserver;
    const resizeCallbackRef: {
      current?: ResizeObserverCallback;
    } = {};

    class MockResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallbackRef.current = callback;
      }

      observe() {}
      disconnect() {}
    }

    globalThis.ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;

    try {
      const host = mount({
        components: { AwesomeButton },
        data: () => ({
          label: 'Open',
          forcedContentWidth: 80,
          forcedLabelWidth: 40,
        }),
        template: `
          <AwesomeButton :size="null">
            {{ label }}
          </AwesomeButton>
        `,
      });

      const vm = host.vm as unknown as {
        label: string;
        forcedContentWidth: number;
        forcedLabelWidth: number;
      };
      const contentElement = host.get('.aws-btn__content').element as HTMLElement;
      const labelElement = host.get('.aws-btn__label').element as HTMLElement;

      Object.defineProperty(contentElement, 'scrollWidth', {
        configurable: true,
        get: () => vm.forcedContentWidth,
      });
      Object.defineProperty(labelElement, 'scrollWidth', {
        configurable: true,
        get: () => vm.forcedLabelWidth,
      });

      rafController.flushAll(0);
      await nextTick();

      vm.label = 'Open dashboard';
      vm.forcedContentWidth = 168;
      vm.forcedLabelWidth = 112;
      await nextTick();
      rafController.flushAll(100);
      await nextTick();

      expect(host.classes()).toContain('aws-btn--auto-size-transitioning');

      rafController.flushAll(120);
      await nextTick();

      expect(rafController.size()).toBe(0);

      vm.forcedContentWidth = 196;
      vm.forcedLabelWidth = 140;
      const callback = resizeCallbackRef.current;

      if (!callback) {
        throw new Error('Expected ResizeObserver callback to be registered.');
      }

      callback([], {} as ResizeObserver);

      expect(rafController.size()).toBe(0);

      contentElement.dispatchEvent(createTransitionEnd('width'));
      await nextTick();

      expect(rafController.size()).toBe(1);

      rafController.flushAll(200);
      await nextTick();

      expect(contentElement.getAttribute('style')).toContain('width: 196px;');
      expect(labelElement.getAttribute('style')).toContain('width: 140px;');
    } finally {
      globalThis.ResizeObserver = originalResizeObserver;
      rafController.restore();
      vi.useRealTimers();
    }
  });

  it('replays deferred auto-width remeasurement after grow-text choreography completes', async () => {
    const rafController = createRafController();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const performanceSpy = vi
      .spyOn(window.performance, 'now')
      .mockReturnValue(0);
    const originalResizeObserver = globalThis.ResizeObserver;
    const resizeCallbackRef: {
      current?: ResizeObserverCallback;
    } = {};
    const restoreScrollWidth = mockAutoTextScrollWidths();

    class MockResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallbackRef.current = callback;
      }

      observe() {}
      disconnect() {}
    }

    globalThis.ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;

    try {
      const { host, vm, contentElement, labelElement } =
        mountAutoWidthTextTransitionHost({
          label: 'Open',
        });

      let useForcedWidths = false;

      Object.defineProperty(contentElement, 'scrollWidth', {
        configurable: true,
        get: () =>
          useForcedWidths
            ? 196
            : Math.max(80, (labelElement.textContent?.length ?? 0) * 12),
      });

      Object.defineProperty(labelElement, 'scrollWidth', {
        configurable: true,
        get: () =>
          useForcedWidths
            ? 140
            : Math.max(40, (labelElement.textContent?.length ?? 0) * 8),
      });

      rafController.flushAll(0);
      await nextTick();
      rafController.flushAll(1);
      await nextTick();

      expect(contentElement.style.width).toBe('80px');
      expect(labelElement.style.width).toBe('40px');

      vm.label = 'Open dashboard';
      await nextTick();

      rafController.run(16);
      await nextTick();

      expect(contentElement.style.width).toBe('168px');
      expect(labelElement.style.width).toBe('112px');

      contentElement.dispatchEvent(createTransitionEnd('width'));
      await nextTick();

      useForcedWidths = true;

      const callback = resizeCallbackRef.current;

      if (!callback) {
        throw new Error('Expected ResizeObserver callback to be registered.');
      }

      callback([], {} as ResizeObserver);

      expect(contentElement.style.width).toBe('168px');
      expect(labelElement.style.width).toBe('112px');

      rafController.flushAll(500);
      await nextTick();
      await nextTick();

      rafController.flushAll(516);
      await nextTick();

      expect(labelElement.textContent).toBe('Open dashboard');
      expect(contentElement.style.width).toBe('196px');
      expect(labelElement.style.width).toBe('140px');
    } finally {
      restoreScrollWidth();
      globalThis.ResizeObserver = originalResizeObserver;
      rafController.restore();
      randomSpy.mockRestore();
      performanceSpy.mockRestore();
    }
  });

  it('animates string-only textTransition labels and settles to the next string', async () => {
    const rafController = createRafController();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const performanceSpy = vi
      .spyOn(window.performance, 'now')
      .mockReturnValue(0);

    try {
      const host = mount({
        components: { AwesomeButton },
        data: () => ({
          label: 'Save',
        }),
        template: `
          <AwesomeButton text-transition theme="blue">
            {{ label }}
          </AwesomeButton>
        `,
      });

      const labelElement = () => host.get('.aws-btn__label');

      await nextTick();
      rafController.flushAll(0);
      await nextTick();

      expect(labelElement().text()).toBe('Save');

      (host.vm as unknown as { label: string }).label = 'Submit';
      await nextTick();

      expect(labelElement().text()).toBe('Save');
      expect(rafController.size()).toBeGreaterThan(0);

      rafController.run(100);
      await nextTick();

      expect(labelElement().text()).not.toBe('Save');
      expect(labelElement().text()).not.toBe('Submit');

      rafController.run(400);
      await nextTick();

      expect(labelElement().text()).toBe('Submit');
    } finally {
      rafController.restore();
      randomSpy.mockRestore();
      performanceSpy.mockRestore();
    }
  });

  it('does not start a new text transition when the string is unchanged', async () => {
    const rafController = createRafController();

    try {
      const host = mount({
        components: { AwesomeButton },
        data: () => ({
          label: 'Save',
        }),
        template: `
          <AwesomeButton text-transition>
            {{ label }}
          </AwesomeButton>
        `,
      });

      await nextTick();
      rafController.flushAll(0);
      await nextTick();

      (host.vm as unknown as { label: string }).label = 'Save';
      await nextTick();

      expect(rafController.size()).toBe(0);
    } finally {
      rafController.restore();
    }
  });

  it('bypasses textTransition for non-string slot content', async () => {
    const rafController = createRafController();

    try {
      const wrapper = mount(AwesomeButton, {
        props: {
          textTransition: true,
        },
        slots: {
          default: '<strong data-test="node">Rich label</strong>',
        },
      });

      await nextTick();
      rafController.flushAll(0);
      await nextTick();

      expect(wrapper.find('[data-test="node"]').exists()).toBe(true);
      expect(wrapper.get('.aws-btn__label').text()).toContain('Rich label');
      expect(rafController.size()).toBe(0);
    } finally {
      rafController.restore();
    }
  });

  it('remeasures auto-width against the animated textTransition label state', async () => {
    const rafController = createRafController();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const performanceSpy = vi
      .spyOn(window.performance, 'now')
      .mockReturnValue(0);
    const originalScrollWidth = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollWidth'
    );

    try {
      Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
        configurable: true,
        get() {
          const element = this as HTMLElement;

          if (element.classList.contains('aws-btn__content')) {
            const labelText =
              element.querySelector('.aws-btn__label')?.textContent ?? '';
            return Math.max(60, labelText.length * 14);
          }

          if (element.classList.contains('aws-btn__label')) {
            return Math.max(40, (element.textContent?.length ?? 0) * 10);
          }

          return 0;
        },
      });

      const host = mount({
        components: { AwesomeButton },
        data: () => ({
          label: 'Proceed',
        }),
        template: `
          <AwesomeButton text-transition :size="null">
            {{ label }}
          </AwesomeButton>
        `,
      });

      const contentElement = host.get('.aws-btn__content').element as HTMLElement;
      const labelElement = host.get('.aws-btn__label').element as HTMLElement;

      Object.defineProperty(contentElement, 'scrollWidth', {
        configurable: true,
        get: () => Math.max(60, (labelElement.textContent?.length ?? 0) * 14),
      });

      Object.defineProperty(labelElement, 'scrollWidth', {
        configurable: true,
        get: () => Math.max(40, (labelElement.textContent?.length ?? 0) * 10),
      });

      contentElement.getBoundingClientRect = () =>
        mockRect({
          width: Math.max(60, (labelElement.textContent?.length ?? 0) * 14),
        });
      labelElement.getBoundingClientRect = () =>
        mockRect({
          width: Math.max(40, (labelElement.textContent?.length ?? 0) * 10),
        });

      await nextTick();
      rafController.flushAll(0);
      await nextTick();

      (host.vm as unknown as { label: string }).label = 'Go';
      await nextTick();

      rafController.flushAll(400);
      await nextTick();
      rafController.flushAll(400);
      await nextTick();

      expect(contentElement.getAttribute('style')).toContain('width: 60px;');
      expect(labelElement.getAttribute('style')).toContain('width: 40px;');
    } finally {
      if (originalScrollWidth) {
        Object.defineProperty(
          HTMLElement.prototype,
          'scrollWidth',
          originalScrollWidth
        );
      } else {
        delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
      }
      rafController.restore();
      randomSpy.mockRestore();
      performanceSpy.mockRestore();
    }
  });

  it('grows auto-width before starting textTransition', async () => {
    const rafController = createRafController();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const performanceSpy = vi
      .spyOn(window.performance, 'now')
      .mockReturnValue(0);
    const restoreScrollWidth = mockAutoTextScrollWidths();

    try {
      const { host, vm, contentElement, labelElement } =
        mountAutoWidthTextTransitionHost({
          label: 'Open',
        });

      setAutoTextElementScrollWidths(contentElement, labelElement);

      rafController.flushAll(0);
      await nextTick();
      rafController.flushAll(1);
      await nextTick();

      expect(contentElement.style.width).toBe('80px');
      expect(labelElement.style.width).toBe('40px');
      expect(labelElement.textContent).toBe('Open');

      vm.label = 'Open dashboard';
      await nextTick();

      expect(host.classes()).toContain('aws-btn--auto-size-transitioning');
      expect(contentElement.style.width).toBe('80px');
      expect(labelElement.style.width).toBe('40px');
      expect(labelElement.textContent).toBe('Open');

      rafController.run(16);
      await nextTick();

      expect(contentElement.style.width).toBe('168px');
      expect(labelElement.style.width).toBe('112px');
      expect(labelElement.textContent).toBe('Open');

      contentElement.dispatchEvent(createTransitionEnd('width'));
      await nextTick();

      expect(host.classes()).not.toContain('aws-btn--auto-size-transitioning');
      expect(contentElement.style.width).toBe('168px');

      for (const timestamp of [500, 600, 700]) {
        rafController.flushAll(timestamp);
        await nextTick();
        await nextTick();
        expect(contentElement.style.width).toBe('168px');
      }

      rafController.flushAll(800);
      await nextTick();
      await nextTick();

      expect(contentElement.style.width).toBe('168px');
      expect(labelElement.textContent).toBe('Open dashboard');
    } finally {
      restoreScrollWidth();
      rafController.restore();
      randomSpy.mockRestore();
      performanceSpy.mockRestore();
    }
  });

  it('runs textTransition before shrinking auto-width', async () => {
    const rafController = createRafController();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const performanceSpy = vi
      .spyOn(window.performance, 'now')
      .mockReturnValue(0);
    const restoreScrollWidth = mockAutoTextScrollWidths();

    try {
      const { host, vm, contentElement, labelElement } =
        mountAutoWidthTextTransitionHost({
          label: 'Open dashboard',
        });

      rafController.flushAll(0);
      await nextTick();
      rafController.flushAll(1);
      await nextTick();

      expect(contentElement.style.width).toBe('168px');
      expect(labelElement.style.width).toBe('112px');
      expect(labelElement.textContent).toBe('Open dashboard');

      vm.label = 'Open';
      await nextTick();

      expect(host.classes()).not.toContain('aws-btn--auto-size-transitioning');
      expect(contentElement.style.width).toBe('168px');
      expect(labelElement.style.width).toBe('112px');
      expect(labelElement.textContent).toBe('Open dashboard');

      rafController.run(100);
      await nextTick();

      expect(contentElement.style.width).toBe('168px');
      expect(labelElement.style.width).toBe('112px');
      expect(labelElement.textContent).not.toBe('Open dashboard');
      expect(labelElement.textContent).not.toBe('Open');

      rafController.run(400);
      await nextTick();

      expect(labelElement.textContent).toBe('Open');
      expect(host.classes()).toContain('aws-btn--auto-size-transitioning');
      expect(contentElement.style.width).toBe('168px');

      rafController.run(416);
      await nextTick();

      expect(contentElement.style.width).toBe('80px');
      expect(labelElement.style.width).toBe('40px');
    } finally {
      restoreScrollWidth();
      rafController.restore();
      randomSpy.mockRestore();
      performanceSpy.mockRestore();
    }
  });

  it('snaps growth first when auto-width textTransition has animateSize disabled', async () => {
    const rafController = createRafController();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const performanceSpy = vi
      .spyOn(window.performance, 'now')
      .mockReturnValue(0);
    const restoreScrollWidth = mockAutoTextScrollWidths();

    try {
      const { host, vm, contentElement, labelElement } =
        mountAutoWidthTextTransitionHost({
          label: 'Open',
          animateSize: false,
        });

      rafController.flushAll(0);
      await nextTick();

      expect(contentElement.style.width).toBe('80px');
      expect(labelElement.textContent).toBe('Open');

      vm.label = 'Open dashboard';
      await nextTick();

      expect(host.classes()).not.toContain('aws-btn--auto-size-transitioning');
      expect(contentElement.style.width).toBe('168px');
      expect(labelElement.style.width).toBe('112px');
      expect(labelElement.textContent).toBe('Open');

      runQueuedFrames(rafController, 400);
      await nextTick();

      expect(labelElement.textContent).toBe('Open dashboard');
    } finally {
      restoreScrollWidth();
      rafController.restore();
      randomSpy.mockRestore();
      performanceSpy.mockRestore();
    }
  });

  it('runs textTransition before snapping shrink when animateSize is disabled', async () => {
    const rafController = createRafController();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const performanceSpy = vi
      .spyOn(window.performance, 'now')
      .mockReturnValue(0);
    const restoreScrollWidth = mockAutoTextScrollWidths();

    try {
      const { host, vm, contentElement, labelElement } =
        mountAutoWidthTextTransitionHost({
          label: 'Open dashboard',
          animateSize: false,
        });

      rafController.flushAll(0);
      await nextTick();

      expect(contentElement.style.width).toBe('168px');
      expect(labelElement.textContent).toBe('Open dashboard');

      vm.label = 'Open';
      await nextTick();

      expect(contentElement.style.width).toBe('168px');
      expect(labelElement.textContent).toBe('Open dashboard');

      rafController.flushAll(400);
      await nextTick();

      expect(labelElement.textContent).toBe('Open');
      expect(contentElement.style.width).toBe('80px');
      expect(labelElement.style.width).toBe('40px');
      expect(host.classes()).not.toContain('aws-btn--auto-size-transitioning');
    } finally {
      restoreScrollWidth();
      rafController.restore();
      randomSpy.mockRestore();
      performanceSpy.mockRestore();
    }
  });

  it('starts textTransition immediately when auto-width target size is unchanged', async () => {
    const rafController = createRafController();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const performanceSpy = vi
      .spyOn(window.performance, 'now')
      .mockReturnValue(0);
    const restoreScrollWidth = mockAutoTextScrollWidths();

    try {
      const host = mount({
        components: { AwesomeButton },
        data: () => ({
          label: 'Save',
        }),
        template: `
          <AwesomeButton text-transition :size="null">
            {{ label }}
          </AwesomeButton>
        `,
      });

      const contentElement = host.get('.aws-btn__content').element as HTMLElement;
      const labelElement = host.get('.aws-btn__label').element as HTMLElement;

      rafController.flushAll(0);
      await nextTick();

      expect(contentElement.style.width).toBe('80px');

      (host.vm as unknown as { label: string }).label = 'Open';
      await nextTick();

      expect(host.classes()).not.toContain('aws-btn--auto-size-transitioning');
      expect(contentElement.style.width).toBe('80px');
      expect(labelElement.textContent).toBe('Save');

      expect(rafController.size()).toBeGreaterThan(0);

      runQueuedFrames(rafController, 400);
      await nextTick();

      expect(labelElement.textContent).toBe('Open');
      expect(contentElement.style.width).toBe('80px');
    } finally {
      restoreScrollWidth();
      rafController.restore();
      randomSpy.mockRestore();
      performanceSpy.mockRestore();
    }
  });

  it('cancels stale shrink choreography when auto-width text changes again', async () => {
    const rafController = createRafController();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const performanceSpy = vi
      .spyOn(window.performance, 'now')
      .mockReturnValue(0);
    const restoreScrollWidth = mockAutoTextScrollWidths();

    try {
      const host = mount({
        components: { AwesomeButton },
        data: () => ({
          label: 'Open dashboard',
        }),
        template: `
          <AwesomeButton text-transition :size="null">
            {{ label }}
          </AwesomeButton>
        `,
      });

      const contentElement = host.get('.aws-btn__content').element as HTMLElement;
      const labelElement = host.get('.aws-btn__label').element as HTMLElement;
      const vm = host.vm as unknown as { label: string };

      rafController.flushAll(0);
      await nextTick();
      rafController.flushAll(1);
      await nextTick();

      expect(contentElement.style.width).toBe('168px');

      vm.label = 'Open';
      await nextTick();

      expect(contentElement.style.width).toBe('168px');
      expect(labelElement.textContent).toBe('Open dashboard');

      vm.label = 'Open analytics dashboard';
      await nextTick();

      expect(host.classes()).toContain('aws-btn--auto-size-transitioning');
      expect(contentElement.style.width).toBe('168px');
      expect(labelElement.textContent).toBe('Open dashboard');

      rafController.flushAll(16);
      await nextTick();

      expect(contentElement.style.width).toBe('288px');
      expect(labelElement.style.width).toBe('192px');

      contentElement.dispatchEvent(createTransitionEnd('width'));
      await nextTick();

      for (const timestamp of [500, 600, 700, 800]) {
        rafController.flushAll(timestamp);
        await nextTick();
      }

      expect(labelElement.textContent).toBe('Open analytics dashboard');
      expect(labelElement.textContent).not.toBe('Open');
    } finally {
      restoreScrollWidth();
      rafController.restore();
      randomSpy.mockRestore();
      performanceSpy.mockRestore();
    }
  });
});
