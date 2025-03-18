const mongoose = require("mongoose");

const AnnualSummarySchema = new mongoose.Schema({
    year: { type: String, required: true },  // e.g., "2025"
    totalIssues: { type: Number, default: 0 },
    issueTypes: { type: Map, of: Number },  
    sourceStats: { type: Map, of: Number }, 
    completed: { type: Number, default: 0 },
    uncompleted: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("AnnualSummary", AnnualSummarySchema);
