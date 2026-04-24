import { useState, type FC, type FormEvent } from 'react';
import { signIn, signInWithMagicLink } from '../../lib/auth';

interface LoginFormProps {
  redirectTo?: string;
}

const LoginForm: FC<LoginFormProps> = ({ redirectTo = '/annonces/deposer/' }) => {
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Clear cookies stale httpOnly d'une session precedente. Depuis PR #77,
    // le middleware pose les refresh tokens rotes en httpOnly, ce que
    // document.cookie ne peut PAS overwrite. Sans ce clear serveur, un
    // cookie obsolete bloquerait la nouvelle session.
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }

    const { data, error: authError } = await signIn(email, password);
    setLoading(false);

    if (authError || !data.session) {
      setError('Email ou mot de passe incorrect.');
      return;
    }

    // Ecrire les cookies pour le middleware SSR
    const maxAge = 60 * 60 * 24 * 7; // 7 jours
    document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
    document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;

    window.location.href = redirectTo;
  };

  const handleMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await signInWithMagicLink(email);
    setLoading(false);

    if (authError) {
      setError('Erreur lors de l\'envoi du lien. Verifiez votre email.');
      return;
    }

    setMagicSent(true);
  };

  if (magicSent) {
    return (
      <div className="rounded-lg border-2 border-[var(--color-success)] bg-[var(--color-success)]/5 p-8 text-center">
        <svg className="w-8 h-8 text-[var(--color-success)] mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
        <p className="text-xl font-semibold text-[var(--color-success)]">Lien envoye</p>
        <p className="mt-2 text-[var(--color-gris)]">
          Consultez votre boite mail <strong>{email}</strong> et cliquez sur le lien de connexion.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Toggle mode */}
      <div className="flex rounded-lg border border-[var(--color-creme-dark)] overflow-hidden mb-6">
        <button
          type="button"
          onClick={() => setMode('password')}
          className={`flex-1 py-3 text-sm font-semibold font-sans transition-colors cursor-pointer ${
            mode === 'password'
              ? 'bg-[var(--color-marine)] text-white'
              : 'bg-[var(--color-creme)] text-[var(--color-marine)]'
          }`}
        >
          Email + mot de passe
        </button>
        <button
          type="button"
          onClick={() => setMode('magic')}
          className={`flex-1 py-3 text-sm font-semibold font-sans transition-colors cursor-pointer ${
            mode === 'magic'
              ? 'bg-[var(--color-marine)] text-white'
              : 'bg-[var(--color-creme)] text-[var(--color-marine)]'
          }`}
        >
          Lien magique
        </button>
      </div>

      <form onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink} className="grid gap-4">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>

        {mode === 'password' && (
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
              Mot de passe
            </label>
            <input
              id="login-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 font-sans">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[var(--radius-md)] bg-[var(--color-orange)] px-6 py-3 text-lg font-semibold text-white font-sans transition-colors hover:bg-[var(--color-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/50 cursor-pointer disabled:opacity-60"
        >
          {loading
            ? 'Connexion...'
            : mode === 'password'
              ? 'Se connecter'
              : 'Envoyer le lien'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-gris)] font-sans">
        Pas encore de compte ?{' '}
        <a href="/auth/register/" className="text-[var(--color-orange)] font-medium hover:underline">
          Creer un compte
        </a>
      </p>
    </div>
  );
};

export default LoginForm;
