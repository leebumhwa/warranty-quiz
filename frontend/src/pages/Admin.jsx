import { useState, useEffect, useRef } from 'react';
import api from '../api';

function formatDate(d) {
  return new Date(d).toLocaleString('ko-KR', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)}KB`;
  return `${(bytes/1024/1024).toFixed(1)}MB`;
}

export default function Admin() {
  const [tab, setTab] = useState('files');
  const [files, setFiles] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState({});

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

  useEffect(() => { loadFiles(); loadQuizzes(); loadResults(); }, []);

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
      });
      const count = res.data.questions.length;
      setGenMsg(`"${quizTitle}" 퀴즈가 생성되었습니다. (${count}개 문제)`);
      setQuizTitle(''); setQuizDesc(''); setSelectedFiles([]); setQuestionCount(10);
      loadQuizzes();
    } catch (err) {
      setGenError(err.response?.data?.error || '퀴즈 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
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

  return (
    <div className="page">
      <h1 className="page-title">관리자 패널</h1>
      <div className="tabs">
        {[['files','파일 관리'],['generate','퀴즈 생성'],['quizzes','퀴즈 관리'],['results','사용자 결과']].map(([key,label]) => (
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
                  <div key={f.id} className="file-item">
                    <div>
                      <div className="file-name">{f.original_name}</div>
                      <div className="file-meta">{formatSize(f.file_size)} · {f.uploader_name} · {formatDate(f.created_at)}</div>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteFile(f.id, f.original_name)}>삭제</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generate tab */}
      {tab === 'generate' && (
        <div className="card" style={{maxWidth:'600px'}}>
          <div className="card-title">AI 퀴즈 생성</div>
          <p className="text-sm text-muted mb-4">선택한 파일의 내용을 바탕으로 Claude AI가 퀴즈를 자동 생성합니다.</p>
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
              <label className="form-label">문제 수 (1~50) *</label>
              <input type="number" className="form-input" min={1} max={50}
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
                        </div>
                        <button className="btn btn-danger btn-sm" style={{marginLeft:'8px'}}
                          onClick={() => handleDeleteQuestion(q.id, quiz.id)}>삭제</button>
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
          <div style={{padding:'16px 24px', borderBottom:'1px solid var(--border)'}}>
            <div className="card-title" style={{margin:0}}>전체 사용자 결과 ({allResults.length}건)</div>
          </div>
          {allResults.length === 0 ? (
            <div className="empty-state">아직 제출된 결과가 없습니다.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>사용자</th>
                    <th>이메일</th>
                    <th>퀴즈</th>
                    <th>점수</th>
                    <th>정답률</th>
                    <th>완료 일시</th>
                  </tr>
                </thead>
                <tbody>
                  {allResults.map(r => {
                    const pct = Math.round((r.score / r.total) * 100);
                    const passed = pct >= 60;
                    return (
                      <tr key={r.id}>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
