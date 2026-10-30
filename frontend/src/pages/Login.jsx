import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import LoginForm from '../components/ui/LoginForm';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && profile) {
      navigate(profile.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    }
  }, [loading, user, profile, navigate]);

  return (
    <div className="page-container">
      <LoginForm />
    </div>
  );
}
