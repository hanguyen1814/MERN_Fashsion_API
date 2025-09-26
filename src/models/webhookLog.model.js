// (Webhook) src/models/webhookLog.model.js
const mongoose = require("mongoose");
const WebhookLogSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ["payment", "shipping"], required: true },
    event: { type: String, required: true },
    payload: mongoose.Schema.Types.Mixed,
    processed: { type: Boolean, default: false },
    error: String,
  },
  { timestamps: true }
);
module.exports = mongoose.model("WebhookLog", WebhookLogSchema);
