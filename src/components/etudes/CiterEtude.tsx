import { useState, useRef } from 'react';

const CITATION_CODE = `<p>Source : <a href="https://leguideauditif.fr/etudes/deserts-auditifs-france-2026/" target="_blank" rel="nofollow noopener">Etude LeGuideAuditif.fr — Deserts Auditifs France 2026</a></p>`;

export default function CiterEtude() {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CITATION_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  return (
    <div className="bg-[#F8F5F0] border-2 border-dashed border-[#1B2E4A]/20 rounded-xl px-6 py-6">
      <div className="flex items-center gap-2 mb-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B2E4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <h3 className="font-sans text-lg font-bold text-[#1B2E4A]">Citer cette etude</h3>
      </div>
      <p className="font-sans text-sm text-[#1B2E4A]/60 mb-3">
        Journaliste, blogueur, chercheur ? Copiez-collez ce code pour referencer notre travail sur votre site :
      </p>
      <textarea
        ref={textareaRef}
        readOnly
        value={CITATION_CODE}
        className="w-full h-20 px-4 py-3 rounded-lg border border-[#1B2E4A]/15 bg-white font-mono text-sm text-[#1B2E4A] resize-none focus:outline-none focus:ring-2 focus:ring-[#D97B3D]"
        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
      />
      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={handleCopy}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans text-sm font-semibold transition-colors ${
            copied
              ? 'bg-[#2E7D32] text-white'
              : 'bg-[#1B2E4A] text-white hover:bg-[#2a4570]'
          }`}
        >
          {copied ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Copie !
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              Copier le code
            </>
          )}
        </button>
        <span className="font-sans text-xs text-[#1B2E4A]/40">
          Licence ouverte — citation libre avec lien retour
        </span>
      </div>
    </div>
  );
}
