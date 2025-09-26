module.exports = (err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({
    ok: false,
    error: { code: status, message: err.message || "Internal Server Error" },
  });
};
