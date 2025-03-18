const mongoose = require("mongoose");

const MonthlySummarySchema = new mongoose.Schema({
    month: { type: String, required: true },  // e.g., "2025-03"
    issueCount: { type: Number, default: 0 },
    issueTypes: { type: Map, of: Number },  // { "系統": 5, "硬體": 2 }
    sourceStats: { type: Map, of: Number }, // { "Line chat": 3, "現場": 4 }
    completed: { type: Number, default: 0 },
    uncompleted: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("MonthlySummary", MonthlySummarySchema);
