import { Router } from 'express';
import { HUE_COUNT } from '../seed/avatar.js';

const SEED_PATTERN = /^([A-Z]{1,2})-(\d|1[01])\.svg$/;

/** Twelve background/foreground pairs, legible on light and dark surfaces. */
const PALETTE: { bg: string; fg: string }[] = [
  { bg: '#0f766e', fg: '#ccfbf1' },
  { bg: '#1d4ed8', fg: '#dbeafe' },
  { bg: '#6d28d9', fg: '#ede9fe' },
  { bg: '#a21caf', fg: '#fae8ff' },
  { bg: '#be123c', fg: '#ffe4e6' },
  { bg: '#c2410c', fg: '#ffedd5' },
  { bg: '#a16207', fg: '#fef3c7' },
  { bg: '#4d7c0f', fg: '#ecfccb' },
  { bg: '#15803d', fg: '#dcfce7' },
  { bg: '#0e7490', fg: '#cffafe' },
  { bg: '#3730a3', fg: '#e0e7ff' },
  { bg: '#475569', fg: '#f1f5f9' },
];

/**
 * Avatars are rendered from the path alone and never touch the database, which
 * keeps them free at any scroll speed and lets them be cached forever. Serving
 * them locally rather than from a photo service also means the app works with
 * no network at all, which matters inside Docker.
 */
export function createAvatarsRouter(): Router {
  const router = Router();

  router.get('/avatars/:seed', (req, res, next) => {
    const match = SEED_PATTERN.exec(req.params.seed);
    if (!match) {
      next(); // falls through to the 404 handler
      return;
    }

    const initials = match[1]!;
    const { bg, fg } = PALETTE[Number(match[2]) % HUE_COUNT]!;

    // `initials` is constrained to [A-Z]{1,2} by the pattern above, so no
    // caller-controlled text can reach the SVG body.
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="${initials}">` +
      `<rect width="96" height="96" rx="20" fill="${bg}"/>` +
      `<text x="48" y="50" text-anchor="middle" dominant-baseline="central" ` +
      `font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" ` +
      `font-size="36" font-weight="600" fill="${fg}">${initials}</text>` +
      `</svg>`;

    res
      .type('image/svg+xml')
      .set('Cache-Control', 'public, max-age=31536000, immutable')
      .send(svg);
  });

  return router;
}
