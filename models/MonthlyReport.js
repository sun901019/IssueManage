const mongoose = require("mongoose");

const MonthlyReportSchema = new mongoose.Schema({
    year: { type: String, required: true },  // 例如 "2025"
    month: { type: String, required: true }, // 例如 "03"
    issueCount: { type: Number, default: 0 },
    issueTypes: { type: Map, of: Number },  
    sourceStats: { type: Map, of: Number }, 
    completed: { type: Number, default: 0 },
    uncompleted: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("MonthlyReport", MonthlyReportSchema);
