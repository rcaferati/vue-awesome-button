import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';
import AwesomeButtonSocial from '../components/AwesomeButtonSocial.vue';

async function pressButton(wrapper: ReturnType<typeof mount>) {
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

describe('AwesomeButtonSocial', () => {
  afterEach(() => {
    document.title = '';
    document.head
      .querySelectorAll('meta[property="og:image"]')
      .forEach((element) => element.remove());
    Object.defineProperty(navigator, 'userAgentData', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    vi.restoreAllMocks();
  });

  it('mounts and renders default and named slots', () => {
    const wrapper = mount(AwesomeButtonSocial, {
      props: {
        theme: 'blue',
        type: 'linkedin',
      },
      slots: {
        default: 'Social',
        before: '<span data-test="before">Before</span>',
        after: '<span data-test="after">After</span>',
        extra: '<span data-test="extra">Extra</span>',
      },
    });

    expect(wrapper.text()).toContain('Social');
    expect(wrapper.find('[data-test="before"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="after"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="extra"]').exists()).toBe(true);
    expect(wrapper.classes()).toContain('aws-btn--animate-size');
  });

  it('forwards animateSize to the base button', () => {
    const wrapper = mount(AwesomeButtonSocial, {
      props: {
        animateSize: false,
      },
      slots: {
        default: 'Social',
      },
    });

    expect(wrapper.classes()).not.toContain('aws-btn--animate-size');
  });

  it('renders the github auto-width icon and label through centered face slots', () => {
    const wrapper = mount(AwesomeButtonSocial, {
      props: {
        type: 'github',
        size: null,
        href: 'https://github.com/rcaferati',
      },
      slots: {
        default: 'GitHub Auto',
        before:
          '<svg data-test="github-icon" viewBox="0 0 24 24" width="16" height="16"><path d="M12 2" /></svg>',
      },
    });

    const content = wrapper.get('.aws-btn__content');
    const children = Array.from(content.element.children);

    expect(wrapper.classes()).toContain('aws-btn--github');
    expect(wrapper.classes()).toContain('aws-btn--auto');
    expect(children[0]).toBe(wrapper.get('.aws-btn__slot--before').element);
    expect(wrapper.find('.aws-btn__slot--before [data-test="github-icon"]').exists()).toBe(
      true
    );
    expect(children[1]).toBe(wrapper.get('.aws-btn__label').element);
    expect(wrapper.get('.aws-btn__label').text()).toBe('GitHub Auto');
  });

  it('forwards pressed and released events from the base button', async () => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
    const onPressed = vi.fn();
    const onReleased = vi.fn();
    const wrapper = mount(AwesomeButtonSocial, {
      attrs: {
        onPressed,
        onReleased,
      },
      props: {
        theme: 'blue',
        type: 'facebook',
        sharer: {
          url: 'https://example.com',
          message: 'Share me',
        },
      },
      slots: {
        default: 'Forward events',
      },
    });

    await pressButton(wrapper);
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    await nextTick();

    expect(onPressed).toHaveBeenCalledTimes(1);
    expect(onReleased).toHaveBeenCalledTimes(1);
  });

  it('falls back to window.open when sharer config is used', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper = mount(AwesomeButtonSocial, {
      props: {
        theme: 'blue',
        type: 'linkedin',
        sharer: {
          url: 'https://example.com',
          message: 'Check this out',
        },
      },
      slots: {
        default: 'Share',
      },
    });

    await pressButton(wrapper);

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(String(openSpy.mock.calls[0]?.[0] ?? '')).toContain('linkedin.com');
  });

  it('uses a custom press listener instead of the built-in share flow', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const onPress = vi.fn();
    const wrapper = mount(AwesomeButtonSocial, {
      attrs: {
        onPress,
      },
      props: {
        theme: 'blue',
        type: 'linkedin',
        sharer: {
          url: 'https://example.com',
          message: 'Check this out',
        },
      },
      slots: {
        default: 'Share custom',
      },
    });

    await pressButton(wrapper);

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('bypasses sharer logic when href is provided', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper = mount(AwesomeButtonSocial, {
      props: {
        theme: 'blue',
        type: 'github',
        href: 'https://github.com/rcaferati',
      },
      attrs: {
        target: '_blank',
        rel: 'noreferrer noopener',
      },
      slots: {
        default: 'Open GitHub',
      },
    });

    const link = wrapper.find('a');

    expect(link.exists()).toBe(true);
    expect(link.attributes('href')).toBe('https://github.com/rcaferati');
    expect(link.attributes('target')).toBe('_blank');
    expect(link.attributes('rel')).toBe('noreferrer noopener');

    await pressButton(wrapper);

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('uses navigator.share on mobile-capable environments before falling back', async () => {
    Object.defineProperty(navigator, 'userAgentData', {
      configurable: true,
      value: { mobile: true },
    });

    const shareSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareSpy,
    });

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper = mount(AwesomeButtonSocial, {
      props: {
        theme: 'blue',
        type: 'twitter',
        sharer: {
          url: 'https://example.com',
          message: 'Check this out',
        },
      },
      slots: {
        default: 'Share natively',
      },
    });

    await pressButton(wrapper);
    await Promise.resolve();

    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('falls back to page metadata when sharer config is omitted', async () => {
    window.history.replaceState({}, '', '/articles/test');
    document.title = 'Example title';

    const meta = document.createElement('meta');
    meta.setAttribute('property', 'og:image');
    meta.setAttribute('content', 'https://example.com/cover.png');
    document.head.appendChild(meta);

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper = mount(AwesomeButtonSocial, {
      props: {
        theme: 'blue',
        type: 'pinterest',
      },
      slots: {
        default: 'Share fallback',
      },
    });

    await pressButton(wrapper);

    const shareUrl = String(openSpy.mock.calls[0]?.[0] ?? '');
    const url = new URL(shareUrl);

    expect(shareUrl).toContain('pinterest.com');
    expect(url.searchParams.get('url')).toBe(
      `${window.location.origin}/articles/test`
    );
    expect(url.searchParams.get('media')).toBe('https://example.com/cover.png');
    expect(url.searchParams.get('description')).toBe('Example title');
  });

  it('does nothing when the built-in sharer cannot build a valid payload', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper = mount(AwesomeButtonSocial, {
      props: {
        type: 'messenger',
        sharer: {
          url: 'https://example.com',
        },
      },
      slots: {
        default: 'Invalid payload',
      },
    });

    await pressButton(wrapper);

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('sanitizes whatsapp phone numbers in the built-in sharer flow', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper = mount(AwesomeButtonSocial, {
      props: {
        type: 'whatsapp',
        sharer: {
          phone: '+1 (555) 123-4567',
          message: 'Hello',
          url: 'https://example.com',
        },
      },
      slots: {
        default: 'WhatsApp',
      },
    });

    await pressButton(wrapper);

    const shareUrl = String(openSpy.mock.calls[0]?.[0] ?? '');
    const params = new URL(shareUrl).searchParams;

    expect(params.get('phone')).toBe('15551234567');
    expect(params.get('text')).toBe('Hello https://example.com');
  });

  it('uses direct-link fallback for instagram', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper = mount(AwesomeButtonSocial, {
      props: {
        type: 'instagram',
        sharer: {
          url: 'https://instagram.com',
          message: 'Open this link',
        },
      },
      slots: {
        default: 'Instagram',
      },
    });

    await pressButton(wrapper);

    expect(openSpy).toHaveBeenCalledWith(
      'https://instagram.com',
      '_self',
      undefined
    );
  });

  it('does nothing when required sharer payload is incomplete', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper = mount(AwesomeButtonSocial, {
      props: {
        type: 'messenger',
        sharer: {
          url: 'https://example.com',
        },
      },
      slots: {
        default: 'Messenger',
      },
    });

    await pressButton(wrapper);

    expect(openSpy).not.toHaveBeenCalled();
  });
});
