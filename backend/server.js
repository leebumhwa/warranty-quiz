require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));
app.use('/api/quizzes', require('./routes/quizzes'));
app.use('/api/results', require('./routes/results'));

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`백엔드 서버 실행 중: http://localhost:${PORT}`);
  seedAdmin().catch(err => console.error('관리자 시딩 실패:', err.message));
});
