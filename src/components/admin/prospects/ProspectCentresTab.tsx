// ProspectCentresTab.tsx — onglet Centres du ProspectEditModal.
// Jalon 5.0.b : stub placeholder. Câblé en 5.0.c.

interface Props {
  prospectId: string;
  onCountChange?: (n: number) => void;
}

export default function ProspectCentresTab({ prospectId: _prospectId, onCountChange: _onCountChange }: Props) {
  return (
    <div className="py-8 text-center text-[#6B7A90] italic font-sans text-sm">
      Onglet Centres — câblé en jalon 5.0.c
    </div>
  );
}
