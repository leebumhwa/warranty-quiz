import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

function formatDate(d) {
  return new Date(d).toLocaleString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [likeLoading, setLikeLoading] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState('');

  const load = () => {
    api.get(`/community/posts/${id}`)
      .then(r => {
        setPost(r.data.post);
        setError('');
      })
      .catch(err => {
        setError(err.response?.data?.error || '게시글을 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('이 게시글을 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/community/posts/${id}`);
      navigate('/community');
    } catch (err) {
      alert(err.response?.data?.error || '삭제 실패');
    }
  };

  const handleEditSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) { setEditError('제목과 내용을 입력해주세요.'); return; }
    setEditLoading(true); setEditError('');
    try {
      await api.put(`/community/posts/${id}`, { title: editTitle.trim(), content: editContent.trim() });
      setEditing(false);
      load();
    } catch (err) {
      setEditError(err.response?.data?.error || '수정 실패');
    } finally {
      setEditLoading(false);
    }
  };

  const handleLike = async () => {
    if (likeLoading || !post) return;
    if (post.user_id === user?.id) return;
    setLikeLoading(true);
    try {
      const res = await api.post(`/community/posts/${id}/like`);
      setPost(prev => ({ ...prev, user_liked: res.data.liked, like_count: res.data.likeCount }));
    } catch (err) {
      alert(err.response?.data?.error || '오류가 발생했습니다.');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) { setCommentError('댓글 내용을 입력해주세요.'); return; }
    setCommentLoading(true); setCommentError('');
    try {
      const res = await api.post(`/community/posts/${id}/comments`, { content: commentText.trim() });
      setPost(prev => ({ ...prev, comments: [...prev.comments, res.data.comment] }));
      setCommentText('');
    } catch (err) {
      setCommentError(err.response?.data?.error || '댓글 등록 실패');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('이 댓글을 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/community/comments/${commentId}`);
      setPost(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== commentId) }));
    } catch (err) {
      alert(err.response?.data?.error || '삭제 실패');
    }
  };

  if (loading) return <div className="loading-screen">게시글 로딩 중...</div>;
  if (error) return (
    <div className="page" style={{ maxWidth: '800px' }}>
      <div className="alert alert-error">{error}</div>
      <Link to="/community" className="btn btn-secondary">← 목록으로</Link>
    </div>
  );
  if (!post) return null;

  const isOwner = post.user_id === user?.id;
  const isAdmin = user?.role === 'admin';
  const isOwnPost = post.user_id === user?.id;

  return (
    <div className="page" style={{ maxWidth: '800px' }}>
      <Link to="/community" className="btn btn-secondary btn-sm" style={{ marginBottom: '20px' }}>← 목록으로</Link>

      {/* 게시글 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        {editing ? (
          <div>
            {editError && <div className="alert alert-error">{editError}</div>}
            <div className="form-group">
              <label className="form-label">제목</label>
              <input type="text" className="form-input" value={editTitle}
                onChange={e => setEditTitle(e.target.value)} disabled={editLoading} />
            </div>
            <div className="form-group">
              <label className="form-label">내용</label>
              <textarea className="form-textarea" rows={8} value={editContent}
                onChange={e => setEditContent(e.target.value)} disabled={editLoading}
                style={{ minHeight: '160px' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={handleEditSave} disabled={editLoading}>
                {editLoading ? <><span className="spinner" /> 저장 중...</> : '저장'}
              </button>
              <button className="btn btn-secondary" onClick={() => setEditing(false)} disabled={editLoading}>취소</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.4, flex: 1 }}>{post.title}</h1>
              {(isOwner || isAdmin) && (
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {isOwner && (
                    <button className="btn btn-secondary btn-sm" onClick={() => {
                      setEditing(true); setEditTitle(post.title); setEditContent(post.content);
                    }}>수정</button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={handleDelete}>삭제</button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <span>{post.author_name}</span>
              <span>·</span>
              <span>{formatDate(post.created_at)}</span>
              {post.updated_at !== post.created_at && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(수정됨)</span>}
            </div>
            <div style={{ fontSize: '0.95rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
              {post.content}
            </div>
          </div>
        )}

        {!editing && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={handleLike}
              disabled={likeLoading || isOwnPost}
              title={isOwnPost ? '본인 게시글에는 좋아요를 누를 수 없습니다.' : ''}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: 'var(--radius)',
                border: `1.5px solid ${post.user_liked ? '#ef4444' : 'var(--border)'}`,
                background: post.user_liked ? '#fef2f2' : 'transparent',
                cursor: isOwnPost ? 'not-allowed' : 'pointer',
                color: post.user_liked ? '#ef4444' : 'var(--text-muted)',
                fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.15s',
                opacity: isOwnPost ? 0.5 : 1,
              }}>
              {post.user_liked ? '❤️' : '🤍'} {post.like_count}
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              💬 댓글 {post.comments?.length || 0}개
            </span>
          </div>
        )}
      </div>

      {/* 댓글 */}
      <div className="card">
        <div className="card-title">댓글 {post.comments?.length || 0}개</div>

        {(post.comments || []).length === 0 ? (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px' }}>아직 댓글이 없습니다. 첫 댓글을 작성해보세요!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '24px' }}>
            {post.comments.map((c, idx) => {
              const isCommentOwner = c.user_id === user?.id;
              const canDelete = isCommentOwner || isAdmin;
              return (
                <div key={c.id} style={{
                  padding: '12px 0',
                  borderBottom: idx < post.comments.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{c.author_name}</span>
                        {isCommentOwner && (
                          <span style={{ fontSize: '0.65rem', background: 'var(--primary)', color: '#fff', padding: '1px 5px', borderRadius: '999px' }}>나</span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(c.created_at)}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap', margin: 0 }}>{c.content}</p>
                    </div>
                    {canDelete && (
                      <button className="btn btn-danger btn-sm" style={{ flexShrink: 0 }}
                        onClick={() => handleDeleteComment(c.id)}>삭제</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 댓글 작성 폼 */}
        <form onSubmit={handleComment}>
          {commentError && <div className="alert alert-error">{commentError}</div>}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <textarea
              className="form-textarea"
              placeholder="댓글을 입력하세요..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              disabled={commentLoading}
              rows={2}
              style={{ flex: 1, minHeight: '64px' }}
            />
            <button type="submit" className="btn btn-primary" disabled={commentLoading} style={{ flexShrink: 0 }}>
              {commentLoading ? <span className="spinner" /> : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
