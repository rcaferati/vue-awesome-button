import {
  Fragment,
  createCommentVNode,
  createTextVNode,
  h,
  type VNode,
} from 'vue';
import { describe, expect, it, vi } from 'vitest';
import {
  captureAutoWidthInlineStyleSnapshot,
  getAutoTextTransitionFlow,
  readClonedAutoWidths,
  readSnappedWidth,
  restoreAutoWidthInlineStyles,
} from '../components/awesome-button/autoWidthMeasurement';
import { getMoveState, isActivationKey, isKeyboardClick } from '../components/awesome-button/pressInput';
import {
  extractStringSlotValueFromNodes,
  isMeaningfulVNode,
} from '../components/awesome-button/slotContent';
import { buildTextTransitionFrame } from '../components/awesome-button/textTransitionFrame';
import {
  isAutoWidthTransitionEnd,
  isTransformTransitionEnd,
} from '../components/awesome-button/transitionEvents';

function mockRect(width: number) {
  return {
    left: 0,
    top: 0,
    right: width,
    bottom: 10,
    width,
    height: 10,
    x: 0,
    y: 0,
    toJSON: () => undefined,
  };
}

function createTransitionEnd(propertyName: string) {
  const event = new Event('transitionend');

  Object.defineProperty(event, 'propertyName', {
    configurable: true,
    value: propertyName,
  });

  return event;
}

describe('awesome-button internals', () => {
  it('detects meaningful slot nodes and extracts string-only slot content', () => {
    expect(isMeaningfulVNode(createCommentVNode('comment'))).toBe(false);
    expect(isMeaningfulVNode(createTextVNode('   '))).toBe(false);
    expect(isMeaningfulVNode(h('span'))).toBe(true);

    const textOnlyNodes = [
      createTextVNode(' Save '),
      h(Fragment, null, [createTextVNode('\nchanges')]),
    ] as VNode[];

    expect(extractStringSlotValueFromNodes(textOnlyNodes)).toBe('Save changes');
    expect(extractStringSlotValueFromNodes([h('strong', 'Save')])).toBeNull();
  });

  it('maps pointer coordinates and activation events', () => {
    const element = document.createElement('span');

    Object.defineProperty(element, 'offsetWidth', {
      configurable: true,
      value: 100,
    });
    element.getBoundingClientRect = () => ({
      ...mockRect(100),
      left: 10,
      right: 110,
    });

    expect(getMoveState(25, element)).toBe('left');
    expect(getMoveState(60, element)).toBe('middle');
    expect(getMoveState(90, element)).toBe('right');
    expect(isActivationKey(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(
      true
    );
    expect(isActivationKey(new KeyboardEvent('keydown', { key: 'Escape' }))).toBe(
      false
    );
    expect(isKeyboardClick(new MouseEvent('click', { detail: 0 }))).toBe(true);
  });

  it('filters transitionend events by property contract', () => {
    expect(isTransformTransitionEnd(createTransitionEnd('transform'))).toBe(true);
    expect(isTransformTransitionEnd(createTransitionEnd('width'))).toBe(false);
    expect(isAutoWidthTransitionEnd(createTransitionEnd('width'))).toBe(true);
    expect(isAutoWidthTransitionEnd(createTransitionEnd('flex-basis'))).toBe(true);
    expect(isAutoWidthTransitionEnd(createTransitionEnd('opacity'))).toBe(false);
  });

  it('builds deterministic final text-transition frames', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    try {
      expect(buildTextTransitionFrame('Save', 'Done', 1)).toBe('Done');
      expect(buildTextTransitionFrame('A B', 'C D', 0.2)[1]).toBe(' ');
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('reads snapped widths and cloned auto-width targets', () => {
    const originalScrollWidth = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollWidth'
    );
    const wrapper = document.createElement('div');
    const content = document.createElement('span');
    const label = document.createElement('span');

    content.className = 'aws-btn__content';
    label.className = 'aws-btn__label';
    label.textContent = 'Old';
    content.appendChild(label);
    wrapper.appendChild(content);
    document.body.appendChild(wrapper);

    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get() {
        const element = this as HTMLElement;

        if (element.classList.contains('aws-btn__content')) {
          return (element.querySelector('.aws-btn__label')?.textContent?.length ?? 0) * 10;
        }

        if (element.classList.contains('aws-btn__label')) {
          return (element.textContent?.length ?? 0) * 5;
        }

        return 0;
      },
    });

    try {
      const fallbackElement = document.createElement('span');

      fallbackElement.getBoundingClientRect = () => mockRect(12.4);

      expect(readSnappedWidth(fallbackElement)).toBe(13);
      expect(readClonedAutoWidths(content, 'Target')).toEqual({
        content: 60,
        label: 30,
      });
      expect(wrapper.children).toHaveLength(1);
    } finally {
      wrapper.remove();
      if (originalScrollWidth) {
        Object.defineProperty(
          HTMLElement.prototype,
          'scrollWidth',
          originalScrollWidth
        );
      } else {
        delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
      }
    }
  });

  it('captures and restores auto-width inline styles and flow choices', () => {
    const content = document.createElement('span');
    const label = document.createElement('span');

    content.style.width = '120px';
    content.style.flexBasis = '120px';
    content.style.flexGrow = '0';
    content.style.flexShrink = '0';
    content.style.transition = 'width 150ms';
    label.style.width = '80px';
    label.style.flexBasis = '80px';
    label.style.flexGrow = '0';
    label.style.flexShrink = '0';
    label.style.transition = 'width 150ms';

    const snapshot = captureAutoWidthInlineStyleSnapshot(content, label);

    content.style.width = 'auto';
    label.style.width = 'auto';
    restoreAutoWidthInlineStyles(content, label, snapshot);

    expect(content.style.width).toBe('120px');
    expect(label.style.width).toBe('80px');
    expect(getAutoTextTransitionFlow({ content: 80, label: 40 }, null)).toBeNull();
    expect(
      getAutoTextTransitionFlow({ content: 80, label: 40 }, { content: 100, label: 50 })
    ).toBe('grow-first');
    expect(
      getAutoTextTransitionFlow({ content: 80, label: 40 }, { content: 60, label: 30 })
    ).toBe('text-first');
    expect(
      getAutoTextTransitionFlow({ content: 80, label: 40 }, { content: 80, label: 40 })
    ).toBe('text-only');
  });
});
