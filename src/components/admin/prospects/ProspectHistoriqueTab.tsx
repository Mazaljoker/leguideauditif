// ProspectHistoriqueTab.tsx — onglet Historique du ProspectEditModal.
// Jalon 5.0.b : stub placeholder. Câblé en 5.0.c avec search full-text.

interface Props {
  prospectId: string;
  onCountChange?: (n: number) => void;
}

export default function ProspectHistoriqueTab({ prospectId: _prospectId, onCountChange: _onCountChange }: Props) {
  return (
    <div className="py-8 text-center text-[#6B7A90] italic font-sans text-sm">
      Onglet Historique — câblé en jalon 5.0.c
    </div>
  );
}
