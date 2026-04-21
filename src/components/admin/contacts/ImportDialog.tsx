// ImportDialog.tsx — modal d'import CSV Waalaxy.
// Drop file OR textarea paste → POST /api/admin/contacts/import → résumé.

import { useEffect, useRef, useState } from 'react';
import Button from '../ui/react/Button';

interface ImportSummary {
  total_rows: number;
  imported_contacts: number;
  updated_contacts: number;
  skipped_invalid: number;
  auto_prospects_created: number;
  prospects_already_existed: number;
  errors: Array<{ row: number; reason: string }>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function ImportDialog({ isOpen, onClose, onImported }: Props) {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setCsvText('');
      setFileName(null);
      setError(null);
      setSummary(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleFile(f: File) {
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Seuls les fichiers .csv sont acceptés.');
      return;
    }
    setError(null);
    setFileName(f.name);
    const text = await f.text();
    setCsvText(text);
  }

  async function handleSubmit() {
    if (!csvText.trim()) {
      setError('Colle le CSV ou dépose un fichier.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText, format: 'waalaxy' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      setSummary(json.summary as ImportSummary);
      onImported();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const labelCls =
    'block text-[11px] font-semibold text-[#6B7A90] uppercase tracking-[0.06em] mb-1 font-sans';

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-stretch md:items-center justify-center md:p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Importer un CSV Waalaxy"
    >
      <div
        className="bg-white md:rounded-xl w-full md:max-w-2xl p-5 md:p-6 relative shadow-2xl md:max-h-[90vh] md:overflow-y-auto font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-3 right-3 text-[#6B7A90] hover:text-[#1B2E4A] p-2 rounded-lg"
        >
          <CloseIcon />
        </button>

        <h2 className="font-serif text-2xl font-black text-[#1B2E4A] mb-1">
          Importer un CSV Waalaxy
        </h2>
        <p className="text-sm text-[#6B7A90] mb-4">
          Dépose le fichier exporté depuis Waalaxy ou colle son contenu ci-dessous.
          Les contacts <em>interested</em> et <em>replied</em> sont auto-convertis en prospects.
        </p>

        {summary ? (
          <div className="space-y-3">
            <div className="bg-[#E3F0EA] border border-[#2F7A5A]/20 rounded-lg p-4">
              <div className="font-semibold text-[#2F7A5A] mb-2">
                Import réussi — {summary.total_rows} ligne{summary.total_rows > 1 ? 's' : ''} traitée{summary.total_rows > 1 ? 's' : ''}
              </div>
              <ul className="text-sm text-[#1B2E4A] space-y-1">
                <li>{summary.imported_contacts} nouveau{summary.imported_contacts > 1 ? 'x' : ''} contact{summary.imported_contacts > 1 ? 's' : ''}</li>
                <li>{summary.updated_contacts} contact{summary.updated_contacts > 1 ? 's' : ''} mis à jour</li>
                <li>{summary.auto_prospects_created} prospect{summary.auto_prospects_created > 1 ? 's' : ''} auto-créé{summary.auto_prospects_created > 1 ? 's' : ''}</li>
                <li>{summary.prospects_already_existed} prospect{summary.prospects_already_existed > 1 ? 's' : ''} déjà existant{summary.prospects_already_existed > 1 ? 's' : ''} (liés)</li>
                {summary.skipped_invalid > 0 && (
                  <li className="text-[#B8761F]">{summary.skipped_invalid} ligne{summary.skipped_invalid > 1 ? 's' : ''} ignorée{summary.skipped_invalid > 1 ? 's' : ''} (nom/prénom manquant ou doublon)</li>
                )}
                {summary.errors.length > 0 && (
                  <li className="text-[#B34444]">{summary.errors.length} erreur{summary.errors.length > 1 ? 's' : ''}</li>
                )}
              </ul>
            </div>

            {summary.errors.length > 0 && (
              <details className="bg-[#F6E3E3] border border-[#B34444]/20 rounded-lg p-3">
                <summary className="text-sm text-[#B34444] font-semibold cursor-pointer">
                  Détail des erreurs ({summary.errors.length})
                </summary>
                <ul className="text-xs text-[#1B2E4A] mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {summary.errors.slice(0, 20).map((err, i) => (
                    <li key={i}>
                      <span className="font-mono">L.{err.row}</span> : {err.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="flex justify-end pt-3 border-t border-dashed border-[#E4DED3]">
              <Button variant="save" onClick={onClose}>
                Fermer
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {error && (
              <div className="text-[#B34444] text-sm bg-[#F6E3E3] border border-[#B34444]/20 rounded px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className={labelCls}>Fichier CSV</label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                  className="hidden"
                  aria-label="Sélectionner un fichier CSV"
                />
                <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
                  Choisir un fichier
                </Button>
                {fileName && (
                  <span className="text-sm text-[#6B7A90] truncate">{fileName}</span>
                )}
              </div>
            </div>

            <div>
              <label className={labelCls}>Ou colle le CSV ici</label>
              <textarea
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  setFileName(null);
                }}
                rows={8}
                placeholder="firstName,lastName,company_name,state,..."
                className="w-full border border-[#E4DED3] bg-white px-2.5 py-2 rounded-md text-xs font-mono text-[#1B2E4A] focus:outline-2 focus:outline-[#D97B3D] resize-y"
                aria-label="Contenu CSV"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-dashed border-[#E4DED3] mt-1">
              <Button variant="cancel" onClick={onClose} disabled={loading}>
                Annuler
              </Button>
              <Button
                variant="save"
                onClick={handleSubmit}
                disabled={loading || !csvText.trim()}
              >
                {loading ? 'Import en cours…' : 'Importer'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
