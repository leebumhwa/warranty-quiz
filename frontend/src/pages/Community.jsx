import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

function formatDate(d) {
  const date = new Date(d);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function CreatePostForm({ onSuccess, onCancel }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) { setError('제목과 내용을 입력해주세요.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/community/posts', { title: title.trim(), content: content.trim() });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || '등록 실패');
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid var(--primary)' }}>
      <div className="card-title">✏️ 새 글 작성</div>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">제목 *</label>
          <input type="text" className="form-input" placeholder="글 제목을 입력하세요"
            value={title} onChange={e => setTitle(e.target.value)} disabled={loading} />
        </div>
        <div className="form-group">
          <label className="form-label">내용 *</label>
          <textarea className="form-textarea" placeholder="내용을 입력하세요" rows={5}
            value={content} onChange={e => setContent(e.target.value)} disabled={loading}
            style={{ minHeight: '120px' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" /> 등록 중...</> : '등록'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>취소</button>
        </div>
      </form>
    </div>
  );
}

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/community/posts')
      .then(r => setPosts(r.data.posts))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = posts.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.author_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page" style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>💬 커뮤니티</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>자유롭게 의견을 나눠보세요.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ 취소' : '✏️ 글 쓰기'}
        </button>
      </div>

      {showForm && (
        <CreatePostForm
          onSuccess={() => { load(); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div style={{ marginBottom: '16px', position: 'relative' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
        <input type="text" className="form-input" placeholder="제목 또는 작성자 검색..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '36px' }} />
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '200px' }}>게시글 로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <p style={{ fontSize: '2rem', marginBottom: '8px' }}>{search ? '🔍' : '💬'}</p>
          <p style={{ fontWeight: 600 }}>
            {search ? `"${search}" 검색 결과가 없습니다.` : '아직 게시글이 없습니다.'}
          </p>
          {!search && <p className="text-sm text-muted mt-2">첫 번째 글을 작성해보세요!</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          {/* header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 60px 50px', gap: '12px', padding: '10px 16px', background: 'var(--bg)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>제목</span>
            <span style={{ textAlign: 'right' }}>작성자</span>
            <span style={{ textAlign: 'center' }}>❤️ 좋아요</span>
            <span style={{ textAlign: 'center' }}>💬 댓글</span>
          </div>
          {filtered.map(p => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 60px 50px', gap: '12px', padding: '12px 16px', background: 'var(--card)', alignItems: 'center', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--card)'}>
              <div style={{ minWidth: 0 }}>
                <Link to={`/community/posts/${p.id}`}
                  style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 500, fontSize: '0.95rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.title}
                </Link>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {formatDate(p.created_at)}
                  {p.user_id === user?.id && (
                    <span style={{ marginLeft: '6px', fontSize: '0.65rem', background: 'var(--primary)', color: '#fff', padding: '1px 5px', borderRadius: '999px' }}>나</span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.author_name}
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {p.like_count > 0 ? <span style={{ color: '#ef4444' }}>❤️ {p.like_count}</span> : <span>—</span>}
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {p.comment_count > 0 ? p.comment_count : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
