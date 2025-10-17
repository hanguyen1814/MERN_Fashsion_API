const CSPViolation = require("../models/cspViolation.model");
const asyncHandler = require("../utils/asyncHandler");
const apiResponse = require("../utils/apiResponse");
const logger = require("../config/logger");

// Lấy danh sách CSP violations với phân trang và lọc
const getViolations = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    severity,
    directive,
    startDate,
    endDate,
    sortBy = "reportedAt",
    sortOrder = "desc",
  } = req.query;

  // Xây dựng filter
  const filter = {};

  if (status) filter.status = status;
  if (severity) filter.severity = severity;
  if (directive)
    filter.violatedDirective = { $regex: directive, $options: "i" };

  if (startDate || endDate) {
    filter.reportedAt = {};
    if (startDate) filter.reportedAt.$gte = new Date(startDate);
    if (endDate) filter.reportedAt.$lte = new Date(endDate);
  }

  // Xây dựng sort
  const sort = {};
  sort[sortBy] = sortOrder === "desc" ? -1 : 1;

  // Tính toán phân trang
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Thực hiện query
  const [violations, total] = await Promise.all([
    CSPViolation.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    CSPViolation.countDocuments(filter),
  ]);

  logger.info("CSP Violations Retrieved", {
    requestId: req.requestId,
    filter,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    category: "csp_admin",
  });

  res.status(200).json(
    apiResponse.success(
      {
        violations,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: total,
          limit: parseInt(limit),
        },
      },
      "CSP violations retrieved successfully"
    )
  );
});

// Lấy thống kê CSP violations
const getViolationStats = asyncHandler(async (req, res) => {
  const { period = "7d" } = req.query;

  // Tính ngày bắt đầu dựa trên period
  const now = new Date();
  let startDate;

  switch (period) {
    case "1d":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  // Thống kê theo directive
  const directiveStats = await CSPViolation.aggregate([
    {
      $match: {
        reportedAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$violatedDirective",
        count: { $sum: 1 },
        criticalCount: {
          $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] },
        },
        highCount: {
          $sum: { $cond: [{ $eq: ["$severity", "high"] }, 1, 0] },
        },
        mediumCount: {
          $sum: { $cond: [{ $eq: ["$severity", "medium"] }, 1, 0] },
        },
        lowCount: {
          $sum: { $cond: [{ $eq: ["$severity", "low"] }, 1, 0] },
        },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  // Thống kê theo thời gian (24h gần nhất)
  const hourlyStats = await CSPViolation.aggregate([
    {
      $match: {
        reportedAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    },
    {
      $group: {
        _id: {
          hour: { $hour: "$reportedAt" },
          day: { $dayOfMonth: "$reportedAt" },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.day": 1, "_id.hour": 1 },
    },
  ]);

  // Thống kê tổng quan
  const overviewStats = await CSPViolation.aggregate([
    {
      $match: {
        reportedAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        critical: {
          $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] },
        },
        high: { $sum: { $cond: [{ $eq: ["$severity", "high"] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ["$severity", "medium"] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ["$severity", "low"] }, 1, 0] } },
        new: { $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
      },
    },
  ]);

  const stats = {
    period,
    startDate,
    endDate: now,
    overview: overviewStats[0] || {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      new: 0,
      resolved: 0,
    },
    directives: directiveStats,
    hourly: hourlyStats,
  };

  logger.info("CSP Violation Stats Retrieved", {
    requestId: req.requestId,
    period,
    totalViolations: stats.overview.total,
    category: "csp_admin",
  });

  res
    .status(200)
    .json(
      apiResponse.success(
        stats,
        "CSP violation statistics retrieved successfully"
      )
    );
});

// Đánh dấu violation đã xử lý
const resolveViolation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes = "" } = req.body;

  const violation = await CSPViolation.findById(id);

  if (!violation) {
    return res
      .status(404)
      .json(apiResponse.error("CSP violation not found", 404));
  }

  await violation.markResolved(notes);

  logger.info("CSP Violation Resolved", {
    requestId: req.requestId,
    violationId: id,
    notes,
    category: "csp_admin",
  });

  res
    .status(200)
    .json(
      apiResponse.success(violation, "CSP violation resolved successfully")
    );
});

// Đánh dấu nhiều violations đã xử lý
const resolveMultipleViolations = asyncHandler(async (req, res) => {
  const { ids, notes = "" } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .json(apiResponse.error("Invalid or empty ids array", 400));
  }

  const result = await CSPViolation.updateMany(
    { _id: { $in: ids } },
    {
      status: "resolved",
      resolvedAt: new Date(),
      notes,
    }
  );

  logger.info("Multiple CSP Violations Resolved", {
    requestId: req.requestId,
    resolvedCount: result.modifiedCount,
    totalRequested: ids.length,
    notes,
    category: "csp_admin",
  });

  res
    .status(200)
    .json(
      apiResponse.success(
        { resolvedCount: result.modifiedCount },
        `${result.modifiedCount} CSP violations resolved successfully`
      )
    );
});

// Lấy chi tiết một violation
const getViolationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const violation = await CSPViolation.findById(id);

  if (!violation) {
    return res
      .status(404)
      .json(apiResponse.error("CSP violation not found", 404));
  }

  res
    .status(200)
    .json(
      apiResponse.success(violation, "CSP violation retrieved successfully")
    );
});

module.exports = {
  getViolations,
  getViolationStats,
  resolveViolation,
  resolveMultipleViolations,
  getViolationById,
};

