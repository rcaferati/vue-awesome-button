import { describe, expect, it } from 'vitest';
import { buildSharePayload } from '../composables/sharer';

describe('sharer', () => {
  it('builds provider-specific linkedin URLs', () => {
    const payload = buildSharePayload({
      type: 'linkedin',
      url: 'https://example.com/article',
      message: 'Read this',
      width: 640,
      height: 480,
    });

    expect(payload.url).toContain('linkedin.com/sharing/share-offsite');
    expect(payload.url).toContain(encodeURIComponent('https://example.com/article'));
    expect(payload.extra).toContain('width=640');
    expect(payload.extra).toContain('height=480');
  });

  it('sanitizes whatsapp phone numbers and combines message with url', () => {
    const payload = buildSharePayload({
      type: 'whatsapp',
      phone: '+1 (555) 123-4567',
      message: 'Hello',
      url: 'https://example.com',
      width: 320,
      height: 480,
    });

    const shareUrl = new URL(String(payload.url));

    expect(shareUrl.searchParams.get('phone')).toBe('15551234567');
    expect(shareUrl.searchParams.get('text')).toBe('Hello https://example.com');
    expect(payload.extra).toContain('width=850');
  });

  it('builds mail payloads as mailto links', () => {
    const payload = buildSharePayload({
      type: 'mail',
      message: 'Hello',
      url: 'https://example.com',
      width: 640,
      height: 480,
    });

    expect(payload.url).toContain('mailto:');
    expect(payload.url).toContain('subject=Hello');
    expect(payload.title).toBe('_self');
  });

  it('returns instagram direct links instead of popup sharers', () => {
    const payload = buildSharePayload({
      type: 'instagram',
      url: 'https://instagram.com',
      message: 'Open this',
      width: 640,
      height: 480,
    });

    expect(payload.url).toBe('https://instagram.com');
    expect(payload.title).toBe('_self');
    expect(payload.extra).toBeUndefined();
  });

  it('returns an empty payload for unsupported or incomplete providers', () => {
    expect(
      buildSharePayload({
        type: 'unknown',
        width: 640,
        height: 480,
      })
    ).toEqual({});

    expect(
      buildSharePayload({
        type: 'messenger',
        url: 'https://example.com',
        width: 640,
        height: 480,
      })
    ).toEqual({});
  });
});
