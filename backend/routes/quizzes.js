const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function parseQuestions(text) {
  let clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = clean.match(/\[[\s\S]*\]/);
  if (match) clean = match[0];
  return JSON.parse(clean);
}

async function callOpenRouter(prompt, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY가 설정되지 않았습니다. backend/.env 파일을 확인해주세요.');

  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Warranty Quiz App',
    },
    body: JSON.stringify({
      model,
      max_tokens: options?.maxTokens || 4000,
      temperature: 1.0,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenRouter 오류 (${res.status})`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

router.get('/', authenticate, async (req, res) => {
  try {
    res.json({ quizzes: await db.getAllQuizzes() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate', authenticate, requireAdmin, async (req, res) => {
  const { title, description, fileIds, questionCount } = req.body;
  if (!title || !fileIds || fileIds.length === 0) {
    return res.status(400).json({ error: '제목과 파일을 선택해주세요.' });
  }
  const count = Math.min(Math.max(parseInt(questionCount) || 5, 1), 50);

  const files = await db.getFilesByIds(fileIds);
  if (files.length === 0) return res.status(400).json({ error: '선택된 파일을 찾을 수 없습니다.' });

  // 생성일 오름차순 정렬 (오래된 순 → 최신 순) — 최신 파일이 마지막에 위치해 우선권 가짐
  const sortedFiles = [...files].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const MAX_CONTENT = 60000;
  let content = sortedFiles.map(f => {
    const dateStr = new Date(f.created_at).toLocaleDateString('ko-KR');
    return `=== ${f.original_name} (업로드일: ${dateStr}) ===\n${f.content}`;
  }).join('\n\n');
  if (content.length > MAX_CONTENT) content = content.substring(0, MAX_CONTENT) + '\n...(이하 생략)';

  const correctionNotes = sortedFiles
    .filter(f => f.correction_notes?.trim())
    .map(f => `[${f.original_name}] ${f.correction_notes}`)
    .join('\n');

  const prompt = `다음 문서 내용을 바탕으로 정확히 ${count}개의 4지선다 퀴즈 문제를 만들어주세요.${correctionNotes ? `\n\n⚠️ 이전에 발견된 오류 참고사항 (반드시 반영):\n${correctionNotes}` : ''}

⚠️ 파일 간 내용 충돌 처리 규칙: 여러 파일에서 동일한 항목에 대해 서로 다른 내용이 있을 경우, 업로드일이 최신인 파일의 내용을 정답 기준으로 적용하세요.

반드시 아래 JSON 배열 형식만 반환하세요. 다른 텍스트는 절대 포함하지 마세요:
[
  {
    "question": "문제 내용",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
    "correct_answer": 0,
    "explanation": "정답 설명"
  }
]

규칙:
- correct_answer는 0~3 사이의 정수 (options 배열의 정답 인덱스)
- 문서 내용에 근거한 문제만 출제
- 명확하고 이해하기 쉬운 문제 작성
- 반드시 ${count}개 작성
- 매번 다른 관점(정의, 조건, 절차, 예외, 수치 등)에서 다양하게 출제할 것
- 이전에 자주 나온 표현이나 문제 유형을 피하고 새로운 각도로 출제할 것

문서 내용:
${content}`;

  // 문제 수에 따라 max_tokens 동적 조절 (한국어 기준 문제당 약 600 토큰)
  const maxTokens = Math.min(Math.max(count * 700, 2000), 16000);

  try {
    const responseText = await callOpenRouter(prompt, { maxTokens });
    let questions;
    try {
      questions = parseQuestions(responseText);
    } catch (parseErr) {
      console.error('AI 응답 파싱 실패. 실제 응답:', responseText);
      return res.status(500).json({ error: 'AI 응답 파싱 실패. 다시 시도해주세요.' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ error: '문제가 생성되지 않았습니다. 다시 시도해주세요.' });
    }

    const result = await db.createQuizWithQuestions(title, description || '', req.user.id, questions);
    res.json(result);
  } catch (err) {
    console.error('Quiz generation error:', err);
    res.status(500).json({ error: `퀴즈 생성 실패: ${err.message}` });
  }
});

// PUT /quizzes/questions/:id - admin edit question
router.put('/questions/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const q = await db.getQuestionById(req.params.id);
    if (!q) return res.status(404).json({ error: '문제를 찾을 수 없습니다.' });
    const { question_text, correct_answer, explanation, options } = req.body;
    const updates = {};
    if (question_text !== undefined) updates.question_text = question_text;
    if (correct_answer !== undefined) updates.correct_answer = parseInt(correct_answer);
    if (explanation !== undefined) updates.explanation = explanation;
    if (options !== undefined) updates.options = options;
    const updated = await db.updateQuestion(req.params.id, updates);
    res.json({ question: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /quizzes/questions/:id/report - user report
router.post('/questions/:id/report', authenticate, async (req, res) => {
  try {
    const q = await db.getQuestionById(req.params.id);
    if (!q) return res.status(404).json({ error: '문제를 찾을 수 없습니다.' });
    const { comment } = req.body;
    if (!comment?.trim()) return res.status(400).json({ error: '신고 내용을 입력해주세요.' });
    const report = await db.createReport(q.id, q.quiz_id, req.user.id, q.question_text, comment);
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /quizzes/reports - admin view all reports
router.get('/reports', authenticate, requireAdmin, async (req, res) => {
  try {
    res.json({ reports: await db.getAllReports() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /quizzes/reports/:id/resolve - admin resolve report
router.patch('/reports/:id/resolve', authenticate, requireAdmin, async (req, res) => {
  try {
    const report = await db.resolveReport(req.params.id);
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /quizzes/reports/:id - admin delete report
router.delete('/reports/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.deleteReport(req.params.id);
    res.json({ message: '신고가 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.getQuizById(req.params.id);
    if (!result) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다.' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/questions/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!await db.getQuestionById(req.params.id)) return res.status(404).json({ error: '문제를 찾을 수 없습니다.' });
    await db.deleteQuestion(req.params.id);
    res.json({ message: '문제가 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await db.getQuizById(req.params.id);
    if (!result) return res.status(404).json({ error: '퀴즈를 찾을 수 없습니다.' });
    await db.deleteQuiz(req.params.id);
    res.json({ message: '퀴즈가 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
