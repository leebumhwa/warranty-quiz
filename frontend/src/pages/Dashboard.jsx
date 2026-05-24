import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Dashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/quizzes')
      .then(res => setQuizzes(res.data.quizzes))
      .catch(() => setError('퀴즈 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen">퀴즈 목록 로딩 중...</div>;

  return (
    <div className="page">
      <h1 className="page-title">퀴즈 목록</h1>
      <p className="page-subtitle">아래 퀴즈 중 하나를 선택하여 시작하세요.</p>
      {error && <div className="alert alert-error">{error}</div>}
      {quizzes.length === 0 ? (
        <div className="empty-state">
          <p style={{fontSize:'2rem', marginBottom:'8px'}}>📝</p>
          <p>아직 생성된 퀴즈가 없습니다.</p>
          <p className="text-sm mt-2">관리자가 퀴즈를 생성하면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="quiz-grid">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="quiz-card">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px'}}>
                <h2 className="quiz-card-title">{quiz.title}</h2>
                <span className="quiz-card-badge">{quiz.question_count}문제</span>
              </div>
              {quiz.description && (
                <p style={{fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:'8px'}}>{quiz.description}</p>
              )}
              <p className="quiz-card-meta">
                생성자: {quiz.creator_name} · {formatDate(quiz.created_at)}
              </p>
              {quiz.question_count > 0 ? (
                <Link to={`/quiz/${quiz.id}`} className="btn btn-primary btn-sm" style={{width:'100%', justifyContent:'center'}}>
                  퀴즈 시작
                </Link>
              ) : (
                <button className="btn btn-secondary btn-sm" style={{width:'100%'}} disabled>
                  문제 없음
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
