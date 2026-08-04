import { Injectable } from '@nestjs/common';

/**
 * Arive integration boundary (ARCHITECTURE §3).
 *
 * Arive exposes no public API or SSO for broker POS integrations (confirmed
 * 2026-08-02 from Mara's POS App Config screenshots: User Settings → API
 * Integrations is UWM-lender-specific only, POS Theme is a locked PRO
 * feature). Phase 1 therefore hands the borrower off to Arive's hosted
 * "1003" application portal, where they authenticate on Arive's side. If
 * Arive ever ships an API or SSO, an AriveApiAdapter implements this same
 * interface and swaps in with no controller changes.
 */
export interface AriveHandoff {
  /** Where the borrower completes the actual 1003 loan application. */
  url: string;
  /** PORTAL = borrower signs in on Arive's side; future adapters may add SSO modes. */
  mode: 'PORTAL';
}

export interface AriveAdapter {
  getHandoff(): AriveHandoff;
}

export const ARIVE_ADAPTER = 'ARIVE_ADAPTER';

/**
 * Mara's borrower registration link, provided from her Arive POS App Config
 * (2026-08-05): subdomain = company NMLS #1806779, path = her individual
 * NMLS #1925279 — so borrowers who register land in HER pipeline rather
 * than on the company root.
 */
const DEFAULT_PORTAL_URL = 'https://1806779.my1003app.com/1925279/register';

@Injectable()
export class AriveWebViewAdapter implements AriveAdapter {
  getHandoff(): AriveHandoff {
    return {
      url: process.env.ARIVE_PORTAL_URL ?? DEFAULT_PORTAL_URL,
      mode: 'PORTAL',
    };
  }
}
