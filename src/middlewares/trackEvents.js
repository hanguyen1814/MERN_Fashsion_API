// src/middlewares/trackEvent.js
const Event = require("../models/event.model");

module.exports = (type) => async (req, res, next) => {
  try {
    const { productId, keyword, metadata } = req.body || {};
    await Event.create({
      userId: req.user?._id, // có thể null (guest) -> dùng sessionId
      sessionId: req.sessionID || req.headers["x-session-id"],
      type,
      productId,
      keyword,
      metadata,
    });
  } catch (e) {
    /* không chặn flow chính */
  }
  next();
};
