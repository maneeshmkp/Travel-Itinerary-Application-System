import multer from "multer"
import { MAX_DOCUMENT_BYTES } from "../constants/documentTypes.js"

const storage = multer.memoryStorage()

export const documentUpload = multer({
  storage,
  limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    cb(null, true)
  },
})
