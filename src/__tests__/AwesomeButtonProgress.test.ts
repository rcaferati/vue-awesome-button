import { nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { type Mock, vi } from 'vitest';
import AwesomeButtonProgress from '../components/AwesomeButtonProgress.vue';
import type { ProgressNext } from '../types';

async function dispatchContentTransitionEnd(wrapper: VueWrapper<any>) {
  wrapper
    .get('.aws-btn__content')
    .element.dispatchEvent(new Event('transitionend', { bubbles: true }));
  await nextTick();
}

async function pressProgressButton(wrapper: VueWrapper<any>) {
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

  rootElement.dispatchEvent(
    new PointerEvent('pointerup', {
      bubbles: true,
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
    })
  );
  await nextTick();
}

function getNextCallback(pressSpy: Mock, index = 0) {
  const next = pressSpy.mock.calls[index]?.[1];

  if (!next) {
    throw new Error(`Expected press callback at index ${index}.`);
  }

  return next as ProgressNext;
}

describe('AwesomeButtonProgress', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mounts and renders forwarded slots plus the progress overlay', () => {
    const wrapper = mount(AwesomeButtonProgress, {
      props: {
        theme: 'blue',
        type: 'primary',
      },
      slots: {
        default: 'Progress',
        before: '<span data-test="before">Before</span>',
        after: '<span data-test="after">After</span>',
        extra: '<span data-test="extra">Extra</span>',
      },
    });

    expect(wrapper.text()).toContain('Progress');
    expect(wrapper.find('[data-test="before"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="after"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="extra"]').exists()).toBe(true);
    expect(wrapper.find('.aws-btn__progress').exists()).toBe(true);
  });

  it('locks active state immediately on pressed', async () => {
    const wrapper = mount(AwesomeButtonProgress, {
      slots: {
        default: 'Progress',
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

    expect(wrapper.classes()).toContain('aws-btn--progress');
    expect(wrapper.classes()).toContain('aws-btn--active');
    expect(wrapper.emitted('pressed')).toHaveLength(1);
  });

  it('calls the user press flow exactly once and ignores re-entry while busy', async () => {
    const pressSpy = vi.fn();
    const wrapper = mount(AwesomeButtonProgress, {
      attrs: {
        onPress: pressSpy,
      },
      slots: {
        default: 'Progress',
      },
    });

    await pressProgressButton(wrapper);
    expect(pressSpy).not.toHaveBeenCalled();

    await dispatchContentTransitionEnd(wrapper);

    expect(pressSpy).toHaveBeenCalledTimes(1);
    expect(wrapper.classes()).toContain('aws-btn--start');

    await pressProgressButton(wrapper);
    await dispatchContentTransitionEnd(wrapper);

    expect(pressSpy).toHaveBeenCalledTimes(1);
  });

  it('runs a success lifecycle and resets after releaseDelay', async () => {
    vi.useFakeTimers();
    const pressSpy = vi.fn();

    const wrapper = mount(AwesomeButtonProgress, {
      attrs: {
        onPress: pressSpy,
      },
      props: {
        releaseDelay: 120,
      },
      slots: {
        default: 'Progress',
      },
    });

    await pressProgressButton(wrapper);
    await dispatchContentTransitionEnd(wrapper);

    const next = getNextCallback(pressSpy);
    next(true);
    await nextTick();

    expect(wrapper.classes()).toContain('aws-btn--start');
    expect(wrapper.classes()).toContain('aws-btn--end');
    expect(wrapper.classes()).not.toContain('aws-btn--errored');

    await dispatchContentTransitionEnd(wrapper);

    vi.advanceTimersByTime(120);
    await nextTick();
    await nextTick();

    expect(wrapper.classes()).not.toContain('aws-btn--start');
    expect(wrapper.classes()).not.toContain('aws-btn--end');
    expect(wrapper.classes()).not.toContain('aws-btn--active');

    await dispatchContentTransitionEnd(wrapper);

    expect(wrapper.classes()).not.toContain('aws-btn--releasing');
  });

  it('runs an error lifecycle and uses the provided error label', async () => {
    vi.useFakeTimers();
    const pressSpy = vi.fn();

    const wrapper = mount(AwesomeButtonProgress, {
      attrs: {
        onPress: pressSpy,
      },
      props: {
        releaseDelay: 80,
      },
      slots: {
        default: 'Progress',
      },
    });

    await pressProgressButton(wrapper);
    await dispatchContentTransitionEnd(wrapper);

    const next = getNextCallback(pressSpy);
    next(false, 'Failed');
    await nextTick();

    expect(wrapper.classes()).toContain('aws-btn--end');
    expect(wrapper.classes()).toContain('aws-btn--errored');
    expect(wrapper.get('.aws-btn__progress').attributes('data-status')).toBe(
      'Failed'
    );

    await dispatchContentTransitionEnd(wrapper);

    vi.advanceTimersByTime(80);
    await nextTick();
    await nextTick();

    expect(wrapper.classes()).not.toContain('aws-btn--start');
    expect(wrapper.classes()).not.toContain('aws-btn--end');
    expect(wrapper.classes()).not.toContain('aws-btn--errored');
  });

  it('supports no-progress-bar mode while keeping the lifecycle text overlay', async () => {
    const pressSpy = vi.fn();
    const wrapper = mount(AwesomeButtonProgress, {
      attrs: {
        onPress: pressSpy,
      },
      props: {
        showProgressBar: false,
      },
      slots: {
        default: 'Progress',
      },
    });

    await pressProgressButton(wrapper);
    await dispatchContentTransitionEnd(wrapper);

    expect(wrapper.classes()).toContain('aws-btn--progress-bar-hidden');
    expect(wrapper.find('.aws-btn__progress').exists()).toBe(true);
    expect(wrapper.classes()).toContain('aws-btn--start');
  });

  it('maps progressLoadingTime to both runtime CSS variables', () => {
    const wrapper = mount(AwesomeButtonProgress, {
      props: {
        progressLoadingTime: 4321,
      },
      slots: {
        default: 'Progress',
      },
    });

    const style = wrapper.attributes('style');

    expect(style).toContain('--loading-transition-speed: 4321ms;');
    expect(style).toContain('--loading-transition-end-speed: 217ms;');
  });

  it('fails safe into an errored state when the user press listener throws synchronously', async () => {
    const wrapper = mount(AwesomeButtonProgress, {
      attrs: {
        onPress: () => {
          throw new Error('boom');
        },
      },
      slots: {
        default: 'Progress',
      },
    });

    await pressProgressButton(wrapper);
    await dispatchContentTransitionEnd(wrapper);

    expect(wrapper.classes()).toContain('aws-btn--errored');
    expect(wrapper.classes()).toContain('aws-btn--end');
    expect(wrapper.get('.aws-btn__progress').attributes('data-status')).toBe(
      'Success!'
    );
  });

  it('ignores stale next callbacks from an earlier run once a newer run has started', async () => {
    vi.useFakeTimers();
    const pressSpy = vi.fn();

    const wrapper = mount(AwesomeButtonProgress, {
      attrs: {
        onPress: pressSpy,
      },
      props: {
        releaseDelay: 50,
      },
      slots: {
        default: 'Progress',
      },
    });

    await pressProgressButton(wrapper);
    await dispatchContentTransitionEnd(wrapper);

    const nextFirst = getNextCallback(pressSpy, 0);
    nextFirst(true);
    await nextTick();
    await dispatchContentTransitionEnd(wrapper);

    vi.advanceTimersByTime(50);
    await nextTick();
    await nextTick();
    await dispatchContentTransitionEnd(wrapper);

    await pressProgressButton(wrapper);
    await dispatchContentTransitionEnd(wrapper);

    expect(pressSpy).toHaveBeenCalledTimes(2);

    nextFirst(false, 'Old');
    await nextTick();

    expect(wrapper.classes()).not.toContain('aws-btn--errored');
    expect(wrapper.get('.aws-btn__progress').attributes('data-status')).not.toBe(
      'Old'
    );
  });
});
