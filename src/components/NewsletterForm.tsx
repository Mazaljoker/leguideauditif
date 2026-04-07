import { useState } from 'react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setStatus('loading');
    // TODO: Connect to email service (Mailchimp, Brevo, etc.)
    setTimeout(() => setStatus('success'), 800);
  };

  if (status === 'success') {
    return (
      <div
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '8px',
          }}
        >
          Inscription confirmee !
        </p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '15px', opacity: 0.8 }}>
          Vous recevrez nos conseils audition chaque mois. Verifiez votre boite mail.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', maxWidth: '500px' }}>
      <label htmlFor="newsletter-email" style={{ position: 'absolute', left: '-9999px' }}>
        Votre adresse email
      </label>
      <input
        id="newsletter-email"
        type="email"
        placeholder="votre@email.fr"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{
          flex: '1 1 260px',
          minWidth: '260px',
          padding: '14px 18px',
          borderRadius: '8px',
          border: '2px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.1)',
          color: 'white',
          fontFamily: "'Inter', sans-serif",
          fontSize: '16px',
          outline: 'none',
        }}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        style={{
          padding: '14px 28px',
          borderRadius: '8px',
          border: 'none',
          background: '#D97B3D',
          color: 'white',
          fontFamily: "'Inter', sans-serif",
          fontSize: '16px',
          fontWeight: 600,
          cursor: status === 'loading' ? 'wait' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {status === 'loading' ? 'Envoi...' : "S'inscrire gratuitement"}
      </button>
    </form>
  );
}
