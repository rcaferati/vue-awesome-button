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

async function dispatchContentTransitionEnd(wrapper: ReturnType<typeof mount>) {
  wrapper
    .get('.aws-btn__content')
    .element.dispatchEvent(new Event('transitionend', { bubbles: true }));
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
    const originalRaf = window.requestAnimationFrame;
    const originalCancelRaf = window.cancelAnimationFrame;

    try {
      window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }) as typeof window.requestAnimationFrame;
      window.cancelAnimationFrame = (() => {}) as typeof window.cancelAnimationFrame;

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

      await wrapper.setProps({ between: true });
      await nextTick();

      expect(contentElement.getAttribute('style')).toContain('width: 121px;');
      expect(contentElement.getAttribute('style')).toContain('flex: 0 0 121px;');
      expect(labelElement.getAttribute('style')).toContain('width: 77px;');
      expect(labelElement.getAttribute('style')).toContain('flex: 0 0 77px;');
    } finally {
      window.requestAnimationFrame = originalRaf;
      window.cancelAnimationFrame = originalCancelRaf;
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

    try {
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
      rafController.restore();
      randomSpy.mockRestore();
      performanceSpy.mockRestore();
    }
  });
});
