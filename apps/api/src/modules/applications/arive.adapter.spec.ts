import { afterEach, describe, expect, it } from 'vitest';

import { AriveWebViewAdapter } from './arive.adapter';

describe('AriveWebViewAdapter', () => {
  afterEach(() => {
    delete process.env.ARIVE_PORTAL_URL;
  });

  it('defaults to Mara’s LO-specific 1003 registration link', () => {
    const adapter = new AriveWebViewAdapter();
    expect(adapter.getHandoff()).toEqual({
      url: 'https://1806779.my1003app.com/1925279/register',
      mode: 'PORTAL',
    });
  });

  it('honors the ARIVE_PORTAL_URL override', () => {
    process.env.ARIVE_PORTAL_URL = 'https://certifiedhomeloans.my1003app.com';
    const adapter = new AriveWebViewAdapter();
    expect(adapter.getHandoff().url).toBe('https://certifiedhomeloans.my1003app.com');
    expect(adapter.getHandoff().mode).toBe('PORTAL');
  });
});
