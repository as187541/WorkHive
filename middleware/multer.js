const multer = require('multer');

// We use memory storage because we will upload directly to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ limits: { fileSize: 8 * 1024 * 1024 } }); // 8MB Limit

module.exports = upload;