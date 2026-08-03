import { afterEach, describe, expect, it } from 'vitest';

import { AriveWebViewAdapter } from './arive.adapter';

describe('AriveWebViewAdapter', () => {
  afterEach(() => {
    delete process.env.ARIVE_PORTAL_URL;
  });

  it('defaults to Mara’s hosted 1003 portal', () => {
    const adapter = new AriveWebViewAdapter();
    expect(adapter.getHandoff()).toEqual({
      url: 'https://1806779.my1003app.com',
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
