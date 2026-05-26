import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function TakeQuiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reportingId, setReportingId] = useState(null);
  const [reportComment, setReportComment] = useState('');
  const [reportStatus, setReportStatus] = useState({});

  useEffect(() => {
    api.get(`/quizzes/${id}`)
      .then(res => {
        setQuiz(res.data.quiz);
        const qs = res.data.questions.map(q => ({ ...q, options: JSON.parse(q.options) }));
        setQuestions(qs);
      })
      .catch(() => setError('퀴즈를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSelect = (questionId, optionIdx) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleSubmit = async () => {
    const unanswered = questions.filter(q => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      if (!window.confirm(`${unanswered.length}개의 문제에 답하지 않았습니다. 그래도 제출하시겠습니까?`)) return;
    }
    setSubmitting(true);
    const finalScore = questions.reduce((acc, q) => {
      return answers[q.id] === q.correct_answer ? acc + 1 : acc;
    }, 0);
    const answersPayload = questions.map(q => ({
      questionId: q.id,
      selected: answers[q.id] ?? null,
      correct: q.correct_answer,
    }));
    try {
      await api.post('/results', {
        quizId: parseInt(id),
        answers: answersPayload,
        score: finalScore,
        total: questions.length,
      });
      setScore(finalScore);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('결과 저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async (questionId) => {
    if (!reportComment.trim()) return;
    try {
      await api.post(`/quizzes/questions/${questionId}/report`, { comment: reportComment });
      setReportStatus(prev => ({ ...prev, [questionId]: '신고가 접수되었습니다.' }));
      setReportingId(null);
      setReportComment('');
    } catch {
      setReportStatus(prev => ({ ...prev, [questionId]: '신고 접수에 실패했습니다.' }));
    }
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html lang="ko"><head>
      <meta charset="UTF-8">
      <title>${quiz?.title || '퀴즈'} — 인쇄</title>
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; max-width: 740px; margin: 0 auto; padding: 32px 24px; color: #0f172a; }
        h1 { font-size: 1.4rem; margin-bottom: 4px; }
        .meta { font-size: 0.8rem; color: #64748b; margin-bottom: 24px; }
        .question { margin-bottom: 28px; page-break-inside: avoid; }
        .q-num { font-size: 0.75rem; color: #64748b; font-weight: 600; margin-bottom: 4px; }
        .q-text { font-size: 1rem; font-weight: 600; margin-bottom: 10px; line-height: 1.5; }
        .options { display: flex; flex-direction: column; gap: 6px; }
        .option { display: flex; align-items: flex-start; gap: 8px; font-size: 0.9rem; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; }
        .opt-label { font-weight: 700; min-width: 20px; }
        ${submitted ? `.correct { border-color: #16a34a !important; background: #dcfce7; }
        .wrong { border-color: #dc2626 !important; background: #fee2e2; }
        .answer { margin-top: 8px; font-size: 0.8rem; color: #16a34a; font-weight: 600; }
        .explanation { font-size: 0.8rem; color: #64748b; margin-top: 4px; }` : ''}
        hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>
      <h1>${quiz?.title || '퀴즈'}</h1>
      <div class="meta">총 ${questions.length}문제${submitted ? ` · 정답률 ${Math.round((score / questions.length) * 100)}%` : ''} · ${new Date().toLocaleDateString('ko-KR')}</div>
      <hr>
      ${questions.map((q, i) => {
        const sel = answers[q.id];
        return `<div class="question">
          <div class="q-num">문제 ${i + 1}</div>
          <div class="q-text">${q.question_text}</div>
          <div class="options">
            ${q.options.map((opt, oi) => {
              let cls = 'option';
              if (submitted) {
                if (oi === q.correct_answer) cls += ' correct';
                else if (oi === sel && sel !== q.correct_answer) cls += ' wrong';
              }
              return `<div class="${cls}"><span class="opt-label">${String.fromCharCode(65 + oi)}.</span><span>${opt}</span></div>`;
            }).join('')}
          </div>
          ${submitted ? `<div class="answer">정답: ${String.fromCharCode(65 + q.correct_answer)}. ${q.options[q.correct_answer]}</div>
          ${q.explanation ? `<div class="explanation">해설: ${q.explanation}</div>` : ''}` : ''}
        </div>`;
      }).join('')}
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  if (loading) return <div className="loading-screen">퀴즈 로딩 중...</div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div><Link to="/dashboard" className="btn btn-secondary">돌아가기</Link></div>;

  const pct = Math.round((score / questions.length) * 100);
  const passed = pct >= 60;

  return (
    <div className="page" style={{maxWidth:'760px'}}>
      {submitted ? (
        <>
          <div className="score-banner">
            <div className="score-number">{score} / {questions.length}</div>
            <div className="score-label">
              정답률 {pct}% —{' '}
              <span style={{color: passed ? 'var(--success)' : 'var(--error)', fontWeight:600}}>
                {passed ? '합격' : '불합격'}
              </span>
            </div>
            <div style={{marginTop:'12px', display:'flex', gap:'8px', justifyContent:'center'}}>
              <Link to="/dashboard" className="btn btn-secondary btn-sm">목록으로</Link>
              <Link to="/results" className="btn btn-primary btn-sm">내 기록 보기</Link>
              <button className="btn btn-success btn-sm" onClick={() => { setSubmitted(false); setAnswers({}); }}>다시 풀기</button>
              <button className="btn btn-secondary btn-sm" onClick={handlePrint}>🖨️ 인쇄</button>
            </div>
          </div>
          <h2 style={{marginBottom:'16px', fontSize:'1rem', fontWeight:600}}>문제별 결과</h2>
        </>
      ) : (
        <div style={{marginBottom:'24px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <Link to="/dashboard" className="text-muted text-sm" style={{textDecoration:'none'}}>← 목록으로</Link>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint}>🖨️ 인쇄</button>
          </div>
          <h1 className="page-title" style={{marginTop:'8px'}}>{quiz?.title}</h1>
          <p className="text-muted text-sm">{questions.length}개 문제 · 모든 문제에 답한 후 제출하세요</p>
        </div>
      )}

      {questions.map((q, idx) => {
        const selected = answers[q.id];
        const isCorrect = selected === q.correct_answer;
        return (
          <div key={q.id} className="question-card">
            <div className="question-num">문제 {idx + 1}</div>
            <div className="question-text">{q.question_text}</div>
            <div className="options-list">
              {q.options.map((opt, optIdx) => {
                let cls = 'option-item';
                if (!submitted) {
                  if (selected === optIdx) cls += ' selected';
                } else {
                  if (optIdx === q.correct_answer) cls += ' correct';
                  else if (selected === optIdx && !isCorrect) cls += ' wrong';
                }
                return (
                  <label key={optIdx} className={cls} onClick={() => handleSelect(q.id, optIdx)}>
                    <input type="radio" name={`q${q.id}`} checked={selected === optIdx} onChange={() => {}} />
                    <span className="option-label">{String.fromCharCode(65+optIdx)}. {opt}</span>
                  </label>
                );
              })}
            </div>
            {submitted && !isCorrect && (
              <div className="result-explanation" style={{
                borderLeft: '3px solid var(--error)',
                background: 'var(--error-light)',
                padding: '12px 16px',
                borderRadius: '0 var(--radius) var(--radius) 0',
                marginTop: '12px'
              }}>
                <div style={{fontWeight: 600, color: 'var(--error)', marginBottom: '4px', fontSize: '0.85rem'}}>
                  오답 — 정답: {String.fromCharCode(65 + q.correct_answer)}. {q.options[q.correct_answer]}
                </div>
                {q.explanation && (
                  <div style={{color: 'var(--text)', fontSize: '0.875rem'}}>{q.explanation}</div>
                )}
              </div>
            )}
            {submitted && (
              <div style={{marginTop: '8px'}}>
                {reportStatus[q.id] ? (
                  <span style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>{reportStatus[q.id]}</span>
                ) : reportingId === q.id ? (
                  <div style={{display:'flex', gap:'6px', alignItems:'center', marginTop:'4px'}}>
                    <input
                      type="text"
                      placeholder="오류 내용을 입력해주세요 (예: 정답이 B가 맞습니다)"
                      value={reportComment}
                      onChange={e => setReportComment(e.target.value)}
                      style={{flex:1, fontSize:'0.8rem', padding:'4px 8px', border:'1px solid var(--border)', borderRadius:'var(--radius)'}}
                    />
                    <button className="btn btn-primary btn-sm" onClick={() => handleReport(q.id)}>접수</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setReportingId(null); setReportComment(''); }}>취소</button>
                  </div>
                ) : (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{fontSize:'0.72rem', padding:'2px 8px'}}
                    onClick={() => { setReportingId(q.id); setReportComment(''); }}
                  >
                    오류 신고
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {!submitted && (
        <div style={{textAlign:'center', marginTop:'24px'}}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{padding:'12px 40px', fontSize:'1rem'}}>
            {submitting ? <><span className="spinner" /> 제출 중...</> : '답안 제출'}
          </button>
          <p className="text-sm text-muted mt-2">
            {Object.keys(answers).length} / {questions.length} 문제 답변 완료
          </p>
        </div>
      )}
    </div>
  );
}
