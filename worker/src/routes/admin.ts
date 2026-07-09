import { Hono } from 'hono';
import { adminAuth } from '../middleware/admin';
import type { Env } from '../lib/env';
import { createDb } from '../lib/db';
import { createRepository } from '../lib/repository';
import { syncKnockoutMatches } from '../jobs/sync';

export const adminRoute = new Hono<{ Bindings: Env }>()
  .post('/login', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return c.json({ error: 'Invalid body' }, 400);
    }
    const { email, password } = body;

    if (email !== c.env.ADMIN_EMAIL) {
       return c.json({ error: 'Invalid credentials' }, 401);
    }

    // We expect the password provided by the user to match the ADMIN_TOKEN to issue the session token
    if (password !== c.env.ADMIN_TOKEN) {
       return c.json({ error: 'Invalid credentials' }, 401);
    }

    return c.json({ ok: true, token: c.env.ADMIN_TOKEN });
  })
  .post('/logout', async (c) => {
    return c.json({ ok: true });
  })

  // All routes below are protected by the simple admin middleware
  .use('/*', adminAuth)

  .get('/me', async (c) => {
    return c.json({ email: c.env.ADMIN_EMAIL });
  })

  .get('/sync/status', async (c) => {
    const db = createDb(c.env);
    const repo = createRepository(db);
    // Gather system basic statistics for the dashboard/status
    const matches = await repo.listMatches();
    const ranking = await repo.getRanking();

    let finalizedMatches = 0;
    for (const match of matches) {
      if (match.status === 'final') finalizedMatches++;
    }

    const participants = ranking.length;
    let predictions = 0;
    for (const r of ranking) {
      predictions += r.predictionsCount;
    }

    return c.json({
      matches: matches.length,
      finalizedMatches,
      participants,
      predictions,
      leader: ranking[0] ?? null
    });
  })

  .get('/matches', async (c) => {
    const db = createDb(c.env);
    const repo = createRepository(db);
    const matches = await repo.listMatches();
    return c.json({ matches });
  })

  .post('/sync', async (c) => {
    try {
      const result = await syncKnockoutMatches(c.env);
      return c.json({ ok: true, ...result });
    } catch (err) {
      return c.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
    }
  })

  .post('/recalculate-ranking', async (c) => {
    try {
       const db = createDb(c.env);
       const repo = createRepository(db);
       const ranking = await repo.forceRecalculateRanking();
       return c.json({ ok: true, ranking });
    } catch (err) {
       return c.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
    }
  });
