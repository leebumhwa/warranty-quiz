import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const POLICY_ROWS = [
  { label: '수집 항목', value: '이름, 이메일 주소, 퀴즈 응시 기록' },
  { label: '수집·이용 목적', value: '서비스 제공, 학습 현황 관리, 랭킹 산출' },
  { label: '보유·이용 기간', value: '회원 탈퇴 시까지 (탈퇴 후 즉시 파기)' },
  { label: '동의 거부 시 불이익', value: '서비스 이용 불가' },
];

function PrivacyPolicyBox({ open, onToggle }) {
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      overflow: 'hidden', marginBottom: '8px',
    }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '10px 14px', background: 'var(--bg)',
          border: 'none', cursor: 'pointer', fontSize: '0.85rem',
          color: 'var(--text-muted)', fontWeight: 500,
        }}
      >
        <span>개인정보 수집·이용 내역 보기</span>
        <span style={{ fontSize: '0.8rem' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '12px 14px', background: 'var(--card)', fontSize: '0.82rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
            <tbody>
              {POLICY_ROWS.map(({ label, value }) => (
                <tr key={label}>
                  <td style={{
                    padding: '7px 10px', fontWeight: 600, color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                    width: '38%', background: 'var(--bg)',
                  }}>{label}</td>
                  <td style={{
                    padding: '7px 10px', color: 'var(--text)',
                    borderBottom: '1px solid var(--border)',
                  }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            귀하는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다.
            단, 동의 거부 시 서비스 이용이 제한됩니다. 수집된 개인정보는
            서비스 운영 목적 외에는 사용되지 않으며, 개인정보보호법에 따라
            안전하게 관리됩니다.
          </p>
        </div>
      )}
    </div>
  );
}

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (!privacyAgreed) {
      setError('개인정보 수집·이용에 동의해주세요.');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name, privacyAgreed);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <h1 className="auth-title">회원가입</h1>
        <p className="auth-subtitle">새 계정을 만들어 퀴즈를 시작하세요</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">이름</label>
            <input
              type="text" className="form-input" placeholder="이름 입력"
              value={name} onChange={e => setName(e.target.value)} required
            />
          </div>
          <div className="form-group">
            <label className="form-label">이메일</label>
            <input
              type="email" className="form-input" placeholder="example@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
          </div>
          <div className="form-group">
            <label className="form-label">비밀번호</label>
            <input
              type="password" className="form-input" placeholder="6자 이상"
              value={password} onChange={e => setPassword(e.target.value)} required
            />
            <p className="form-hint">비밀번호는 6자 이상이어야 합니다.</p>
          </div>

          {/* 개인정보 동의 */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <div style={{
              padding: '14px', borderRadius: 'var(--radius)',
              border: `1.5px solid ${privacyAgreed ? 'var(--primary)' : 'var(--border)'}`,
              background: privacyAgreed ? 'var(--primary-light)' : 'var(--bg)',
              transition: 'all 0.15s',
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={privacyAgreed}
                  onChange={e => setPrivacyAgreed(e.target.checked)}
                  style={{ marginTop: '2px', accentColor: 'var(--primary)', width: '16px', height: '16px', flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', lineHeight: 1.5 }}>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, marginRight: '6px',
                    padding: '1px 7px', borderRadius: '999px',
                    background: 'var(--error)', color: '#fff',
                  }}>필수</span>
                  개인정보 수집·이용에 동의합니다
                </span>
              </label>

              <div style={{ marginTop: '10px', marginLeft: '26px' }}>
                <PrivacyPolicyBox open={policyOpen} onToggle={() => setPolicyOpen(v => !v)} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading || !privacyAgreed}
          >
            {loading ? <><span className="spinner" /> 가입 중...</> : '회원가입'}
          </button>
        </form>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px', lineHeight: 1.6 }}>
          가입 시 수집된 개인정보는 개인정보보호법에 따라 보호됩니다.
        </p>

        <p className="auth-footer">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
}
