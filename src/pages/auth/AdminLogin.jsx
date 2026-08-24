import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';
import ForgotPasswordModal from '../../components/common/ForgotPasswordModal';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validate = () => {
    const nextErrors = {};
    if (!email) nextErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Enter a valid email';
    if (!password) nextErrors.password = 'Password is required';
    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      await login(ROLES.ADMIN, email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setErrors({ email: err.message || 'Login failed. Please check credentials.' });
    } finally {
      setLoading(false);
    }
  };

  const illustration = (
    <div className="text-on-primary space-y-10 text-center relative z-10">
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-10 shadow-2xl max-w-lg">
        <h2 className="font-headline text-headline-2xl font-bold mb-4">
          Command centre for community health.
        </h2>
        <p className="text-body-lg opacity-80">
          Monitor doctor profiles, slot durations, and working hours seamlessly.
        </p>
        <div className="grid grid-cols-3 gap-6 mt-8">
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-primary-fixed">medical_services</span>
            <p className="text-label-sm opacity-80">Doctor Profiles</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-primary-fixed">schedule</span>
            <p className="text-label-sm opacity-80">Slot Duration</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-primary-fixed">event_busy</span>
            <p className="text-label-sm opacity-80">Leave Management</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AuthLayout illustration={illustration}>
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-md font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Home
        </Link>
        <span className="text-label-sm text-on-surface-variant">Admin Portal</span>
      </div>

      <div className="p-1 bg-surface-container-low rounded-xl mb-8 flex items-center justify-between text-xs font-bold border border-outline-variant/30">
        <Link
          to="/login/patient"
          className="flex-1 py-2 rounded-lg text-center text-on-surface-variant hover:text-primary transition-all"
        >
          Patient Login
        </Link>
        <Link
          to="/doctor/login"
          className="flex-1 py-2 rounded-lg text-center text-on-surface-variant hover:text-primary transition-all"
        >
          Doctor Login
        </Link>
        <Link
          to="/admin/login"
          className="flex-1 py-2 rounded-lg text-center bg-primary text-on-primary shadow-sm transition-all"
        >
          Admin Login
        </Link>
      </div>

      <div className="flex flex-col items-center gap-4 text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary shadow-elevation2 flex items-center justify-center text-on-primary">
          <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
        </div>
        <div>
          <h1 className="font-headline text-headline-xl font-bold text-on-surface">
            Admin Login
          </h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            Secure access for platform administrators
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@clinixconnect.org"
          icon="mail"
          error={errors.email}
        />
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          icon="lock"
          error={errors.password}
          rightAdornment={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="text-on-surface-variant hover:text-primary"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <span className="material-symbols-outlined">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          }
        />

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-on-surface-variant cursor-pointer">
            <input type="checkbox" className="rounded border-outline-variant text-primary focus:ring-primary" defaultChecked />
            Keep me signed in
          </label>
          <button
            type="button"
            onClick={() => setShowForgot(true)}
            className="text-primary font-semibold hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" fullWidth loading={loading} size="lg" icon="admin_panel_settings">
          Sign In to Admin Portal
        </Button>
      </form>

      <ForgotPasswordModal open={showForgot} onClose={() => setShowForgot(false)} defaultEmail={email} />

      <div className="border-t border-outline-variant/30 pt-6 mt-8 text-center space-y-2 text-xs">
        <p className="text-on-surface-variant">
          Need an admin account?{' '}
          <Link to="/register?role=admin" className="font-bold text-primary hover:underline">
            Register as Admin
          </Link>
        </p>
        <p className="text-on-surface-variant">
          Demo login: <span className="font-bold text-primary">admin@clinixconnect.org</span> / <span className="font-bold text-primary">admin12345</span>
        </p>
      </div>
    </AuthLayout>
  );
}
