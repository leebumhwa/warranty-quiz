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

function AccuracyChart({ results }) {
  const data = [...results].reverse(); // 오래된 순으로
  if (data.length < 2) return null;

  const W = 600, H = 200, PAD = { top: 16, right: 20, bottom: 36, left: 44 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const pcts = data.map(r => Math.round((r.score / r.total) * 100));
  const xStep = innerW / (data.length - 1);

  const toX = i => PAD.left + i * xStep;
  const toY = v => PAD.top + innerH - (v / 100) * innerH;

  const linePath = pcts.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(v)}`).join(' ');
  const areaPath = `${linePath} L${toX(data.length - 1)},${PAD.top + innerH} L${toX(0)},${PAD.top + innerH} Z`;

  const yTicks = [0, 25, 50, 75, 100];
  const threshold = 60;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 320, display: 'block' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Y 눈금선 */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD.left} y1={toY(v)} x2={PAD.left + innerW} y2={toY(v)}
              stroke="var(--border)" strokeWidth="1" strokeDasharray={v === 0 ? '0' : '3 3'} />
            <text x={PAD.left - 6} y={toY(v) + 4} textAnchor="end"
              fontSize="10" fill="var(--text-muted)">{v}%</text>
          </g>
        ))}

        {/* 합격선 (60%) */}
        <line x1={PAD.left} y1={toY(threshold)} x2={PAD.left + innerW} y2={toY(threshold)}
          stroke="var(--success)" strokeWidth="1.2" strokeDasharray="5 3" opacity="0.7" />
        <text x={PAD.left + innerW + 2} y={toY(threshold) + 4}
          fontSize="9" fill="var(--success)" opacity="0.9">합격선</text>

        {/* 면적 */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* 꺾은선 */}
        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* 데이터 포인트 + X 레이블 */}
        {data.map((r, i) => {
          const v = pcts[i];
          const cx = toX(i);
          const cy = toY(v);
          const passed = v >= 60;
          const label = new Date(r.completed_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
          return (
            <g key={r.id}>
              <circle cx={cx} cy={cy} r="4" fill={passed ? 'var(--success)' : 'var(--error)'}
                stroke="var(--card)" strokeWidth="1.5" />
              <text x={cx} y={cy - 9} textAnchor="middle" fontSize="9" fontWeight="600"
                fill={passed ? 'var(--success)' : 'var(--error)'}>{v}%</text>
              {/* X축 날짜 — 겹침 방지: 점이 5개 이하이거나 짝수 인덱스만 표시 */}
              {(data.length <= 6 || i % Math.ceil(data.length / 6) === 0) && (
                <text x={cx} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{label}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
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
        <>
          {results.length >= 2 && (
            <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '12px' }}>📈 정답률 추이</div>
              <AccuracyChart results={results} />
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />합격 (60% 이상)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--error)', display: 'inline-block' }} />불합격
                </span>
              </div>
            </div>
          )}
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
        </>
      )}
    </div>
  );
}
