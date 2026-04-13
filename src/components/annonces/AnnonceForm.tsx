import { useState, useEffect, type FC, type FormEvent, type ChangeEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { getUser, getProfile, generateSlug } from '../../lib/auth';
import type { AnnonceCategorie, AnnoncePrixType } from '../../types/annonce';
import { SOUS_CATEGORIES, DEPARTEMENTS } from '../../types/annonce';

interface AnnonceFormProps {
  categorie?: string;
}

const MAX_DESC_GRATUIT = 500;
const MAX_DESC_PREMIUM = 5000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function resizeAndConvertToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = 1200;
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Conversion failed')),
        'image/webp',
        0.85
      );
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
}

const AnnonceForm: FC<AnnonceFormProps> = ({ categorie: initialCategorie }) => {
  const [categorie, setCategorie] = useState<AnnonceCategorie | ''>((initialCategorie as AnnonceCategorie) || '');
  const [sousCategorie, setSousCategorie] = useState('');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [departement, setDepartement] = useState('');
  const [ville, setVille] = useState('');
  const [codePostal, setCodePostal] = useState('');
  const [prixMin, setPrixMin] = useState('');
  const [prixMax, setPrixMax] = useState('');
  const [prixType, setPrixType] = useState<AnnoncePrixType | ''>('');
  const [contactNom, setContactNom] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTel, setContactTel] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');

  const sousCategories = categorie ? SOUS_CATEGORIES[categorie] : [];
  const maxDesc = MAX_DESC_GRATUIT; // Premium augmentera en Phase 3

  useEffect(() => {
    const loadUser = async () => {
      const { user } = await getUser();
      if (!user) {
        window.location.href = '/auth/login/?redirect=/annonces/deposer/';
        return;
      }
      setUserId(user.id);
      setContactEmail(user.email ?? '');

      const profile = await getProfile(user.id);
      if (profile) {
        setContactNom(`${profile.prenom ?? ''} ${profile.nom}`.trim());
        setContactTel(profile.telephone ?? '');
      }
    };
    loadUser();
  }, []);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Format accepte : JPG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('La photo ne doit pas depasser 5 Mo.');
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleSubmit = async (e: FormEvent, statut: 'active' | 'brouillon') => {
    e.preventDefault();
    setError('');

    // Validations
    if (!categorie) { setError('Selectionnez une categorie.'); return; }
    if (titre.length < 10) { setError('Le titre doit contenir au moins 10 caracteres.'); return; }
    if (description.length < 50) { setError('La description doit contenir au moins 50 caracteres.'); return; }
    if (!departement) { setError('Selectionnez un departement.'); return; }
    if (!contactEmail) { setError('L\'email est requis.'); return; }

    setLoading(true);

    // Upload photo si fournie
    let photos: string[] = [];
    if (photo) {
      const webpBlob = await resizeAndConvertToWebP(photo);
      const slug = generateSlug(titre);
      const filePath = `${userId}/${slug}/photo-1.webp`;

      const { error: uploadError } = await supabase.storage
        .from('annonces-photos')
        .upload(filePath, webpBlob, { contentType: 'image/webp' });

      if (uploadError) {
        setLoading(false);
        setError('Erreur lors de l\'upload de la photo.');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('annonces-photos')
        .getPublicUrl(filePath);

      photos = [urlData.publicUrl];
    }

    const slug = generateSlug(titre);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error: dbError } = await supabase.from('annonces').insert({
      user_id: userId,
      titre,
      description,
      slug,
      categorie,
      sous_categorie: sousCategorie || null,
      departement,
      ville: ville || null,
      code_postal: codePostal || null,
      prix_min: prixMin ? parseInt(prixMin) * 100 : null,
      prix_max: prixMax ? parseInt(prixMax) * 100 : null,
      prix_type: prixType || null,
      photos,
      contact_nom: contactNom,
      contact_email: contactEmail,
      contact_tel: contactTel || null,
      statut,
      expires_at: expiresAt.toISOString(),
    });

    setLoading(false);

    if (dbError) {
      setError('Erreur lors de la creation de l\'annonce. Veuillez reessayer.');
      return;
    }

    window.location.href = `/annonces/${slug}/?published=${statut === 'active' ? '1' : '0'}`;
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, 'active')} className="grid gap-6 max-w-2xl mx-auto">
      {/* Categorie */}
      <div>
        <label htmlFor="annonce-categorie" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
          Categorie *
        </label>
        <select
          id="annonce-categorie"
          value={categorie}
          onChange={(e) => { setCategorie(e.target.value as AnnonceCategorie); setSousCategorie(''); }}
          required
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
        >
          <option value="">Selectionnez une categorie</option>
          <option value="cession">Cession & Installation</option>
          <option value="emploi">Emploi & Recrutement</option>
          <option value="remplacement">Remplacement</option>
          <option value="materiel">Materiel professionnel</option>
          <option value="services">Services professionnels</option>
        </select>
      </div>

      {/* Sous-categorie */}
      {sousCategories.length > 0 && (
        <div>
          <label htmlFor="annonce-sous-cat" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
            Type
          </label>
          <select
            id="annonce-sous-cat"
            value={sousCategorie}
            onChange={(e) => setSousCategorie(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          >
            <option value="">Selectionnez</option>
            {sousCategories.map((sc) => (
              <option key={sc.value} value={sc.value}>{sc.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Titre */}
      <div>
        <label htmlFor="annonce-titre" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
          Titre * <span className="text-[var(--color-gris)] font-normal">({titre.length}/120)</span>
        </label>
        <input
          id="annonce-titre"
          type="text"
          required
          maxLength={120}
          minLength={10}
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Ex : Cession centre audioprothese La Rochelle — 15 ans clientele"
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="annonce-desc" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
          Description * <span className="text-[var(--color-gris)] font-normal">({description.length}/{maxDesc})</span>
        </label>
        <textarea
          id="annonce-desc"
          required
          minLength={50}
          maxLength={maxDesc}
          rows={8}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20 resize-y"
        />
        {description.length >= maxDesc && (
          <p className="mt-1 text-xs text-[var(--color-orange)] font-sans">
            Limite atteinte. Passez en Premium pour 5 000 caracteres.
          </p>
        )}
      </div>

      {/* Localisation */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <legend className="text-sm font-medium text-[var(--color-marine)] mb-2 font-sans">Localisation *</legend>
        <div>
          <label htmlFor="annonce-dept" className="sr-only">Departement</label>
          <select
            id="annonce-dept"
            required
            value={departement}
            onChange={(e) => setDepartement(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          >
            <option value="">Departement</option>
            {DEPARTEMENTS.map((d) => (
              <option key={d.code} value={d.code}>{d.code} - {d.nom}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="annonce-ville" className="sr-only">Ville</label>
          <input
            id="annonce-ville"
            type="text"
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            placeholder="Ville"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>
        <div>
          <label htmlFor="annonce-cp" className="sr-only">Code postal</label>
          <input
            id="annonce-cp"
            type="text"
            pattern="^\d{5}$"
            value={codePostal}
            onChange={(e) => setCodePostal(e.target.value)}
            placeholder="Code postal"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>
      </fieldset>

      {/* Prix */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <legend className="text-sm font-medium text-[var(--color-marine)] mb-2 font-sans">Prix</legend>
        <div>
          <label htmlFor="annonce-prix-type" className="sr-only">Type de prix</label>
          <select
            id="annonce-prix-type"
            value={prixType}
            onChange={(e) => setPrixType(e.target.value as AnnoncePrixType)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          >
            <option value="">Type de prix</option>
            <option value="fixe">Prix fixe</option>
            <option value="negociable">Negociable</option>
            <option value="sur_demande">Sur demande</option>
            <option value="gratuit">Gratuit</option>
            {(categorie === 'emploi' || categorie === 'remplacement') && (
              <>
                <option value="salaire_annuel">Salaire annuel</option>
                <option value="salaire_mensuel">Salaire mensuel</option>
                <option value="tjm">TJM</option>
              </>
            )}
          </select>
        </div>
        <div>
          <label htmlFor="annonce-prix-min" className="sr-only">Prix minimum</label>
          <input
            id="annonce-prix-min"
            type="number"
            min="0"
            value={prixMin}
            onChange={(e) => setPrixMin(e.target.value)}
            placeholder="Min (EUR)"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>
        <div>
          <label htmlFor="annonce-prix-max" className="sr-only">Prix maximum</label>
          <input
            id="annonce-prix-max"
            type="number"
            min="0"
            value={prixMax}
            onChange={(e) => setPrixMax(e.target.value)}
            placeholder="Max (EUR)"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>
      </fieldset>

      {/* Photo */}
      <div>
        <label htmlFor="annonce-photo" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
          Photo <span className="text-[var(--color-gris)] font-normal">(1 max, JPG/PNG/WebP, 5 Mo max)</span>
        </label>
        <input
          id="annonce-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoChange}
          className="w-full text-sm text-[var(--color-gris)] font-sans file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-orange)]/10 file:text-[var(--color-orange)] hover:file:bg-[var(--color-orange)]/20 file:cursor-pointer"
        />
        {photoPreview && (
          <img src={photoPreview} alt="Apercu" className="mt-3 w-40 h-28 object-cover rounded-lg" />
        )}
      </div>

      {/* Contact */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <legend className="text-sm font-medium text-[var(--color-marine)] mb-2 font-sans">Vos coordonnees</legend>
        <div>
          <label htmlFor="annonce-contact-nom" className="sr-only">Nom</label>
          <input
            id="annonce-contact-nom"
            type="text"
            required
            value={contactNom}
            onChange={(e) => setContactNom(e.target.value)}
            placeholder="Nom"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>
        <div>
          <label htmlFor="annonce-contact-email" className="sr-only">Email</label>
          <input
            id="annonce-contact-email"
            type="email"
            required
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>
        <div>
          <label htmlFor="annonce-contact-tel" className="sr-only">Telephone</label>
          <input
            id="annonce-contact-tel"
            type="tel"
            value={contactTel}
            onChange={(e) => setContactTel(e.target.value)}
            placeholder="Telephone"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>
      </fieldset>

      {/* RGPD */}
      <label className="flex items-start gap-2 text-sm text-[var(--color-gris)] font-sans">
        <input type="checkbox" required className="mt-1" />
        <span>
          J'accepte que mes coordonnees soient partagees avec les personnes interessees par mon annonce.{' '}
          <a href="/politique-confidentialite/" className="text-[var(--color-orange)] underline">
            Politique de confidentialite
          </a>
        </span>
      </label>

      {error && (
        <p className="text-sm text-red-600 font-sans">{error}</p>
      )}

      {/* Boutons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-orange)] px-6 py-3 text-lg font-semibold text-white font-sans transition-colors hover:bg-[var(--color-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/50 cursor-pointer disabled:opacity-60"
        >
          {loading ? 'Publication...' : 'Publier gratuitement'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={(e) => handleSubmit(e as unknown as FormEvent, 'brouillon')}
          className="flex-1 rounded-[var(--radius-md)] border-2 border-[var(--color-creme-dark)] px-6 py-3 text-lg font-semibold text-[var(--color-marine)] font-sans transition-colors hover:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/50 cursor-pointer disabled:opacity-60"
        >
          Enregistrer en brouillon
        </button>
      </div>
    </form>
  );
};

export default AnnonceForm;
