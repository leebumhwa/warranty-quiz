const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    res.json({ schedules: await db.getSchedules() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { date, title, note } = req.body;
  if (!date || !title?.trim()) return res.status(400).json({ error: '날짜와 제목을 입력해주세요.' });
  try {
    const schedule = await db.createSchedule(date, title.trim(), note?.trim() || null, req.user.id);
    res.status(201).json({ schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  const { date, title, note } = req.body;
  if (!date || !title?.trim()) return res.status(400).json({ error: '날짜와 제목을 입력해주세요.' });
  try {
    const schedule = await db.updateSchedule(req.params.id, date, title.trim(), note?.trim() || null);
    res.json({ schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.deleteSchedule(req.params.id);
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
