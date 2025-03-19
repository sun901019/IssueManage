// 啟動腳本，提供更多調試信息
const server = require('./server');

console.log('🚀 後端服務器已啟動');
console.log('💡 可用的 API 路由:');
console.log('  - GET    /api/issues             獲取所有問題');
console.log('  - GET    /api/issues/:id         獲取特定問題');
console.log('  - POST   /api/issues             創建新問題');
console.log('  - PUT    /api/issues/:id         更新問題');
console.log('  - DELETE /api/issues/:id         刪除問題');
console.log('  - GET    /api/comments/issue/:issueId  獲取問題的評論');
console.log('  - POST   /api/comments           創建新評論');
console.log('  - PUT    /api/comments/:id       更新評論');
console.log('  - DELETE /api/comments/:id       刪除評論');
console.log('  - GET    /api/report/:type/:period    獲取報表');
console.log('  - POST   /api/summaries/process       處理月結算');
console.log('  - GET    /api/summaries/monthly/:year/:month  獲取月度匯總');
console.log('  - GET    /api/summaries/annual/:year         獲取年度匯總');

console.log('\n📝 查看後端日誌以了解更多信息...'); 