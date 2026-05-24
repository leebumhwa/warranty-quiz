require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(null, true); // Vercel 동일 도메인 API 호출 허용
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));
app.use('/api/quizzes', require('./routes/quizzes'));
app.use('/api/results', require('./routes/results'));
app.use('/api/notices', require('./routes/notices'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' });
});

async function seedAdmin() {
  const existing = await db.getUserByEmail('admin@warranty.com');
  if (!existing) {
    await db.createUser('admin@warranty.com', bcrypt.hashSync('admin123', 10), '관리자', 'admin');
    console.log('기본 관리자 생성됨: admin@warranty.com / admin123');
  }
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`백엔드 서버 실행 중: http://localhost:${PORT}`);
    seedAdmin().catch(err => console.error('관리자 시딩 실패:', err.message));
  });
} else {
  seedAdmin().catch(err => console.error('관리자 시딩 실패:', err.message));
}

module.exports = app;
