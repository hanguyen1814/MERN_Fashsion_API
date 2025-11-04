const jwt = require("jsonwebtoken");

module.exports = (roles = []) => {
  if (!Array.isArray(roles)) roles = [roles];
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token)
      return res
        .status(401)
        .json({ ok: false, error: { code: 401, message: "Unauthorized" } });
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload; // { id, role }
      if (roles.length && !roles.includes(payload.role)) {
        return res
          .status(403)
          .json({ ok: false, error: { code: 403, message: "Forbidden" } });
      }
      next();
    } catch (e) {
      return res
        .status(401)
        .json({ ok: false, error: { code: 401, message: "Invalid token" } });
    }
  };
};
