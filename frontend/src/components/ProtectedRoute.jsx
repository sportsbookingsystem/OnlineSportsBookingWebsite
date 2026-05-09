import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: 360, margin: '2rem auto', textAlign: 'center' }}>
        <p className="muted" style={{ margin: 0 }}>
          Loading your session…
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles?.length && !roles.includes(user.role?.name)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
