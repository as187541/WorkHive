const multer = require('multer');

// We must use memoryStorage so the file buffer is available for Cloudinary
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 8 * 1024 * 1024 } // 8MB limit
});

module.exports = upload;