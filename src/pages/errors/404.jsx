import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-28 h-28 mx-auto rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-8">
          <span className="material-symbols-outlined text-6xl">explore_off</span>
        </div>
        <h1 className="font-headline text-headline-xl font-bold text-primary mb-2">404</h1>
        <h2 className="font-headline text-headline-md font-bold text-on-surface mb-3">Page not found</h2>
        <p className="text-on-surface-variant mb-8">
          The page you are looking for doesn't exist or may have been moved.
        </p>
        <Link to="/">
          <Button icon="home" size="lg">Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}
