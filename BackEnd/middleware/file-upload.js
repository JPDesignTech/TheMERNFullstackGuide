const multer = require("multer");
const { v1: uuidv1 } = require("uuid");
// JS Object Maps MINE Types to File Extensions
const MINE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const fileUpload = multer({
  limits: 500000, // 500 Kbs Max Upload
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/images");
    },
    filename: (req, file, cb) => {
      const ext = MINE_TYPE_MAP[file.minetype];
      cb(null, uuidv1() + "." + ext);
    },
  }), // Storage Driver
  fileFilter: (req, file, cb) => {
    const isValid = !!MINE_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error("Invalid mime type");
    cb(error, isValid);
  },
});

module.exports = fileUpload;
