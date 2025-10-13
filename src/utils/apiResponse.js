exports.ok = (res, data = {}, meta = {}) => res.json({ data, meta });
exports.created = (res, data = {}) => res.status(201).json({ data });
exports.fail = (res, code = 400, message = "Bad request", details = null) =>
  res.status(code).json({ message, details });
