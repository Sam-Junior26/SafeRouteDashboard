import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { signIn } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(location.state?.denied ? 'This account does not have administrator access.' : '');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await signIn(email.trim(), password); navigate('/dashboard', { replace: true }); }
    catch (err) { setError(err.message || 'Unable to sign in. Check your credentials.'); }
    finally { setBusy(false); }
  }
  return (
    <div className="login-page">
      <div className="login-decoration">
        <div className="login-logo">
          <span className="brand-mark"><ShieldCheck size={25} /></span>
          <span><b>SafeRoute</b><small>ADMIN CONSOLE</small></span>
        </div>
        <div className="login-message">
          <div className="eyebrow">CAMPUS SAFETY PLATFORM</div>
          <h1>Helping make every journey safer.</h1>
          <p>Monitor incident reports, maintain campus safety information and understand safety trends in one secure workspace.</p>
          <div className="login-stat-row">
            <div>
              <b>01</b>
              <span>Review reports</span>
            </div>
            <div>
              <b>02</b>
              <span>Monitor safety</span>
            </div>
            <div>
              <b>03</b>
              <span>Improve awareness</span>
            </div>
          </div>
        </div>
        <div className="login-decoration-foot">SafeRoute · University safety administration</div>
      </div>
      <div className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <div className="login-mobile-brand">
            <span className="brand-mark"><ShieldCheck size={22} /></span>
            <b>SafeRoute</b>
          </div>
          <div className="eyebrow">ADMINISTRATOR ACCESS</div>
          <h2>Welcome back</h2>
          <p className="muted">Sign in with your authorised administrator account.</p>
          {error && <div className="error-box">{error}</div>}
          <label className="field">
            <span>Email address</span>
            <input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@university.ac.za" required />
          </label>
          <label className="field">
            <span>Password</span>
            <div className="password-input">
              <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </label>
          <button className="btn btn-primary login-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button>
          <button type="button" className="forgot-link" onClick={() => navigate('/login?reset=1')}>Forgot your password?</button>
          <div className="login-security"><ShieldCheck size={16} /> Access is restricted to authorised administrators.</div>
        </form>
        <div className="login-copyright">© {new Date().getFullYear()} SafeRoute. Keep campus communities safer.</div>
      </div>
    </div>
  );
}