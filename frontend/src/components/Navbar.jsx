import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  const themeBtn = (
    <button className="btn-theme" onClick={toggle} title={dark ? '라이트 모드' : '다크 모드'}>
      {dark ? '☀️' : '🌙'}
    </button>
  );

  if (!user) return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">보증 퀴즈</Link>
      <div className="navbar-nav">
        {themeBtn}
        <Link to="/login" className={isActive('/login')}>로그인</Link>
        <Link to="/register" className={isActive('/register')}>회원가입</Link>
      </div>
    </nav>
  );

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-brand">보증 퀴즈</Link>
      <div className="navbar-nav">
        {themeBtn}
        <Link to="/dashboard" className={isActive('/dashboard')}>퀴즈 목록</Link>
        <Link to="/results" className={isActive('/results')}>내 기록</Link>
        <Link to="/leaderboard" className={isActive('/leaderboard')}>랭킹</Link>
        {user.role === 'admin' && (
          <Link to="/admin" className={isActive('/admin')}>관리자</Link>
        )}
        <span className="nav-user">{user.name}</span>
        <button className="btn-logout" onClick={handleLogout}>로그아웃</button>
      </div>
    </nav>
  );
}
