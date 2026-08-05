/**
 * Extracts pagination params from query string.
 * Usage: const { limit, offset, page } = parsePagination(req.query);
 *
 * Defaults: page=1, limit=20, max limit=100
 */
export function parsePagination(query = {}) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Wraps a result array with pagination metadata.
 */
export function paginatedResponse(rows, total, { page, limit }) {
  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}
