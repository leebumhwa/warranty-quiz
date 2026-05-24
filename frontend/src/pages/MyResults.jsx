import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function MyResults() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadResults = () => api.get('/results/me').then(res => setResults(res.data.results)).finally(() => setLoading(false));

  useEffect(() => { loadResults(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('이 기록을 삭제하시겠습니까?')) return;
    await api.delete(`/results/${id}`);
    loadResults();
  };

  if (loading) return <div className="loading-screen">기록 로딩 중...</div>;

  return (
    <div className="page">
      <h1 className="page-title">내 퀴즈 기록</h1>
      <p className="page-subtitle">지금까지 푼 퀴즈 결과를 확인하세요.</p>
      {results.length === 0 ? (
        <div className="empty-state">
          <p style={{fontSize:'2rem', marginBottom:'8px'}}>📊</p>
          <p>아직 푼 퀴즈가 없습니다.</p>
          <Link to="/dashboard" className="btn btn-primary btn-sm" style={{marginTop:'12px', display:'inline-flex'}}>퀴즈 시작하기</Link>
        </div>
      ) : (
        <div className="card" style={{padding:0, overflow:'hidden'}}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>퀴즈 제목</th>
                  <th>점수</th>
                  <th>정답률</th>
                  <th>결과</th>
                  <th>완료 일시</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => {
                  const pct = Math.round((r.score / r.total) * 100);
                  const passed = pct >= 60;
                  return (
                    <tr key={r.id} className={passed ? 'result-row-pass' : 'result-row-fail'}>
                      <td style={{fontWeight:500}}>{r.quiz_title}</td>
                      <td>{r.score} / {r.total}</td>
                      <td>
                        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                          <div className="progress-bar" style={{width:'80px'}}>
                            <div className="progress-fill" style={{width:`${pct}%`, background: passed ? 'var(--success)' : 'var(--error)'}} />
                          </div>
                          <span>{pct}%</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding:'2px 8px', borderRadius:'999px', fontSize:'0.75rem', fontWeight:600,
                          background: passed ? 'var(--success-light)' : 'var(--error-light)',
                          color: passed ? 'var(--success)' : 'var(--error)',
                        }}>
                          {passed ? '합격' : '불합격'}
                        </span>
                      </td>
                      <td className="text-muted text-sm">{formatDate(r.completed_at)}</td>
                      <td>
                        <div style={{display:'flex', gap:'6px'}}>
                          <Link to={`/quiz/${r.quiz_id}`} className="btn btn-secondary btn-sm">다시 풀기</Link>
                          {isAdmin && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>삭제</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
