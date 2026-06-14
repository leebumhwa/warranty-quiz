import { useState, useRef, useEffect } from 'react';
import api from '../api';

function BotIcon() {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1rem', flexShrink: 0,
    }}>🤖</div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)',
          animation: `typing-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      flexDirection: isUser ? 'row-reverse' : 'row',
      marginBottom: 16,
    }}>
      {!isUser && <BotIcon />}
      <div style={{
        maxWidth: '72%',
        background: isUser ? 'var(--primary)' : 'var(--card)',
        color: isUser ? '#fff' : 'var(--text)',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        padding: '10px 14px',
        fontSize: '0.9rem',
        lineHeight: 1.65,
        border: isUser ? 'none' : '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError('');
    const userMsg = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post('/chat', {
        message: text,
        history: messages.map(m => ({ role: m.role, content: m.content })),
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const msg = err.response?.data?.error || '답변을 가져오지 못했습니다.';
      setError(msg);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>🤖 문서 기반 챗봇</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
          관리자가 업로드한 문서를 기반으로 보증 정책 관련 질문에 답변합니다.
        </p>
      </div>

      {/* 메시지 영역 */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        background: 'var(--bg)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', marginBottom: 12,
      }}>
        {isEmpty && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🤖</div>
            <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 6 }}>무엇이든 물어보세요</p>
            <p style={{ fontSize: '0.85rem' }}>보증 정책, 절차, 조건 등 문서에 담긴 내용을 안내해 드립니다.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 }}>
              {['보증 기간은 얼마나 되나요?', '보증 신청 절차를 알려주세요', '보증이 적용되지 않는 경우는?'].map(q => (
                <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  style={{
                    padding: '8px 14px', borderRadius: '999px', fontSize: '0.82rem',
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    color: 'var(--text)', cursor: 'pointer',
                  }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => <Message key={i} msg={msg} />)}

        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
            <BotIcon />
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: '18px 18px 18px 4px', padding: '10px 16px',
            }}>
              <TypingDots />
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 8 }}>{error}</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="질문을 입력하세요... (Enter: 전송 / Shift+Enter: 줄바꿈)"
          disabled={loading}
          rows={2}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)', background: 'var(--bg)',
            color: 'var(--text)', fontSize: '0.9rem', resize: 'none',
            fontFamily: 'inherit', lineHeight: 1.5,
            outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          style={{
            padding: '0 20px', borderRadius: 'var(--radius)',
            background: 'var(--primary)', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: '1.1rem',
            opacity: (!input.trim() || loading) ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          ➤
        </button>
      </div>

      {!isEmpty && (
        <button
          onClick={() => setMessages([])}
          style={{
            marginTop: 8, background: 'none', border: 'none',
            color: 'var(--text-muted)', fontSize: '0.78rem',
            cursor: 'pointer', textAlign: 'center',
          }}
        >
          대화 초기화
        </button>
      )}

      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
