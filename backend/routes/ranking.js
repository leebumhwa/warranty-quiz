const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    res.json({ ranking: await db.getRanking() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
