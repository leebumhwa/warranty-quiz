const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function extractText(file, name) {
  const ext = name.toLowerCase().split('.').pop();
  if (ext === 'pdf') {
    const data = await pdfParse(file.buffer);
    return data.text;
  }
  if (ext === 'docx' || ext === 'doc') {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }
  return file.buffer.toString('utf-8');
}

// GET /api/source-files/active — any authenticated user (to display filename)
router.get('/active', authenticate, async (req, res) => {
  try {
    const file = await db.getActiveSourceFile();
    if (!file) return res.json({ file: null });
    res.json({ file: { id: file.id, name: file.name, created_at: file.created_at } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/source-files — admin only
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    res.json({ files: await db.getSourceFiles() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/source-files/upload — admin only, single file
router.post('/upload', authenticate, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일을 선택해주세요.' });
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  try {
    const content = await extractText(req.file, originalName);
    if (!content.trim()) return res.status(400).json({ error: '텍스트를 추출할 수 없습니다.' });
    const saved = await db.createSourceFile(originalName, content, req.file.size, req.user.id);
    res.json({ file: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/source-files/:id/activate — admin only
router.patch('/:id/activate', authenticate, requireAdmin, async (req, res) => {
  try {
    const file = await db.setActiveSourceFile(req.params.id);
    res.json({ file });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/source-files/:id — admin only
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.deleteSourceFile(req.params.id);
    res.json({ message: '소스 파일이 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
