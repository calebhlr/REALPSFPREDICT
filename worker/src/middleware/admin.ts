import type { Context, Next } from 'hono';
import type { Env } from '../lib/env';

export async function adminAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);

  if (!c.env.ADMIN_TOKEN) {
    return c.json({ error: 'Admin token is not configured on the server.' }, 500);
  }

  if (token !== c.env.ADMIN_TOKEN) {
    return c.json({ error: 'Invalid token.' }, 401);
  }

  await next();
}
