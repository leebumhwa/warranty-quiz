import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TakeQuiz from './pages/TakeQuiz';
import MyResults from './pages/MyResults';
import Admin from './pages/Admin';
import Leaderboard from './pages/Leaderboard';
import Community from './pages/Community';
import PostDetail from './pages/PostDetail';
import Ranking from './pages/Ranking';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">로딩 중...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">로딩 중...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/quiz/:id" element={<PrivateRoute><TakeQuiz /></PrivateRoute>} />
          <Route path="/results" element={<PrivateRoute><MyResults /></PrivateRoute>} />
          <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
          <Route path="/community" element={<PrivateRoute><Community /></PrivateRoute>} />
          <Route path="/community/posts/:id" element={<PrivateRoute><PostDetail /></PrivateRoute>} />
          <Route path="/ranking" element={<PrivateRoute><Ranking /></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
