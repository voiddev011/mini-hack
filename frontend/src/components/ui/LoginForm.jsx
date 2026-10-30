import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isSupabaseConfigured, supabaseConfigurationError } from '../../config/supabase';

export default function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp, error: sessionError } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      if (isSignUp) {
        const result = await signUp({ email, password, fullName: fullName.trim() });
        if (!result.user) {
          throw new Error('Supabase did not return a new user. Please try again.');
        } else if (result.user.identities?.length === 0) {
          setError('An account with this email may already exist. Try logging in instead.');
        } else if (!result.session) {
          setMessage('Account created. Check your email to confirm your address, then log in.');
        }
      } else {
        await signIn({ email, password });
      }
    } catch (authError) {
      setError(authError.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <h2>{isSignUp ? 'Create your account' : 'Welcome Back'}</h2>
        <p>{isSignUp ? 'Create a TrustCarbon account to track your footprint' : 'Access your TrustCarbon analytics dashboard'}</p>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        {!isSupabaseConfigured && (
          <p role="alert">{supabaseConfigurationError}</p>
        )}
        {isSignUp && (
          <div className="form-field">
            <label htmlFor="full-name-input">Full Name</label>
            <input
              id="full-name-input"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="text-input"
              required
            />
          </div>
        )}
        <div className="form-field">
          <label htmlFor="email-input">Email Address</label>
          <input
            id="email-input"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-input"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="password-input">Password</label>
          <input
            id="password-input"
            type="password"
            placeholder="••••••••"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-input"
            minLength={6}
            required
          />
        </div>

        {(error || sessionError) && <p role="alert">{error || sessionError}</p>}
        {message && <p role="status">{message}</p>}
        <div className="login-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting || !isSupabaseConfigured}>
            {submitting ? 'Please wait…' : isSignUp ? 'Create Account' : 'Log In'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setMessage('');
            }}
            className="demo-link-btn"
          >
            {isSignUp ? 'Already have an account? Log in' : 'New to TrustCarbon? Create an account'}
          </button>
        </div>
      </form>
    </div>
  );
}
