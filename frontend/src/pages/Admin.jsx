import { useState, useEffect, useRef } from 'react';
import api from '../api';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function SourceFilesTab() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);

  const load = () => api.get('/source-files').then(r => setFiles(r.data.files)).catch(() => {});

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setMsg('파일을 선택해주세요.'); return; }
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true); setMsg('');
    try {
      await api.post('/source-files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg('업로드 완료!');
      fileRef.current.value = '';
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || '업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.patch(`/source-files/${id}/activate`);
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || '변경 실패');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" 파일을 삭제하시겠습니까?`)) return;
    await api.delete(`/source-files/${id}`);
    load();
  };

  const activeFiles = files.filter(f => f.is_active);

  return (
    <div>
      <div className="card mb-4">
        <div className="card-title">📂 소스 파일 업로드</div>
        <p className="text-sm text-muted mb-4">
          일반 사용자가 퀴즈를 생성할 때 사용할 기반 파일입니다. PDF, DOCX, TXT 지원. (최대 20MB)<br />
          <strong>복수 지정 가능</strong> — 지정된 모든 파일을 합쳐서 퀴즈를 생성합니다.
        </p>
        {activeFiles.length > 0 && (
          <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--success)', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '4px' }}>현재 지정된 파일 ({activeFiles.length}개)</div>
            {activeFiles.map(f => (
              <div key={f.id} style={{ color: 'var(--text)', fontSize: '0.82rem' }}>📄 {f.name}</div>
            ))}
          </div>
        )}
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label className="form-label">파일 선택</label>
            <input ref={fileRef} type="file" className="form-input" accept=".pdf,.doc,.docx,.txt,.md" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? <><span className="spinner" /> 업로드 중...</> : '업로드'}
          </button>
        </form>
        {msg && (
          <div className={`alert mt-3 ${msg.includes('완료') ? 'alert-success' : 'alert-error'}`}>
            {msg}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">업로드된 소스 파일 ({files.length}개)</div>
        {files.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px' }}>업로드된 소스 파일이 없습니다.</div>
        ) : (
          <div className="file-list">
            {files.map(f => (
              <div key={f.id} className="file-item"
                style={{ background: f.is_active ? 'var(--success-light)' : 'var(--bg)', borderColor: f.is_active ? 'var(--success)' : 'var(--border)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="file-name">{f.name}</span>
                    {f.is_active && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '1px 8px', borderRadius: '999px', background: 'var(--success)', color: '#fff' }}>
                        지정됨
                      </span>
                    )}
                  </div>
                  <div className="file-meta">{formatSize(f.file_size)} · {f.uploader_name} · {new Date(f.created_at).toLocaleDateString('ko-KR')}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className={`btn btn-sm ${f.is_active ? 'btn-secondary' : 'btn-success'}`}
                    onClick={() => handleToggle(f.id)}
                  >
                    {f.is_active ? '지정 해제' : '지정'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f.id, f.name)}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(d) {
  return new Date(d).toLocaleString('ko-KR', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

export default function Admin() {
  const [tab, setTab] = useState('files');
  const [files, setFiles] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [reports, setReports] = useState([]);
  const [notices, setNotices] = useState([]);
  const [noticeInput, setNoticeInput] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');
  const [editingNotice, setEditingNotice] = useState(null);
  const [editNoticeValue, setEditNoticeValue] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [schedDate, setSchedDate] = useState('');
  const [schedTitle, setSchedTitle] = useState('');
  const [schedNote, setSchedNote] = useState('');
  const [schedMsg, setSchedMsg] = useState('');
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editSchedForm, setEditSchedForm] = useState({});
  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState({});
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editingFileNotes, setEditingFileNotes] = useState(null);
  const [fileNotesValue, setFileNotesValue] = useState('');
  const [selectedResults, setSelectedResults] = useState(new Set());
  const [members, setMembers] = useState([]);
  const [memberMsg, setMemberMsg] = useState('');

  // File upload state
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  // Generate quiz state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDesc, setQuizDesc] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState('');
  const [genError, setGenError] = useState('');

  const loadFiles = () => api.get('/files').then(r => setFiles(r.data.files)).catch(() => {});
  const loadQuizzes = () => api.get('/quizzes').then(r => setQuizzes(r.data.quizzes)).catch(() => {});
  const loadResults = () => api.get('/results/all').then(r => setAllResults(r.data.results)).catch(() => {});
  const loadReports = () => api.get('/quizzes/reports').then(r => setReports(r.data.reports)).catch(() => {});
  const loadNotices = () => api.get('/notices').then(r => setNotices(r.data.notices)).catch(() => {});
  const loadSchedules = () => api.get('/schedules')
    .then(r => setSchedules(r.data.schedules))
    .catch(err => setSchedMsg(`일정 로드 실패: ${err.response?.data?.error || err.message}`));
  const loadMembers = () => api.get('/auth/users').then(r => setMembers(r.data.users)).catch(() => {});

  useEffect(() => { loadFiles(); loadQuizzes(); loadResults(); loadReports(); loadNotices(); loadSchedules(); loadMembers(); }, []);

  // --- File management ---
  const handleUpload = async (e) => {
    e.preventDefault();
    const fileList = fileInputRef.current?.files;
    if (!fileList || fileList.length === 0) { setUploadMsg('파일을 선택해주세요.'); return; }
    const formData = new FormData();
    for (const f of fileList) formData.append('files', f);
    setUploading(true); setUploadMsg('');
    try {
      const res = await api.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { uploaded, errors } = res.data;
      let msg = `${uploaded.length}개 파일 업로드 완료.`;
      if (errors.length > 0) msg += ` 오류: ${errors.join(', ')}`;
      setUploadMsg(msg);
      fileInputRef.current.value = '';
      loadFiles();
    } catch (err) {
      setUploadMsg(err.response?.data?.error || '업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (id, name) => {
    if (!window.confirm(`"${name}" 파일을 삭제하시겠습니까?`)) return;
    await api.delete(`/files/${id}`);
    loadFiles();
  };

  // --- Quiz generation ---
  const toggleFileSelect = (id) => {
    setSelectedFiles(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!quizTitle.trim()) { setGenError('퀴즈 제목을 입력해주세요.'); return; }
    if (selectedFiles.length === 0) { setGenError('파일을 하나 이상 선택해주세요.'); return; }
    setGenerating(true); setGenError(''); setGenMsg('');
    try {
      const res = await api.post('/quizzes/generate', {
        title: quizTitle, description: quizDesc,
        fileIds: selectedFiles, questionCount,
      }, { timeout: 65000 });
      const count = res.data.questions.length;
      setGenMsg(`"${quizTitle}" 퀴즈가 생성되었습니다. (${count}개 문제)`);
      setQuizTitle(''); setQuizDesc(''); setSelectedFiles([]); setQuestionCount(10);
      loadQuizzes();
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setGenError('퀴즈 생성 시간이 초과됐습니다. 문제 수를 줄이거나 다시 시도해주세요.');
      } else {
        setGenError(err.response?.data?.error || err.message || '퀴즈 생성에 실패했습니다.');
      }
    } finally {
      setGenerating(false);
    }
  };

  // --- Bulk result delete ---
  const toggleResultSelect = (id) => {
    setSelectedResults(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAllResults = () => {
    if (selectedResults.size === allResults.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(allResults.map(r => r.id)));
    }
  };
  const handleBulkDelete = async () => {
    if (selectedResults.size === 0) return;
    if (!window.confirm(`선택한 ${selectedResults.size}개의 결과를 삭제하시겠습니까?`)) return;
    await Promise.all([...selectedResults].map(id => api.delete(`/results/${id}`)));
    setSelectedResults(new Set());
    loadResults();
  };

  // --- Print quiz ---
  const handlePrintQuiz = (quizId) => {
    const quiz = quizzes.find(q => q.id === quizId);
    const questions = quizQuestions[quizId] || [];
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html lang="ko"><head>
      <meta charset="UTF-8">
      <title>${quiz?.title || '퀴즈'} — 인쇄</title>
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; max-width: 740px; margin: 0 auto; padding: 32px 24px; color: #0f172a; }
        h1 { font-size: 1.4rem; margin-bottom: 4px; }
        .meta { font-size: 0.8rem; color: #64748b; margin-bottom: 24px; }
        .question { margin-bottom: 28px; page-break-inside: avoid; }
        .q-num { font-size: 0.75rem; color: #64748b; font-weight: 600; margin-bottom: 4px; }
        .q-text { font-size: 1rem; font-weight: 600; margin-bottom: 10px; line-height: 1.5; }
        .options { display: flex; flex-direction: column; gap: 6px; }
        .option { display: flex; align-items: flex-start; gap: 8px; font-size: 0.9rem; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; }
        .opt-label { font-weight: 700; min-width: 20px; }
        .answer { margin-top: 8px; font-size: 0.8rem; color: #16a34a; font-weight: 600; }
        .explanation { font-size: 0.8rem; color: #64748b; margin-top: 4px; }
        hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>
      <h1>${quiz?.title || '퀴즈'}</h1>
      <div class="meta">${quiz?.description || ''} · 총 ${questions.length}문제 · 인쇄일: ${new Date().toLocaleDateString('ko-KR')}</div>
      <hr>
      ${questions.map((q, i) => `
        <div class="question">
          <div class="q-num">문제 ${i + 1}</div>
          <div class="q-text">${q.question_text}</div>
          <div class="options">
            ${q.options.map((opt, oi) => `
              <div class="option">
                <span class="opt-label">${String.fromCharCode(65 + oi)}.</span>
                <span>${opt}</span>
              </div>`).join('')}
          </div>
          <div class="answer">정답: ${String.fromCharCode(65 + q.correct_answer)}. ${q.options[q.correct_answer]}</div>
          ${q.explanation ? `<div class="explanation">해설: ${q.explanation}</div>` : ''}
        </div>`).join('')}
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  // --- Quiz management ---
  const handleDeleteQuiz = async (id, title) => {
    if (!window.confirm(`"${title}" 퀴즈를 삭제하시겠습니까? 관련 결과도 모두 삭제됩니다.`)) return;
    await api.delete(`/quizzes/${id}`);
    loadQuizzes(); loadResults();
  };

  const handleDeleteQuestion = async (qid, quizId) => {
    if (!window.confirm('이 문제를 삭제하시겠습니까?')) return;
    await api.delete(`/quizzes/questions/${qid}`);
    const res = await api.get(`/quizzes/${quizId}`);
    setQuizQuestions(prev => ({ ...prev, [quizId]: res.data.questions.map(q => ({...q, options: JSON.parse(q.options)})) }));
    loadQuizzes();
  };

  const handleExpandQuiz = async (quizId) => {
    if (expandedQuiz === quizId) { setExpandedQuiz(null); return; }
    setExpandedQuiz(quizId);
    if (!quizQuestions[quizId]) {
      const res = await api.get(`/quizzes/${quizId}`);
      setQuizQuestions(prev => ({ ...prev, [quizId]: res.data.questions.map(q => ({...q, options: JSON.parse(q.options)})) }));
    }
  };

  const startEdit = (q) => {
    setEditingQuestion(q.id);
    setEditForm({ question_text: q.question_text, correct_answer: q.correct_answer, explanation: q.explanation || '', options: [...q.options] });
  };

  const handleSaveEdit = async (quizId) => {
    await api.put(`/quizzes/questions/${editingQuestion}`, editForm);
    setEditingQuestion(null);
    const res = await api.get(`/quizzes/${quizId}`);
    setQuizQuestions(prev => ({ ...prev, [quizId]: res.data.questions.map(q => ({...q, options: JSON.parse(q.options)})) }));
  };

  const handleResolveReport = async (reportId) => {
    await api.patch(`/quizzes/reports/${reportId}/resolve`);
    loadReports();
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('이 신고를 삭제하시겠습니까?')) return;
    await api.delete(`/quizzes/reports/${reportId}`);
    loadReports();
  };

  const handleSaveFileNotes = async (fileId) => {
    await api.patch(`/files/${fileId}/notes`, { notes: fileNotesValue });
    setEditingFileNotes(null);
    loadFiles();
  };

  return (
    <div className="page">
      <h1 className="page-title">관리자 패널</h1>
      <div className="tabs">
        {[
          ['files','파일 관리'],
          ['source','소스 파일 관리'],
          ['generate','퀴즈 생성'],
          ['quizzes','퀴즈 관리'],
          ['results','사용자 결과'],
          ['reports',`신고 관리${reports.filter(r=>!r.resolved).length > 0 ? ` (${reports.filter(r=>!r.resolved).length})` : ''}`],
          ['notices','보증 소식'],
          ['schedules','일정 관리'],
          ['members',`회원 관리${members.filter(m=>m.status==='pending').length > 0 ? ` (${members.filter(m=>m.status==='pending').length})` : ''}`],
        ].map(([key,label]) => (
          <button key={key} className={`tab-btn ${tab===key?'active':''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* Files tab */}
      {tab === 'files' && (
        <div>
          <div className="card mb-4">
            <div className="card-title">파일 업로드</div>
            <p className="text-sm text-muted mb-4">PDF, DOCX, TXT 파일을 업로드할 수 있습니다. (최대 20MB / 파일)</p>
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label className="form-label">파일 선택 (여러 파일 가능)</label>
                <input ref={fileInputRef} type="file" className="form-input" multiple
                  accept=".pdf,.doc,.docx,.txt,.md" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={uploading}>
                {uploading ? <><span className="spinner" /> 업로드 중...</> : '업로드'}
              </button>
            </form>
            {uploadMsg && <div className={`alert mt-3 ${uploadMsg.includes('완료') ? 'alert-success' : 'alert-error'}`}>{uploadMsg}</div>}
          </div>

          <div className="card">
            <div className="card-title">업로드된 파일 ({files.length}개)</div>
            {files.length === 0 ? (
              <div className="empty-state" style={{padding:'24px'}}>업로드된 파일이 없습니다.</div>
            ) : (
              <div className="file-list">
                {files.map(f => (
                  <div key={f.id} className="file-item" style={{flexDirection:'column', alignItems:'stretch', gap:'8px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <div className="file-name">{f.original_name}</div>
                        <div className="file-meta">{formatSize(f.file_size)} · {f.uploader_name} · {formatDate(f.created_at)}</div>
                      </div>
                      <div style={{display:'flex', gap:'6px'}}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditingFileNotes(f.id); setFileNotesValue(f.correction_notes || ''); }}>수정 메모</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteFile(f.id, f.original_name)}>삭제</button>
                      </div>
                    </div>
                    {editingFileNotes === f.id && (
                      <div style={{display:'flex', gap:'6px', alignItems:'flex-start'}}>
                        <textarea
                          value={fileNotesValue}
                          onChange={e => setFileNotesValue(e.target.value)}
                          placeholder="이 파일로 퀴즈 생성 시 반영할 수정 메모 (예: '3번 조항의 기간은 2년이 아니라 3년입니다')"
                          rows={2}
                          style={{flex:1, fontSize:'0.8rem', padding:'6px 8px', border:'1px solid var(--border)', borderRadius:'var(--radius)', resize:'vertical'}}
                        />
                        <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleSaveFileNotes(f.id)}>저장</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingFileNotes(null)}>취소</button>
                        </div>
                      </div>
                    )}
                    {f.correction_notes && editingFileNotes !== f.id && (
                      <div style={{fontSize:'0.75rem', color:'var(--text-muted)', background:'var(--bg)', padding:'4px 8px', borderRadius:'var(--radius)', borderLeft:'2px solid var(--warning, #f59e0b)'}}>
                        메모: {f.correction_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Source files tab */}
      {tab === 'source' && <SourceFilesTab />}

      {/* Generate tab */}
      {tab === 'generate' && (
        <div className="card" style={{maxWidth:'600px'}}>
          <div className="card-title">AI 퀴즈 생성</div>
          <p className="text-sm text-muted mb-4">선택한 파일의 내용을 바탕으로 Claude AI가 퀴즈를 자동 생성합니다. (하루 최대 5회)</p>
          {genMsg && <div className="alert alert-success">{genMsg}</div>}
          {genError && <div className="alert alert-error">{genError}</div>}
          <form onSubmit={handleGenerate}>
            <div className="form-group">
              <label className="form-label">퀴즈 제목 *</label>
              <input type="text" className="form-input" placeholder="예: 제품 보증 정책 퀴즈"
                value={quizTitle} onChange={e => setQuizTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">설명 (선택)</label>
              <input type="text" className="form-input" placeholder="퀴즈에 대한 간단한 설명"
                value={quizDesc} onChange={e => setQuizDesc(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">문제 수 (1~30) *</label>
              <input type="number" className="form-input" min={1} max={30}
                value={questionCount} onChange={e => setQuestionCount(parseInt(e.target.value)||5)} />
            </div>
            <div className="form-group">
              <label className="form-label">파일 선택 * (여러 개 가능)</label>
              {files.length === 0 ? (
                <div className="alert alert-warning">먼저 파일을 업로드해주세요.</div>
              ) : (
                <div className="checkbox-list">
                  {files.map(f => (
                    <label key={f.id} className={`checkbox-item ${selectedFiles.includes(f.id)?'checked':''}`}>
                      <input type="checkbox" checked={selectedFiles.includes(f.id)}
                        onChange={() => toggleFileSelect(f.id)} />
                      <div>
                        <div style={{fontSize:'0.9rem', fontWeight:500}}>{f.original_name}</div>
                        <div style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>{formatSize(f.file_size)}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={generating || files.length === 0}>
              {generating ? (
                <><span className="spinner" /> AI가 문제를 생성 중입니다... (30초~1분 소요)</>
              ) : '퀴즈 생성'}
            </button>
            {generating && <p className="text-sm text-muted mt-2">Claude AI가 문서를 분석하고 있습니다. 잠시 기다려 주세요.</p>}
          </form>
        </div>
      )}

      {/* Quizzes tab */}
      {tab === 'quizzes' && (
        <div>
          <div className="card-title mb-4">생성된 퀴즈 ({quizzes.length}개)</div>
          {quizzes.length === 0 ? (
            <div className="empty-state">생성된 퀴즈가 없습니다.</div>
          ) : quizzes.map(quiz => (
            <div key={quiz.id} className="card mb-4">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:600, fontSize:'1rem'}}>{quiz.title}</div>
                  <div className="text-sm text-muted">{quiz.question_count}문제 · {formatDate(quiz.created_at)}</div>
                </div>
                <div style={{display:'flex', gap:'8px'}}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleExpandQuiz(quiz.id)}>
                    {expandedQuiz === quiz.id ? '접기' : '문제 보기'}
                  </button>
                  {expandedQuiz === quiz.id && quizQuestions[quiz.id]?.length > 0 && (
                    <button className="btn btn-secondary btn-sm" onClick={() => handlePrintQuiz(quiz.id)}>🖨️ 인쇄</button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}>삭제</button>
                </div>
              </div>

              {expandedQuiz === quiz.id && quizQuestions[quiz.id] && (
                <div style={{marginTop:'16px', borderTop:'1px solid var(--border)', paddingTop:'16px'}}>
                  {quizQuestions[quiz.id].length === 0 ? (
                    <p className="text-muted text-sm">문제가 없습니다.</p>
                  ) : quizQuestions[quiz.id].map((q, idx) => (
                    <div key={q.id} style={{marginBottom:'12px', padding:'12px', background:'var(--bg)', borderRadius:'var(--radius)'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:500, fontSize:'0.9rem', marginBottom:'6px'}}>
                            {idx+1}. {q.question_text}
                          </div>
                          {editingQuestion === q.id ? (
                            <div style={{marginTop:'8px', display:'flex', flexDirection:'column', gap:'10px'}}>
                              <div>
                                <div style={{fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'4px'}}>문제 내용</div>
                                <textarea
                                  value={editForm.question_text}
                                  onChange={e => setEditForm(f => ({...f, question_text: e.target.value}))}
                                  rows={2}
                                  style={{width:'100%', fontSize:'0.85rem', padding:'6px 8px', border:'1px solid var(--border)', borderRadius:'var(--radius)', resize:'vertical', boxSizing:'border-box'}}
                                />
                              </div>
                              <div>
                                <div style={{fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'4px'}}>선택지 수정 · 정답 클릭으로 선택</div>
                                <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                                  {editForm.options.map((opt, i) => (
                                    <div key={i} style={{display:'flex', alignItems:'center', gap:'6px'}}>
                                      <button type="button"
                                        onClick={() => setEditForm(f => ({...f, correct_answer: i}))}
                                        style={{
                                          width:'24px', height:'24px', borderRadius:'50%', flexShrink:0, cursor:'pointer',
                                          border: '2px solid', fontSize:'0.7rem', fontWeight:700,
                                          borderColor: editForm.correct_answer === i ? 'var(--success)' : 'var(--border)',
                                          background: editForm.correct_answer === i ? 'var(--success)' : 'transparent',
                                          color: editForm.correct_answer === i ? '#fff' : 'var(--text-muted)',
                                        }}>
                                        {String.fromCharCode(65+i)}
                                      </button>
                                      <input
                                        type="text"
                                        value={opt}
                                        onChange={e => setEditForm(f => {
                                          const opts = [...f.options];
                                          opts[i] = e.target.value;
                                          return {...f, options: opts};
                                        })}
                                        style={{flex:1, fontSize:'0.82rem', padding:'4px 8px', border:'1px solid var(--border)', borderRadius:'var(--radius)',
                                          borderColor: editForm.correct_answer === i ? 'var(--success)' : 'var(--border)',
                                          background: editForm.correct_answer === i ? 'var(--success-light)' : 'transparent',
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div style={{fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'4px'}}>정답 설명</div>
                                <textarea
                                  value={editForm.explanation}
                                  onChange={e => setEditForm(f => ({...f, explanation: e.target.value}))}
                                  rows={2}
                                  style={{width:'100%', fontSize:'0.82rem', padding:'6px 8px', border:'1px solid var(--border)', borderRadius:'var(--radius)', resize:'vertical', boxSizing:'border-box'}}
                                />
                              </div>
                              <div style={{display:'flex', gap:'6px'}}>
                                <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(quiz.id)}>저장</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => setEditingQuestion(null)}>취소</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{display:'flex', flexWrap:'wrap', gap:'4px'}}>
                              {q.options.map((opt, i) => (
                                <span key={i} style={{
                                  padding:'2px 8px', borderRadius:'999px', fontSize:'0.75rem',
                                  background: i === q.correct_answer ? 'var(--success-light)' : 'var(--border)',
                                  color: i === q.correct_answer ? 'var(--success)' : 'var(--text-muted)',
                                  fontWeight: i === q.correct_answer ? 600 : 400,
                                }}>
                                  {String.fromCharCode(65+i)}. {opt}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{display:'flex', gap:'4px', marginLeft:'8px', flexShrink:0}}>
                          {editingQuestion !== q.id && (
                            <button className="btn btn-secondary btn-sm" onClick={() => startEdit(q)}>수정</button>
                          )}
                          <button className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteQuestion(q.id, quiz.id)}>삭제</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Results tab */}
      {tab === 'results' && (
        <div className="card" style={{padding:0, overflow:'hidden'}}>
          <div style={{padding:'16px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px'}}>
            <div className="card-title" style={{margin:0}}>전체 사용자 결과 ({allResults.length}건)</div>
            {selectedResults.size > 0 && (
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                선택 삭제 ({selectedResults.size}개)
              </button>
            )}
          </div>
          {allResults.length === 0 ? (
            <div className="empty-state">아직 제출된 결과가 없습니다.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{width:'36px', textAlign:'center'}}>
                      <input type="checkbox"
                        checked={allResults.length > 0 && selectedResults.size === allResults.length}
                        onChange={toggleAllResults}
                        style={{cursor:'pointer'}}
                      />
                    </th>
                    <th>사용자</th>
                    <th>이메일</th>
                    <th>퀴즈</th>
                    <th>점수</th>
                    <th>정답률</th>
                    <th>완료 일시</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {allResults.map(r => {
                    const pct = Math.round((r.score / r.total) * 100);
                    const passed = pct >= 60;
                    const checked = selectedResults.has(r.id);
                    return (
                      <tr key={r.id} style={{background: checked ? 'var(--primary-light)' : ''}}>
                        <td style={{textAlign:'center'}}>
                          <input type="checkbox" checked={checked} onChange={() => toggleResultSelect(r.id)} style={{cursor:'pointer'}} />
                        </td>
                        <td style={{fontWeight:500}}>{r.user_name}</td>
                        <td className="text-muted text-sm">{r.user_email}</td>
                        <td>{r.quiz_title}</td>
                        <td>{r.score} / {r.total}</td>
                        <td>
                          <span style={{
                            padding:'2px 8px', borderRadius:'999px', fontSize:'0.75rem', fontWeight:600,
                            background: passed ? 'var(--success-light)' : 'var(--error-light)',
                            color: passed ? 'var(--success)' : 'var(--error)',
                          }}>
                            {pct}% {passed ? '합격' : '불합격'}
                          </span>
                        </td>
                        <td className="text-muted text-sm">{formatDate(r.completed_at)}</td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={async () => {
                            if (!window.confirm(`${r.user_name}의 결과를 삭제하시겠습니까?`)) return;
                            await api.delete(`/results/${r.id}`);
                            setSelectedResults(prev => { const n = new Set(prev); n.delete(r.id); return n; });
                            loadResults();
                          }}>삭제</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* Reports tab */}
      {tab === 'reports' && (
        <div>
          <div className="card-title mb-4">오류 신고 목록 ({reports.length}건 · 미해결 {reports.filter(r=>!r.resolved).length}건)</div>
          {reports.length === 0 ? (
            <div className="empty-state">신고된 문제가 없습니다.</div>
          ) : reports.map(r => (
            <div key={r.id} className="card mb-3" style={{opacity: r.resolved ? 0.6 : 1}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px'}}>
                    <span style={{
                      fontSize:'0.7rem', fontWeight:700, padding:'1px 7px', borderRadius:'999px',
                      background: r.resolved ? 'var(--border)' : 'var(--error-light)',
                      color: r.resolved ? 'var(--text-muted)' : 'var(--error)',
                    }}>{r.resolved ? '해결됨' : '미해결'}</span>
                    <span className="text-sm text-muted">{r.user_name} · {formatDate(r.created_at)}</span>
                  </div>
                  <div style={{fontSize:'0.85rem', fontWeight:600, marginBottom:'4px', color:'var(--text)'}}>
                    문제: {r.question_text}
                  </div>
                  <div style={{fontSize:'0.85rem', color:'var(--text)', background:'var(--bg)', padding:'8px 10px', borderRadius:'var(--radius)', borderLeft:'3px solid var(--error)'}}>
                    신고 내용: {r.user_comment}
                  </div>
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:'4px', flexShrink:0}}>
                  {!r.resolved && (
                    <>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => { setTab('quizzes'); setExpandedQuiz(r.quiz_id); handleExpandQuiz(r.quiz_id); }}>
                        문제 수정
                      </button>
                      <button className="btn btn-success btn-sm" onClick={() => handleResolveReport(r.id)}>해결됨</button>
                    </>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteReport(r.id)}>삭제</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Notices tab */}
      {tab === 'notices' && (
        <div style={{ maxWidth: '600px' }}>
          <div className="card mb-4">
            <div className="card-title">📢 보증 소식 등록</div>
            <p className="text-sm text-muted mb-4">등록한 소식은 대시보드 사이드바에 즉시 표시됩니다.</p>
            {noticeMsg && <div className={`alert ${noticeMsg.includes('실패') ? 'alert-error' : 'alert-success'}`}>{noticeMsg}</div>}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <textarea
                className="form-textarea"
                placeholder="소식 내용을 입력하세요. (예: 2025년 보증 정책이 업데이트되었습니다.)"
                value={noticeInput}
                onChange={e => setNoticeInput(e.target.value)}
                rows={3}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={async () => {
                if (!noticeInput.trim()) return;
                try {
                  await api.post('/notices', { content: noticeInput.trim() });
                  setNoticeInput('');
                  setNoticeMsg('소식이 등록되었습니다.');
                  loadNotices();
                  setTimeout(() => setNoticeMsg(''), 3000);
                } catch {
                  setNoticeMsg('등록에 실패했습니다.');
                }
              }}>등록</button>
            </div>
          </div>

          <div className="card">
            <div className="card-title">등록된 소식 ({notices.length}개)</div>
            {notices.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>등록된 소식이 없습니다.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notices.map(n => (
                  <div key={n.id} style={{
                    padding: '12px 14px', background: 'var(--bg)',
                    borderRadius: 'var(--radius)', borderLeft: '3px solid var(--primary)'
                  }}>
                    {editingNotice === n.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <textarea
                          className="form-textarea"
                          rows={3}
                          value={editNoticeValue}
                          onChange={e => setEditNoticeValue(e.target.value)}
                          style={{ fontSize: '0.875rem' }}
                        />
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-primary btn-sm" onClick={async () => {
                            if (!editNoticeValue.trim()) return;
                            await api.patch(`/notices/${n.id}`, { content: editNoticeValue.trim() });
                            setEditingNotice(null);
                            loadNotices();
                          }}>저장</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingNotice(null)}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{n.content}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {new Date(n.created_at).toLocaleString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setEditingNotice(n.id); setEditNoticeValue(n.content); }}>수정</button>
                          <button className="btn btn-danger btn-sm" onClick={async () => {
                            if (!window.confirm('이 소식을 삭제하시겠습니까?')) return;
                            await api.delete(`/notices/${n.id}`);
                            loadNotices();
                          }}>삭제</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Members tab */}
      {tab === 'members' && (
        <div>
          <div className="card-title mb-4">
            회원 관리 ({members.length}명 · 승인 대기 {members.filter(m => m.status === 'pending').length}명)
          </div>
          {memberMsg && (
            <div className={`alert mb-4 ${memberMsg.includes('실패') ? 'alert-error' : 'alert-success'}`}>
              {memberMsg}
            </div>
          )}
          {members.length === 0 ? (
            <div className="empty-state">가입한 회원이 없습니다.</div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>이메일</th>
                      <th>가입일</th>
                      <th>상태</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => {
                      const statusLabel = m.status === 'approved' ? '승인됨' : m.status === 'rejected' ? '거절됨' : '대기 중';
                      const statusColor = m.status === 'approved' ? 'var(--success)' : m.status === 'rejected' ? 'var(--error)' : 'var(--warning, #f59e0b)';
                      const statusBg = m.status === 'approved' ? 'var(--success-light)' : m.status === 'rejected' ? 'var(--error-light)' : '#fef3c7';
                      return (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 500 }}>{m.name}</td>
                          <td className="text-muted text-sm">{m.email}</td>
                          <td className="text-muted text-sm">{formatDate(m.created_at)}</td>
                          <td>
                            <span style={{
                              padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                              background: statusBg, color: statusColor,
                            }}>
                              {statusLabel}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {m.status !== 'approved' && (
                                <button className="btn btn-success btn-sm" onClick={async () => {
                                  try {
                                    await api.patch(`/auth/users/${m.id}/status`, { status: 'approved' });
                                    setMemberMsg(`${m.name} 님을 승인했습니다.`);
                                    setTimeout(() => setMemberMsg(''), 3000);
                                    loadMembers();
                                  } catch { setMemberMsg('승인 실패'); }
                                }}>승인</button>
                              )}
                              {m.status !== 'rejected' && (
                                <button className="btn btn-danger btn-sm" onClick={async () => {
                                  if (!window.confirm(`${m.name} 님의 가입을 거절하시겠습니까?`)) return;
                                  try {
                                    await api.patch(`/auth/users/${m.id}/status`, { status: 'rejected' });
                                    setMemberMsg(`${m.name} 님을 거절했습니다.`);
                                    setTimeout(() => setMemberMsg(''), 3000);
                                    loadMembers();
                                  } catch { setMemberMsg('거절 실패'); }
                                }}>거절</button>
                              )}
                              {m.status === 'rejected' && (
                                <button className="btn btn-secondary btn-sm" onClick={async () => {
                                  try {
                                    await api.patch(`/auth/users/${m.id}/status`, { status: 'pending' });
                                    setMemberMsg(`${m.name} 님을 대기 상태로 변경했습니다.`);
                                    setTimeout(() => setMemberMsg(''), 3000);
                                    loadMembers();
                                  } catch { setMemberMsg('변경 실패'); }
                                }}>대기로 변경</button>
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
      )}

      {/* Schedules tab */}
      {tab === 'schedules' && (
        <div style={{ maxWidth: '600px' }}>
          <div className="card mb-4">
            <div className="card-title">📅 일정 등록</div>
            <p className="text-sm text-muted mb-4">등록한 일정은 관리자 대시보드 사이드바와 달력에 표시됩니다.</p>
            {schedMsg && <div className={`alert mb-3 ${schedMsg.includes('실패') ? 'alert-error' : 'alert-success'}`}>{schedMsg}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="form-group" style={{ flex: '0 0 160px', marginBottom: 0 }}>
                  <label className="form-label">날짜</label>
                  <input type="date" className="form-input" value={schedDate} onChange={e => setSchedDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">제목</label>
                  <input type="text" className="form-input" placeholder="일정 제목" value={schedTitle} onChange={e => setSchedTitle(e.target.value)} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">메모 (선택)</label>
                <input type="text" className="form-input" placeholder="간단한 메모" value={schedNote} onChange={e => setSchedNote(e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={async () => {
                if (!schedDate || !schedTitle.trim()) { setSchedMsg('날짜와 제목을 입력해주세요.'); return; }
                try {
                  await api.post('/schedules', { date: schedDate, title: schedTitle.trim(), note: schedNote.trim() });
                  setSchedDate(''); setSchedTitle(''); setSchedNote('');
                  setSchedMsg('일정이 등록되었습니다.');
                  loadSchedules();
                  setTimeout(() => setSchedMsg(''), 3000);
                } catch (err) { setSchedMsg(`등록 실패: ${err.response?.data?.error || err.message}`); }
              }}>등록</button>
            </div>
          </div>

          <div className="card">
            <div className="card-title">등록된 일정 ({schedules.length}개)</div>
            {schedules.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>등록된 일정이 없습니다.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...schedules].sort((a, b) => a.date.localeCompare(b.date)).map(s => {
                  const isPast = new Date(s.date) < new Date(new Date().toDateString());
                  return (
                    <div key={s.id} style={{
                      padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)',
                      borderLeft: `3px solid ${isPast ? 'var(--border)' : 'var(--primary)'}`,
                      opacity: isPast ? 0.6 : 1,
                    }}>
                      {editingSchedule === s.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="date" className="form-input" style={{ flex: '0 0 150px', fontSize: '0.85rem' }}
                              value={editSchedForm.date} onChange={e => setEditSchedForm(f => ({ ...f, date: e.target.value }))} />
                            <input type="text" className="form-input" style={{ flex: 1, fontSize: '0.85rem' }}
                              value={editSchedForm.title} onChange={e => setEditSchedForm(f => ({ ...f, title: e.target.value }))} />
                          </div>
                          <input type="text" className="form-input" style={{ fontSize: '0.85rem' }}
                            placeholder="메모 (선택)" value={editSchedForm.note || ''} onChange={e => setEditSchedForm(f => ({ ...f, note: e.target.value }))} />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-primary btn-sm" onClick={async () => {
                              if (!editSchedForm.date || !editSchedForm.title?.trim()) return;
                              await api.patch(`/schedules/${s.id}`, editSchedForm);
                              setEditingSchedule(null);
                              loadSchedules();
                            }}>저장</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingSchedule(null)}>취소</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                              {new Date(s.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                              {isPast && <span style={{ marginLeft: '6px', color: 'var(--text-muted)' }}>· 지남</span>}
                            </div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{s.title}</div>
                            {s.note && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{s.note}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setEditingSchedule(s.id); setEditSchedForm({ date: s.date, title: s.title, note: s.note || '' }); }}>수정</button>
                            <button className="btn btn-danger btn-sm" onClick={async () => {
                              if (!window.confirm('이 일정을 삭제하시겠습니까?')) return;
                              await api.delete(`/schedules/${s.id}`);
                              loadSchedules();
                            }}>삭제</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
