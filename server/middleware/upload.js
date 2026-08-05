import multer from 'multer';
import path from 'path';
import { mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const uploadDir = path.join(__dirname, '..', '..', 'data', 'uploads');
mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const owner = req.user?.patientId || req.user?.doctorId || req.user?.pharmacyId || req.user?.id || 'shared';
    const ownerDir = path.join(uploadDir, String(req.user?.role || 'shared'), String(owner));
    mkdirSync(ownerDir, { recursive: true });
    cb(null, ownerDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

// Magic bytes signatures
const MAGIC_BYTES = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46],          // %PDF
  'image/png':       [0x89, 0x50, 0x4E, 0x47],          // .PNG
  'image/jpeg':      [0xFF, 0xD8, 0xFF],                 // JFIF/EXIF
  'image/webp':      [0x52, 0x49, 0x46, 0x46],          // RIFF (+ WEBP at offset 8)
};

function verifyMagicBytes(filePath, declaredMime) {
  try {
    const fd = readFileSync(filePath);
    const sig = MAGIC_BYTES[declaredMime];
    if (!sig) return false;
    if (fd.length < sig.length) return false;
    for (let i = 0; i < sig.length; i++) {
      if (fd[i] !== sig[i]) return false;
    }
    // Extra check for WEBP: bytes 8-11 must be "WEBP"
    if (declaredMime === 'image/webp') {
      if (fd.length < 12) return false;
      const webpSig = [0x57, 0x45, 0x42, 0x50];
      for (let i = 0; i < 4; i++) {
        if (fd[8 + i] !== webpSig[i]) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 10,
    parts: 12,
    fieldNameSize: 100,
    fieldSize: 64 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIMES.includes(file.mimetype) && ALLOWED_EXTS.includes(ext)) cb(null, true);
    else cb(new Error('Format non autorisé. Acceptés : PDF, JPG, PNG, WEBP'));
  },
});

/**
 * Post-upload middleware: verify magic bytes match declared MIME type.
 * If mismatch, delete the file and return 422.
 */
export function verifyUploadedFile(req, res, next) {
  if (!req.file) return next();
  const ok = verifyMagicBytes(req.file.path, req.file.mimetype);
  if (!ok) {
    try { unlinkSync(req.file.path); } catch {}
    return res.status(422).json({
      error: 'invalid_file',
      message: 'Le contenu du fichier ne correspond pas au format déclaré.',
    });
  }
  next();
}
