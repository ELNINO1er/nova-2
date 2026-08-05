export const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        error: 'validation_error',
        details: parsed.error.flatten(),
      });
    }
    req.body = parsed.data;
    next();
  };
}
