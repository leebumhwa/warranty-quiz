import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { ClockWidget, CalendarWidget, WeatherWidget, NoticesWidget, LeaderboardWidget, AdminScheduleWidget } from '../components/DashboardWidgets';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function QuizCard({ quiz }) {
  const colors = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'];
  const color = colors[quiz.id % colors.length];

  return (
    <div className="quiz-card-v2">
      <div className="quiz-card-v2-accent" style={{ background: color }} />
      <div className="quiz-card-v2-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
          <h2 className="quiz-card-v2-title">{quiz.title}</h2>
          <span className="quiz-card-v2-badge" style={{ background: `${color}18`, color }}>
            {quiz.question_count}문제
          </span>
        </div>
        {quiz.description && (
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.5 }}>
            {quiz.description}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {quiz.creator_name} · {formatDate(quiz.created_at)}
          </span>
          {quiz.question_count > 0 ? (
            <Link to={`/quiz/${quiz.id}`} className="btn btn-sm"
              style={{ background: color, color: 'white', border: 'none', flexShrink: 0 }}>
              시작 →
            </Link>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>문제 없음</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    api.get('/quizzes')
      .then(res => setQuizzes(res.data.quizzes))
      .catch(() => setError('퀴즈 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
    if (isAdmin) {
      api.get('/schedules').then(r => setSchedules(r.data.schedules)).catch(() => {});
    }
  }, [isAdmin]);

  const filtered = quizzes.filter(q =>
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    (q.description || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-screen">퀴즈 목록 로딩 중...</div>;

  return (
    <div className="page" style={{ maxWidth: '1200px' }}>
      <div className="dashboard-layout">
        {/* ── Main ── */}
        <main className="dashboard-main">
          <div style={{ marginBottom: '20px' }}>
            <h1 className="page-title" style={{ marginBottom: '4px' }}>퀴즈 목록</h1>
            <p className="page-subtitle" style={{ marginBottom: '16px' }}>
              총 {quizzes.length}개의 퀴즈가 있습니다.
            </p>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1rem' }}>🔍</span>
              <input
                type="text"
                className="form-input"
                placeholder="퀴즈 검색..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {filtered.length === 0 ? (
            <div className="empty-state" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <p style={{ fontSize: '2rem', marginBottom: '8px' }}>{search ? '🔍' : '📝'}</p>
              <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                {search ? `"${search}" 검색 결과가 없습니다.` : '아직 생성된 퀴즈가 없습니다.'}
              </p>
              {!search && <p className="text-sm text-muted">관리자가 퀴즈를 생성하면 여기에 표시됩니다.</p>}
            </div>
          ) : (
            <div className="quiz-grid-v2">
              {filtered.map(quiz => <QuizCard key={quiz.id} quiz={quiz} />)}
            </div>
          )}
        </main>

        {/* ── Sidebar ── */}
        <aside className="dashboard-sidebar">
          <ClockWidget />
          <WeatherWidget />
          {isAdmin && <AdminScheduleWidget schedules={schedules} />}
          <LeaderboardWidget />
          <NoticesWidget />
          <CalendarWidget scheduleDates={isAdmin ? new Set(schedules.map(s => s.date)) : null} />
        </aside>
      </div>
    </div>
  );
}
