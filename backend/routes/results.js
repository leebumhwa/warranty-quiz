const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const { quizId, answers, score, total } = req.body;
    if (quizId === undefined || answers === undefined || score === undefined || total === undefined) {
      return res.status(400).json({ error: '필수 데이터가 누락되었습니다.' });
    }
    if (!await db.getQuizById(quizId)) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다.' });
    const result = await db.createResult(req.user.id, quizId, score, total, answers);
    res.status(201).json({ id: result.id, score, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({ results: await db.getResultsByUser(req.user.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.deleteResult(req.params.id);
    res.json({ message: '결과가 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    res.json({ results: await db.getAllResults() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
