import { useState, useEffect, type FC, type ReactNode } from 'react';
import { getSession } from '../../lib/auth';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

const AuthGuard: FC<AuthGuardProps> = ({ children, fallback }) => {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { session } = await getSession();
      if (session) {
        setAuthenticated(true);
      } else {
        const currentPath = window.location.pathname;
        window.location.href = `/auth/login/?redirect=${encodeURIComponent(currentPath)}`;
      }
      setChecking(false);
    };
    check();
  }, []);

  if (checking) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--color-gris)] font-sans">Verification de la connexion...</p>
      </div>
    );
  }

  if (!authenticated) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

export default AuthGuard;
