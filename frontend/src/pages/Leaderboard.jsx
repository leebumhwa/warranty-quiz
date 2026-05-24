import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const MEDAL = ['🥇', '🥈', '🥉'];

function AccuracyBar({ pct }) {
  const color = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--error)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div className="progress-bar" style={{ width: '80px' }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color }}>{pct}%</span>
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/results/leaderboard')
      .then(r => setData(r.data.leaderboard))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen">랭킹 로딩 중...</div>;

  const myEntry = data.find(r => r.user_id === user?.id);

  return (
    <div className="page" style={{ maxWidth: '720px' }}>
      <h1 className="page-title">🏆 사용자 랭킹</h1>
      <p className="page-subtitle">평균 정답률을 기준으로 순위를 산정합니다. 동점 시 퀴즈 응시 횟수가 많을수록 높은 순위입니다.</p>

      {myEntry && (
        <div className="card mb-4" style={{ borderLeft: '4px solid var(--primary)', background: 'var(--primary-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', minWidth: '40px', textAlign: 'center' }}>
              {myEntry.rank <= 3 ? MEDAL[myEntry.rank - 1] : `${myEntry.rank}위`}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>내 순위 — {myEntry.user_name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                응시 {myEntry.quiz_count}회 · 총 {myEntry.total_score}/{myEntry.total_questions}문제 정답
              </div>
            </div>
            <AccuracyBar pct={myEntry.avg_accuracy} />
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="empty-state card">아직 퀴즈를 푼 사용자가 없습니다.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', width: '60px', textAlign: 'center' }}>순위</th>
                <th style={{ padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>이름</th>
                <th style={{ padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>응시 횟수</th>
                <th style={{ padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>평균 정답률</th>
                <th style={{ padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>총 정답</th>
              </tr>
            </thead>
            <tbody>
              {data.map(r => {
                const isMe = r.user_id === user?.id;
                return (
                  <tr key={r.user_id} style={{ background: isMe ? 'var(--primary-light)' : 'transparent' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
                      {r.rank <= 3 ? <span style={{ fontSize: '1.2rem' }}>{MEDAL[r.rank - 1]}</span> : `${r.rank}위`}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: isMe ? 700 : 500 }}>{r.user_name}</span>
                      {isMe && <span style={{ marginLeft: '6px', fontSize: '0.72rem', background: 'var(--primary)', color: '#fff', padding: '1px 6px', borderRadius: '999px' }}>나</span>}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      {r.quiz_count}회
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <AccuracyBar pct={r.avg_accuracy} />
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      {r.total_score}/{r.total_questions}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
