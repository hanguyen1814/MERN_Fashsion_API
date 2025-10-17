exports.ok = (res, data = {}, meta = {}) =>
  res.json({
    status: true,
    data,
    ...(Object.keys(meta).length ? { meta } : {}),
  });
exports.created = (res, data = {}) =>
  res.status(201).json({ status: true, data });
exports.fail = (res, code = 400, message = "Bad request", details = null) =>
  res
    .status(code)
    .json({ status: false, message, ...(details ? { details } : {}) });
