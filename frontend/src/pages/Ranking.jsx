import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const MEDAL = ['🥇', '🥈', '🥉'];

function ScoreBar({ score, max }) {
  const pct = max > 0 ? Math.min(Math.round((score / max) * 100), 100) : 0;
  const color = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--primary)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div className="progress-bar" style={{ width: '80px' }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color, minWidth: '40px' }}>{score}</span>
    </div>
  );
}

export default function Ranking() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ranking')
      .then(r => setData(r.data.ranking))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen">랭킹 로딩 중...</div>;

  const myEntry = data.find(r => r.user_id === user?.id);
  const maxScore = data.length > 0 ? data[0].ranking_score : 1;

  return (
    <div className="page" style={{ maxWidth: '760px' }}>
      <h1 className="page-title">🏆 랭킹</h1>
      <p className="page-subtitle">
        공식 퀴즈 결과를 기준으로 산정합니다. &nbsp;
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          점수 = 누적 정답 수 × 0.5 + 평균 정답률 × 0.5
        </span>
      </p>

      {myEntry && (
        <div className="card mb-4" style={{ borderLeft: '4px solid var(--primary)', background: 'var(--primary-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', minWidth: '48px', textAlign: 'center' }}>
              {myEntry.rank <= 3 ? MEDAL[myEntry.rank - 1] : `${myEntry.rank}위`}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>내 순위 — {myEntry.user_name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                누적 정답 {myEntry.total_score}개 · 평균 정답률 {myEntry.avg_accuracy}% · 응시 {myEntry.quiz_count}회
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{myEntry.ranking_score}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>랭킹 점수</div>
            </div>
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="empty-state card">아직 공식 퀴즈를 푼 사용자가 없습니다.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', width: '60px', textAlign: 'center' }}>순위</th>
                <th style={{ padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>이름</th>
                <th style={{ padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>누적 정답 수</th>
                <th style={{ padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>평균 정답률</th>
                <th style={{ padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>랭킹 점수</th>
              </tr>
            </thead>
            <tbody>
              {data.map(r => {
                const isMe = r.user_id === user?.id;
                return (
                  <tr key={r.user_id} style={{ background: isMe ? 'var(--primary-light)' : 'transparent' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
                      {r.rank <= 3
                        ? <span style={{ fontSize: '1.2rem' }}>{MEDAL[r.rank - 1]}</span>
                        : `${r.rank}위`}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: isMe ? 700 : 500 }}>{r.user_name}</span>
                      {isMe && (
                        <span style={{ marginLeft: '6px', fontSize: '0.72rem', background: 'var(--primary)', color: '#fff', padding: '1px 6px', borderRadius: '999px' }}>나</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      {r.total_score}개
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                        background: r.avg_accuracy >= 80 ? 'var(--success-light)' : r.avg_accuracy >= 60 ? 'var(--warning-light)' : 'var(--error-light)',
                        color: r.avg_accuracy >= 80 ? 'var(--success)' : r.avg_accuracy >= 60 ? 'var(--warning)' : 'var(--error)',
                      }}>
                        {r.avg_accuracy}%
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <ScoreBar score={r.ranking_score} max={maxScore} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center' }}>
        상위 50명 표시 · 공식 퀴즈 결과만 반영 · 비공개 퀴즈 제외
      </p>
    </div>
  );
}
