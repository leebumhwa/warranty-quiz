import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { ClockWidget, CalendarWidget, WeatherWidget, NoticesWidget, LeaderboardWidget, AdminScheduleWidget } from '../components/DashboardWidgets';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function QuizCard({ quiz, isPrivate }) {
  const colors = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'];
  const color = colors[quiz.id % colors.length];

  return (
    <div className="quiz-card-v2">
      <div className="quiz-card-v2-accent" style={{ background: color }} />
      <div className="quiz-card-v2-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
          <h2 className="quiz-card-v2-title">{quiz.title}</h2>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
            {isPrivate && (
              <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700, background: 'var(--warning-light)', color: 'var(--warning)' }}>
                비공개
              </span>
            )}
            <span className="quiz-card-v2-badge" style={{ background: `${color}18`, color }}>
              {quiz.question_count}문제
            </span>
          </div>
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

function CreateQuizForm({ onSuccess }) {
  const [activeFiles, setActiveFiles] = useState([]);
  const [fileLoading, setFileLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/source-files/active')
      .then(r => setActiveFiles(r.data.files || []))
      .catch(() => setActiveFiles([]))
      .finally(() => setFileLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('퀴즈 제목을 입력해주세요.'); return; }
    setGenerating(true); setError(''); setSuccess('');
    try {
      const res = await api.post('/quizzes/generate-private', {
        title: title.trim(),
        questionCount,
      });
      const count = res.data.questions?.length || questionCount;
      setSuccess(`"${res.data.quiz.title}" 퀴즈가 생성되었습니다. (${count}개 문제)`);
      setTitle(''); setQuestionCount(10);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || '퀴즈 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid var(--primary)' }}>
      <div className="card-title">✨ 퀴즈 만들기</div>

      {fileLoading ? (
        <p className="text-sm text-muted">파일 정보 로딩 중...</p>
      ) : activeFiles.length > 0 ? (
        <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--success)' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '4px' }}>현재 생성 가능한 파일 ({activeFiles.length}개)</div>
          {activeFiles.map(f => (
            <div key={f.id} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)' }}>📄 {f.name}</div>
          ))}
        </div>
      ) : (
        <div className="alert alert-warning" style={{ marginBottom: '12px' }}>
          현재 지정된 소스 파일이 없습니다. 관리자에게 문의하세요.
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {!success && (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">퀴즈 세트 이름 *</label>
            <input type="text" className="form-input" placeholder="예: 보증 정책 복습"
              value={title} onChange={e => setTitle(e.target.value)} disabled={activeFiles.length === 0 || generating} />
          </div>
          <div className="form-group">
            <label className="form-label">문제 수 (1~20)</label>
            <input type="number" className="form-input" min={1} max={20}
              value={questionCount} onChange={e => setQuestionCount(parseInt(e.target.value) || 5)}
              disabled={activeFiles.length === 0 || generating} />
          </div>
          <button type="submit" className="btn btn-primary"
            disabled={activeFiles.length === 0 || generating}>
            {generating
              ? <><span className="spinner" /> AI가 문제를 생성 중입니다... (30초~1분 소요)</>
              : '퀴즈 생성'}
          </button>
          {generating && <p className="text-sm text-muted mt-2">잠시 기다려 주세요.</p>}
        </form>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [quizTab, setQuizTab] = useState('official');
  const [officialQuizzes, setOfficialQuizzes] = useState([]);
  const [myQuizzes, setMyQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadOfficialQuizzes = () =>
    api.get('/quizzes/public').then(res => setOfficialQuizzes(res.data.quizzes)).catch(() => {});

  const loadMyQuizzes = () =>
    api.get('/quizzes/my').then(res => setMyQuizzes(res.data.quizzes)).catch(() => {});

  useEffect(() => {
    setLoading(true);
    Promise.all([loadOfficialQuizzes(), loadMyQuizzes()])
      .catch(() => setError('퀴즈 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
    if (isAdmin) {
      api.get('/schedules').then(r => setSchedules(r.data.schedules)).catch(() => {});
    }
  }, [isAdmin]);

  const currentList = quizTab === 'official' ? officialQuizzes : myQuizzes;
  const filtered = currentList.filter(q =>
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

            {/* 탭 */}
            <div className="tabs" style={{ marginBottom: '16px' }}>
              <button className={`tab-btn ${quizTab === 'official' ? 'active' : ''}`}
                onClick={() => { setQuizTab('official'); setSearch(''); setShowCreateForm(false); }}>
                📋 공식 퀴즈 ({officialQuizzes.length})
              </button>
              <button className={`tab-btn ${quizTab === 'my' ? 'active' : ''}`}
                onClick={() => { setQuizTab('my'); setSearch(''); }}>
                🔒 내가 만든 퀴즈 ({myQuizzes.length})
              </button>
            </div>

            {/* 검색 + 내 퀴즈 탭 버튼 */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
                <input type="text" className="form-input" placeholder="퀴즈 검색..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: '36px' }} />
              </div>
              {quizTab === 'my' && (
                <button className="btn btn-primary" style={{ flexShrink: 0 }}
                  onClick={() => setShowCreateForm(v => !v)}>
                  {showCreateForm ? '✕ 닫기' : '✨ 퀴즈 만들기'}
                </button>
              )}
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* 퀴즈 생성 폼 */}
          {quizTab === 'my' && showCreateForm && (
            <CreateQuizForm onSuccess={() => { loadMyQuizzes(); setShowCreateForm(false); }} />
          )}

          {filtered.length === 0 ? (
            <div className="empty-state" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <p style={{ fontSize: '2rem', marginBottom: '8px' }}>{search ? '🔍' : quizTab === 'my' ? '🔒' : '📝'}</p>
              <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                {search
                  ? `"${search}" 검색 결과가 없습니다.`
                  : quizTab === 'my'
                    ? '아직 만든 퀴즈가 없습니다.'
                    : '아직 생성된 퀴즈가 없습니다.'}
              </p>
              {!search && quizTab === 'my' && (
                <p className="text-sm text-muted">위의 "퀴즈 만들기" 버튼으로 나만의 퀴즈를 생성해보세요.</p>
              )}
              {!search && quizTab === 'official' && (
                <p className="text-sm text-muted">관리자가 퀴즈를 생성하면 여기에 표시됩니다.</p>
              )}
            </div>
          ) : (
            <div className="quiz-grid-v2">
              {filtered.map(quiz => (
                <QuizCard key={quiz.id} quiz={quiz} isPrivate={quizTab === 'my'} />
              ))}
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
