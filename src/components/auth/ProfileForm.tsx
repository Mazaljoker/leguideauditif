import { useState, useEffect, type FC, type FormEvent } from 'react';
import { getUser, getProfile, upsertProfile } from '../../lib/auth';
import type { ProfilType } from '../../types/annonce';
import { DEPARTEMENTS } from '../../types/annonce';

const PROFIL_TYPES: { value: ProfilType; label: string }[] = [
  { value: 'audioprothesiste_de', label: 'Audioprothesiste DE' },
  { value: 'etudiant_audio', label: 'Etudiant en audioprothese' },
  { value: 'assistant_audio', label: 'Assistant audio' },
  { value: 'enseigne', label: 'Enseigne / reseau' },
  { value: 'investisseur', label: 'Investisseur' },
  { value: 'autre', label: 'Autre' },
];

interface ProfileFormProps {
  redirectTo?: string;
}

const ProfileForm: FC<ProfileFormProps> = ({ redirectTo }) => {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [profilType, setProfilType] = useState<ProfilType | ''>('');
  const [numeroRpps, setNumeroRpps] = useState('');
  const [centreNom, setCentreNom] = useState('');
  const [centreVille, setCentreVille] = useState('');
  const [centreDepartement, setCentreDepartement] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const { user } = await getUser();
      if (!user) {
        window.location.href = '/auth/login/';
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email ?? '');

      const profile = await getProfile(user.id);
      if (profile) {
        setNom(profile.nom);
        setPrenom(profile.prenom ?? '');
        setTelephone(profile.telephone ?? '');
        setProfilType(profile.profil_type ?? '');
        setNumeroRpps(profile.numero_rpps ?? '');
        setCentreNom(profile.centre_nom ?? '');
        setCentreVille(profile.centre_ville ?? '');
        setCentreDepartement(profile.centre_departement ?? '');
      }
      setInitialLoading(false);
    };
    loadProfile();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: dbError } = await upsertProfile({
      id: userId,
      nom,
      prenom: prenom || null,
      email: userEmail,
      telephone: telephone || null,
      profil_type: profilType || null,
      numero_rpps: numeroRpps || null,
      centre_nom: centreNom || null,
      centre_ville: centreVille || null,
      centre_departement: centreDepartement || null,
    });

    setLoading(false);

    if (dbError) {
      setError('Erreur lors de la sauvegarde. Veuillez reessayer.');
      return;
    }

    setSuccess(true);
    if (redirectTo) {
      setTimeout(() => { window.location.href = redirectTo; }, 1000);
    }
  };

  if (initialLoading) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <p className="text-[var(--color-gris)] font-sans">Chargement du profil...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="profile-nom" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
              Nom *
            </label>
            <input
              id="profile-nom"
              type="text"
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
            />
          </div>
          <div>
            <label htmlFor="profile-prenom" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
              Prenom
            </label>
            <input
              id="profile-prenom"
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
            />
          </div>
        </div>

        <div>
          <label htmlFor="profile-email" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            value={userEmail}
            disabled
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base bg-[var(--color-creme)] text-[var(--color-gris)]"
          />
        </div>

        <div>
          <label htmlFor="profile-tel" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
            Telephone
          </label>
          <input
            id="profile-tel"
            type="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>

        <div>
          <label htmlFor="profile-type" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
            Profil professionnel
          </label>
          <select
            id="profile-type"
            value={profilType}
            onChange={(e) => setProfilType(e.target.value as ProfilType)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          >
            <option value="">Selectionnez</option>
            {PROFIL_TYPES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {profilType === 'audioprothesiste_de' && (
          <div>
            <label htmlFor="profile-rpps" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
              Numero RPPS
            </label>
            <input
              id="profile-rpps"
              type="text"
              value={numeroRpps}
              onChange={(e) => setNumeroRpps(e.target.value)}
              placeholder="8xxxxxxxx"
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="profile-centre" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
              Centre
            </label>
            <input
              id="profile-centre"
              type="text"
              value={centreNom}
              onChange={(e) => setCentreNom(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
            />
          </div>
          <div>
            <label htmlFor="profile-centre-ville" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
              Ville
            </label>
            <input
              id="profile-centre-ville"
              type="text"
              value={centreVille}
              onChange={(e) => setCentreVille(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
            />
          </div>
          <div>
            <label htmlFor="profile-centre-dept" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
              Departement
            </label>
            <select
              id="profile-centre-dept"
              value={centreDepartement}
              onChange={(e) => setCentreDepartement(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
            >
              <option value="">--</option>
              {DEPARTEMENTS.map((d) => (
                <option key={d.code} value={d.code}>{d.code} - {d.nom}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 font-sans">{error}</p>
        )}

        {success && (
          <p className="text-sm text-[var(--color-success)] font-sans font-medium">Profil enregistre.</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[var(--radius-md)] bg-[var(--color-orange)] px-6 py-3 text-lg font-semibold text-white font-sans transition-colors hover:bg-[var(--color-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/50 cursor-pointer disabled:opacity-60"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer mon profil'}
        </button>
      </form>
    </div>
  );
};

export default ProfileForm;
