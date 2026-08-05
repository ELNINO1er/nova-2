import { describe, it, expect } from 'vitest';
import { parsePagination, paginatedResponse } from '../middleware/paginate.js';

describe('parsePagination', () => {
  it('returns defaults when no query', () => {
    const r = parsePagination({});
    expect(r).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it('parses page and limit', () => {
    const r = parsePagination({ page: '3', limit: '10' });
    expect(r).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  it('clamps limit to max 100', () => {
    const r = parsePagination({ limit: '999' });
    expect(r.limit).toBe(100);
  });

  it('clamps page to min 1', () => {
    const r = parsePagination({ page: '-5' });
    expect(r.page).toBe(1);
    expect(r.offset).toBe(0);
  });

  it('handles NaN gracefully', () => {
    const r = parsePagination({ page: 'abc', limit: 'xyz' });
    expect(r).toEqual({ page: 1, limit: 20, offset: 0 });
  });
});

describe('paginatedResponse', () => {
  it('wraps data with pagination metadata', () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const r = paginatedResponse(rows, 50, { page: 1, limit: 20 });
    expect(r.data).toEqual(rows);
    expect(r.pagination).toEqual({
      page: 1, limit: 20, total: 50, totalPages: 3, hasMore: true,
    });
  });

  it('hasMore is false on last page', () => {
    const r = paginatedResponse([], 20, { page: 1, limit: 20 });
    expect(r.pagination.hasMore).toBe(false);
  });

  it('handles empty results', () => {
    const r = paginatedResponse([], 0, { page: 1, limit: 20 });
    expect(r.pagination.total).toBe(0);
    expect(r.pagination.totalPages).toBe(0);
  });
});
