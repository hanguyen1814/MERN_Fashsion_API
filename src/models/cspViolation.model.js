const mongoose = require("mongoose");

const cspViolationSchema = new mongoose.Schema(
  {
    // Thông tin cơ bản về violation
    documentUri: {
      type: String,
      required: true,
      trim: true,
    },

    violatedDirective: {
      type: String,
      required: true,
      trim: true,
    },

    effectiveDirective: {
      type: String,
      trim: true,
    },

    originalPolicy: {
      type: String,
      required: true,
    },

    blockedUri: {
      type: String,
      trim: true,
    },

    sourceFile: {
      type: String,
      trim: true,
    },

    lineNumber: {
      type: Number,
    },

    columnNumber: {
      type: Number,
    },

    statusCode: {
      type: Number,
    },

    // Thông tin request
    userAgent: {
      type: String,
      trim: true,
    },

    ip: {
      type: String,
      trim: true,
    },

    referrer: {
      type: String,
      trim: true,
    },

    // Metadata
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["new", "investigating", "resolved", "false_positive"],
      default: "new",
    },

    // Timestamps
    reportedAt: {
      type: Date,
      default: Date.now,
    },

    resolvedAt: {
      type: Date,
    },

    // Notes cho việc xử lý
    notes: {
      type: String,
      trim: true,
    },

    // Request ID để trace
    requestId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "csp_violations",
  }
);

// Indexes để tối ưu queries
cspViolationSchema.index({ documentUri: 1 });
cspViolationSchema.index({ violatedDirective: 1 });
cspViolationSchema.index({ reportedAt: -1 });
cspViolationSchema.index({ status: 1 });
cspViolationSchema.index({ severity: 1 });
cspViolationSchema.index({ ip: 1 });

// Virtual để tính thời gian xử lý
cspViolationSchema.virtual("resolutionTime").get(function () {
  if (this.resolvedAt && this.reportedAt) {
    return this.resolvedAt - this.reportedAt;
  }
  return null;
});

// Method để đánh dấu đã xử lý
cspViolationSchema.methods.markResolved = function (notes = "") {
  this.status = "resolved";
  this.resolvedAt = new Date();
  this.notes = notes;
  return this.save();
};

// Static method để lấy violations theo thời gian
cspViolationSchema.statics.getViolationsByPeriod = function (
  startDate,
  endDate
) {
  return this.find({
    reportedAt: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ reportedAt: -1 });
};

// Static method để lấy violations chưa xử lý
cspViolationSchema.statics.getUnresolvedViolations = function () {
  return this.find({
    status: { $in: ["new", "investigating"] },
  }).sort({ reportedAt: -1 });
};

// Static method để thống kê violations
cspViolationSchema.statics.getViolationStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: {
          directive: "$violatedDirective",
          status: "$status",
        },
        count: { $sum: 1 },
        latestReport: { $max: "$reportedAt" },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

module.exports = mongoose.model("CSPViolation", cspViolationSchema);

