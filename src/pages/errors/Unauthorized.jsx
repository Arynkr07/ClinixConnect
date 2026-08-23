import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-28 h-28 mx-auto rounded-full bg-error-container text-on-error-container flex items-center justify-center mb-8">
          <span className="material-symbols-outlined text-6xl">lock</span>
        </div>
        <h1 className="font-headline text-headline-xl font-bold text-error mb-2">403</h1>
        <h2 className="font-headline text-headline-md font-bold text-on-surface mb-3">Access denied</h2>
        <p className="text-on-surface-variant mb-8">
          You do not have permission to access this portal. Please sign in with an authorised account.
        </p>
        <div className="flex gap-3 justify-center">
          <Button icon="login" size="lg" onClick={() => navigate('/doctor/login')}>
            Go to Login
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
