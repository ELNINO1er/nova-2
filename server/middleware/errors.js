export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'not_found',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error('[ERROR]', err);
  res.status(status).json({
    error: err.code || 'server_error',
    message: status >= 500 ? 'Erreur interne du serveur' : (err.message || 'Unexpected server error'),
  });
}
