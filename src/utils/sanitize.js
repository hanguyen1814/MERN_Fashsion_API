function sanitizePlainText(input, maxLength = 1000) {
  if (typeof input !== "string") return input;
  let out = input;
  // Remove script/style tags
  out = out.replace(/<\/(?:script|style)>/gi, "");
  out = out.replace(/<(?:script|style)[^>]*>/gi, "");
  // Remove any HTML tags
  out = out.replace(/<[^>]*>/g, "");
  // Decode basic entities if any were passed in pre-encoded to reduce double-encoding
  out = out
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  // Trim and collapse whitespace
  out = out.trim().replace(/\s+/g, " ");
  // Enforce max length
  if (out.length > maxLength) {
    out = out.slice(0, maxLength);
  }
  return out;
}

module.exports = {
  sanitizePlainText,
};
