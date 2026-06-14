const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_CHARS_PER_FILE = 8000;

router.post('/', authenticate, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: '메시지를 입력해주세요.' });

    const files = await db.getChatbotFiles();
    if (files.length === 0) {
      return res.status(404).json({ error: '참조할 문서가 없습니다. 관리자에게 문의하세요.' });
    }

    const docsText = files.map(f => {
      const notes = f.correction_notes ? `[수정 메모: ${f.correction_notes}]\n` : '';
      const content = (f.content || '').slice(0, MAX_CHARS_PER_FILE);
      return `## 📄 ${f.original_name}\n${notes}${content}`;
    }).join('\n\n---\n\n');

    const systemPrompt = `당신은 보증 정책 전문 상담 챗봇입니다.
아래에 제공된 문서들만을 근거로 질문에 답변하세요.
문서에 없는 내용은 "제공된 문서에서 해당 내용을 찾을 수 없습니다."라고 명확히 안내하세요.
답변은 한국어로 하고, 가능하면 출처 문서명을 언급해주세요.
답변은 간결하고 명확하게 작성하세요.

=== 참조 문서 (${files.length}개) ===

${docsText}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

    const result = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Warranty Quiz App',
      },
      body: JSON.stringify({ model, max_tokens: 1500, temperature: 0.3, messages }),
    });

    if (!result.ok) {
      const err = await result.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenRouter 오류 (${result.status})`);
    }

    const data = await result.json();
    res.json({ reply: data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
