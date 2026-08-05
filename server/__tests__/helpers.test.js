import { describe, it, expect, vi } from 'vitest';
import { wrap, validateBody } from '../middleware/helpers.js';
import { z } from 'zod';

describe('wrap', () => {
  it('calls next with error when async handler throws', async () => {
    const error = new Error('test error');
    const handler = wrap(async () => { throw error; });
    const next = vi.fn();
    await handler({}, {}, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  it('does not call next on success', async () => {
    const handler = wrap(async (_req, res) => { res.json({ ok: true }); });
    const next = vi.fn();
    const res = { json: vi.fn() };
    await handler({}, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});

describe('validateBody', () => {
  const schema = z.object({ name: z.string().min(1), age: z.number() });

  it('passes valid body to next', () => {
    const middleware = validateBody(schema);
    const req = { body: { name: 'Test', age: 25 } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'Test', age: 25 });
  });

  it('returns 422 for invalid body', () => {
    const middleware = validateBody(schema);
    const req = { body: { name: '', age: 'not a number' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('strips unknown fields', () => {
    const middleware = validateBody(schema);
    const req = { body: { name: 'Test', age: 30, extra: 'removed' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    middleware(req, res, next);
    expect(req.body).toEqual({ name: 'Test', age: 30 });
    expect(req.body.extra).toBeUndefined();
  });
});
