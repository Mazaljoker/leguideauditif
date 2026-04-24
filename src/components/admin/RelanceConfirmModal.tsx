import { useState } from 'react';
import type { EmailTemplateKey } from '../../types/audiopro-lifecycle';
import { EMAIL_TEMPLATE_LABELS } from '../../types/audiopro-lifecycle';

interface Props {
  audioproId: string;
  audioproEmail: string;
  templateKey: EmailTemplateKey;
  onClose: () => void;
}

/**
 * Modale de confirmation avant POST /api/admin/relance-email.
 * Bypass des règles de collision CRM — trace dans prospect_interactions
 * si l'audio est lié à un prospect.
 */
export default function RelanceConfirmModal({
  audioproId,
  audioproEmail,
  templateKey,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const send = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/relance-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audiopro_id: audioproId, template_key: templateKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erreur inconnue');
      } else {
        setSuccess(true);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="relance-modal-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="relance-modal-title" className="text-xl font-bold text-[#1B2E4A] mb-4">
          Confirmer l'envoi
        </h2>

        {!success && !error && (
          <>
            <p className="text-sm text-[#1B2E4A] mb-4">
              Vous allez envoyer le template{' '}
              <strong>{EMAIL_TEMPLATE_LABELS[templateKey]}</strong> à :
            </p>
            <div className="bg-[#F8F5F0] px-3 py-2 rounded font-mono text-sm mb-4 text-[#1B2E4A] break-all">
              {audioproEmail}
            </div>
            <p className="text-xs text-[#6B7A90] mb-4 leading-relaxed">
              Cette action bypasse les règles de collision CRM. Un log sera créé dans
              l'historique email et dans la timeline du prospect (si lié).
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-[#1B2E4A] border border-[#E4DED3] rounded hover:bg-[#F8F5F0] focus:outline-2 focus:outline-[#D97B3D]"
                style={{ minHeight: 44 }}
              >
                Annuler
              </button>
              <button
                onClick={send}
                disabled={loading}
                className="px-4 py-2 bg-[#D97B3D] text-white rounded hover:opacity-90 disabled:opacity-50 focus:outline-2 focus:outline-[#D97B3D]"
                style={{ minHeight: 44 }}
              >
                {loading ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </>
        )}

        {success && (
          <div className="text-[#0F6E56] text-sm font-medium">
            Email envoyé. Actualisation...
          </div>
        )}

        {error && (
          <div className="space-y-3">
            <div className="bg-[#FCEBEB] border-l-4 border-[#A32D2D] p-3 text-sm text-[#A32D2D]">
              {error}
            </div>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-[#1B2E4A] border border-[#E4DED3] rounded focus:outline-2 focus:outline-[#D97B3D]"
                style={{ minHeight: 44 }}
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
