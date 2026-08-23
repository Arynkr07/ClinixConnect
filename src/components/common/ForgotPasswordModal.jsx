import { useState } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { authService } from '../../services/authService';
import { useNotification } from '../../hooks/useNotification';

export default function ForgotPasswordModal({ open, onClose, defaultEmail = '' }) {
  const { notify } = useNotification();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(defaultEmail);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notify({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setLoading(true);
    try {
      const res = await authService.requestPasswordReset(email.trim().toLowerCase());
      notify({ type: 'success', message: res.message || '6-digit verification code sent to your email via SMTP!' });
      setStep(2);
    } catch {
      notify({ type: 'error', message: 'Could not send reset email. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      notify({ type: 'error', message: 'Please enter the verification code sent to your email.' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      notify({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      notify({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      const res = await authService.resetPassword({
        email: email.trim().toLowerCase(),
        otpCode: otpCode.trim(),
        newPassword,
      });
      notify({ type: 'success', message: res.message || 'Password updated successfully! You can now log in.' });
      handleClose();
    } catch (err) {
      notify({ type: 'error', message: err.message || 'Password reset failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Reset Account Password" icon="lock_reset" size="md">
      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <p className="text-body-md text-on-surface-variant">
            Enter your account email address. We will send a 6-digit verification code via <strong>Gmail SMTP</strong> to reset your password.
          </p>

          <Input
            label="Account Email Address *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. user@gmail.com"
            icon="mail"
            required
            autoFocus
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" icon="mark_email_read" loading={loading}>
              Send Verification Code
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="bg-success-container/40 p-3.5 rounded-xl border border-success/30 text-label-md text-on-surface mb-2">
            Verification code sent to <strong>{email}</strong> via SMTP.
          </div>

          <Input
            label="6-Digit Verification Code *"
            type="text"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            placeholder="Enter 6-digit code"
            icon="pin"
            required
            autoFocus
          />

          <Input
            label="New Password *"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password (min 6 chars)"
            icon="lock"
            required
          />

          <Input
            label="Confirm New Password *"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            icon="lock_clock"
            required
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" icon="check_circle" loading={loading}>
              Update Password & Login
            </Button>
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
