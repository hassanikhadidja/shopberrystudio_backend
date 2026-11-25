const multer = require("multer");

const storage = multer.memoryStorage();

const OFFICE = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype.startsWith("image/") || OFFICE.has(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error("Only image, PDF, ZIP, or Office document files are allowed"), false);
  },
});

module.exports = upload;
