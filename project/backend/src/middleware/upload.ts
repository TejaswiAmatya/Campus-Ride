import multer from 'multer'

const allowed = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('Invalid file type'))
      return
    }

    cb(null, true)
  },
})
