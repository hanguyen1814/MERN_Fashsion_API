// Chuẩn hoá query: nếu có tham số trùng lặp, giữ giá trị cuối cùng và redirect 302
module.exports = function normalizeQuery() {
  return (req, res, next) => {
    try {
      const originalUrl = req.originalUrl;
      const url = new URL(originalUrl, `${req.protocol}://${req.get("host")}`);

      const params = new URLSearchParams(url.search);
      let changed = false;
      const normalized = new URLSearchParams();

      // Duyệt theo thứ tự xuất hiện, giá trị cuối sẽ ghi đè
      for (const [key, value] of params.entries()) {
        if (normalized.has(key)) changed = true;
        normalized.set(key, value);
      }

      if (!changed) return next();

      url.search = normalized.toString();
      return res.redirect(
        302,
        url.pathname + (url.search ? `?${url.searchParams.toString()}` : "")
      );
    } catch (e) {
      return next();
    }
  };
};
