import { useState } from 'react';

interface Props {
  audioproId: string;
  audioproName: string;
}

type ProspectStatus = 'prospect' | 'contacte';

/**
 * Bouton + modale pour POST /api/admin/promote-to-prospect.
 * Redirige vers /admin/prospects/[id] au succès.
 */
export default function PromoteProspectButton({ audioproId, audioproName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ProspectStatus>('contacte');

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/promote-to-prospect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audiopro_id: audioproId,
          initial_status: status,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erreur inconnue');
        return;
      }
      window.location.href = `/admin/prospects/${data.prospect_id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 text-sm font-sans font-medium bg-[#1B2E4A] text-white rounded hover:opacity-90 focus:outline-2 focus:outline-[#D97B3D]"
        style={{ minHeight: 44 }}
      >
        Promouvoir en prospect
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="promote-modal-title"
          onClick={() => !loading && setIsOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="promote-modal-title" className="text-xl font-bold text-[#1B2E4A] mb-4">
              Promouvoir en prospect
            </h2>

            <p className="text-sm text-[#1B2E4A] mb-3">
              Créer une fiche prospect CRM pour <strong>{audioproName}</strong>.
            </p>
            <ul className="text-sm text-[#1B2E4A] list-disc pl-5 mb-4 space-y-1">
              <li>Crée une ligne dans le kanban commercial</li>
              <li>Lie tous les centres de l'audio au prospect</li>
              <li>Active la règle de collision (les mails auto seront skippés en Phase 2)</li>
            </ul>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-[#6B7A90] mb-1" htmlFor="promote-status">
                  Statut initial
                </label>
                <select
                  id="promote-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProspectStatus)}
                  className="w-full px-3 py-2 border border-[#E4DED3] rounded text-[#1B2E4A] focus:outline-2 focus:outline-[#D97B3D]"
                  style={{ minHeight: 44 }}
                >
                  <option value="contacte">Contacté</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6B7A90] mb-1" htmlFor="promote-notes">
                  Notes (optionnel)
                </label>
                <textarea
                  id="promote-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Contexte du contact, ce qu'on attend de lui..."
                  className="w-full px-3 py-2 border border-[#E4DED3] rounded text-sm text-[#1B2E4A] focus:outline-2 focus:outline-[#D97B3D]"
                />
              </div>
            </div>

            {error && (
              <div className="bg-[#FCEBEB] border-l-4 border-[#A32D2D] p-3 text-sm text-[#A32D2D] mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="px-4 py-2 text-[#1B2E4A] border border-[#E4DED3] rounded hover:bg-[#F8F5F0] focus:outline-2 focus:outline-[#D97B3D]"
                style={{ minHeight: 44 }}
              >
                Annuler
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="px-4 py-2 bg-[#1B2E4A] text-white rounded hover:opacity-90 disabled:opacity-50 focus:outline-2 focus:outline-[#D97B3D]"
                style={{ minHeight: 44 }}
              >
                {loading ? 'Création...' : 'Créer le prospect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
