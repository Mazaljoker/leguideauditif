import { useState, type FC, type FormEvent } from 'react';
import { signUp } from '../../lib/auth';

const RegisterForm: FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres.');
      return;
    }

    setLoading(true);
    const { error: authError } = await signUp(email, password);
    setLoading(false);

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError('Un compte existe deja avec cet email.');
      } else {
        setError('Erreur lors de l\'inscription. Veuillez reessayer.');
      }
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto rounded-lg border-2 border-[var(--color-success)] bg-[var(--color-success)]/5 p-8 text-center">
        <svg className="w-8 h-8 text-[var(--color-success)] mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
        <p className="text-xl font-semibold text-[var(--color-success)]">Compte cree</p>
        <p className="mt-2 text-[var(--color-gris)]">
          Un email de confirmation a ete envoye a <strong>{email}</strong>.
          Cliquez sur le lien pour activer votre compte.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div>
          <label htmlFor="register-email" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
            Email professionnel
          </label>
          <input
            id="register-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>

        <div>
          <label htmlFor="register-password" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
            Mot de passe
          </label>
          <input
            id="register-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
          <p className="mt-1 text-xs text-[var(--color-gris)] font-sans">Minimum 8 caracteres</p>
        </div>

        <div>
          <label htmlFor="register-confirm" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
            Confirmer le mot de passe
          </label>
          <input
            id="register-confirm"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 font-sans">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[var(--radius-md)] bg-[var(--color-orange)] px-6 py-3 text-lg font-semibold text-white font-sans transition-colors hover:bg-[var(--color-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/50 cursor-pointer disabled:opacity-60"
        >
          {loading ? 'Inscription...' : 'Creer mon compte'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-gris)] font-sans">
        Deja un compte ?{' '}
        <a href="/auth/login/" className="text-[var(--color-orange)] font-medium hover:underline">
          Se connecter
        </a>
      </p>
    </div>
  );
};

export default RegisterForm;
