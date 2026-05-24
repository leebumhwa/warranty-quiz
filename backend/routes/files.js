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

router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    res.json({ files: await db.getAllFiles() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload', authenticate, requireAdmin, upload.array('files', 20), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '파일을 선택해주세요.' });
  }
  const uploaded = [], errors = [];
  for (const file of req.files) {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    try {
      const content = await extractText(file, originalName);
      if (!content.trim()) { errors.push(`${originalName}: 텍스트를 추출할 수 없습니다.`); continue; }
      const saved = await db.createFile(originalName, content, file.size, req.user.id);
      uploaded.push({ id: saved.id, original_name: saved.original_name, file_size: saved.file_size });
    } catch (err) {
      errors.push(`${originalName}: ${err.message}`);
    }
  }
  res.json({ uploaded, errors });
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!await db.getFileById(req.params.id)) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    await db.deleteFile(req.params.id);
    res.json({ message: '파일이 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
