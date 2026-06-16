const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'default_secret';

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, privacyAgreed } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: '이메일, 비밀번호, 이름을 모두 입력해주세요.' });
    }
    if (!privacyAgreed) {
      return res.status(400).json({ error: '개인정보 수집·이용에 동의해주세요.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
    }
    if (await db.getUserByEmail(email)) {
      return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
    }
    const hashed = bcrypt.hashSync(password, 10);
    await db.createUser(email, hashed, name, 'user', new Date().toISOString(), 'pending');
    res.status(201).json({ pending: true, message: '가입 신청이 완료되었습니다. 관리자 승인 후 로그인이 가능합니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
    }
    const user = await db.getUserByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
    if (user.role !== 'admin' && user.status !== 'approved') {
      const msg = user.status === 'rejected'
        ? '가입이 거절되었습니다. 관리자에게 문의해주세요.'
        : '관리자 승인 대기 중입니다. 승인 후 로그인이 가능합니다.';
      return res.status(403).json({ error: msg });
    }
    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// 관리자: 사용자 목록 조회
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await db.getAllUsersForAdmin();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 관리자: 사용자 상태 변경 (approved / rejected)
router.patch('/users/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
    }
    const user = await db.updateUserStatus(req.params.id, status);
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
