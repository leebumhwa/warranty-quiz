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
            </div>
          </div>
          <h2 style={{marginBottom:'16px', fontSize:'1rem', fontWeight:600}}>문제별 결과</h2>
        </>
      ) : (
        <div style={{marginBottom:'24px'}}>
          <Link to="/dashboard" className="text-muted text-sm" style={{textDecoration:'none'}}>← 목록으로</Link>
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
            {submitted && q.explanation && (
              <div className="result-explanation">
                <strong>설명:</strong> {q.explanation}
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
