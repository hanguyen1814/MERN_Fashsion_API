exports.ok = (res, data = {}, meta = {}) => res.json({ ok: true, data, meta });
exports.created = (res, data = {}) => res.status(201).json({ ok: true, data });
exports.fail = (res, code = 400, message = "Bad request", details = null) =>
  res.status(code).json({ ok: false, error: { code, message, details } });
