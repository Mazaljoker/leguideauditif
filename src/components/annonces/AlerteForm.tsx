import { useState, useEffect, type FC, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { getUser } from '../../lib/auth';
import type { AnnonceCategorie, AlerteFrequence, AnnonceAlerte } from '../../types/annonce';
import { SOUS_CATEGORIES, DEPARTEMENTS, CATEGORIES_META } from '../../types/annonce';

const AlerteForm: FC = () => {
  const [alertes, setAlertes] = useState<AnnonceAlerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [categorie, setCategorie] = useState<AnnonceCategorie | ''>('');
  const [sousCategorie, setSousCategorie] = useState('');
  const [departement, setDepartement] = useState('');
  const [prixMax, setPrixMax] = useState('');
  const [frequence, setFrequence] = useState<AlerteFrequence>('hebdo');

  const sousCategories = categorie ? SOUS_CATEGORIES[categorie] : [];

  useEffect(() => {
    const load = async () => {
      const { user } = await getUser();
      if (!user) {
        window.location.href = '/auth/login/?redirect=/annonces/alertes/';
        return;
      }
      setUserId(user.id);

      const { data } = await supabase
        .from('annonces_alertes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setAlertes((data as AnnonceAlerte[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!categorie) {
      setError('Selectionnez une categorie.');
      return;
    }

    setSaving(true);

    const { error: dbError } = await supabase.from('annonces_alertes').insert({
      user_id: userId,
      categorie,
      sous_categorie: sousCategorie || null,
      departements: departement ? [departement] : null,
      prix_max: prixMax ? parseInt(prixMax) * 100 : null,
      frequence,
    });

    setSaving(false);

    if (dbError) {
      setError('Erreur lors de la creation de l\'alerte.');
      return;
    }

    setSuccess('Alerte creee. Vous serez notifie des nouvelles annonces correspondantes.');
    setCategorie('');
    setSousCategorie('');
    setDepartement('');
    setPrixMax('');
    setFrequence('hebdo');

    // Refresh list
    const { data } = await supabase
      .from('annonces_alertes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setAlertes((data as AnnonceAlerte[]) ?? []);
  };

  const handleToggle = async (alerte: AnnonceAlerte) => {
    await supabase
      .from('annonces_alertes')
      .update({ active: !alerte.active })
      .eq('id', alerte.id);
    setAlertes((prev) =>
      prev.map((a) => a.id === alerte.id ? { ...a, active: !a.active } : a)
    );
  };

  const handleDeleteAlerte = async (id: string) => {
    await supabase.from('annonces_alertes').delete().eq('id', id);
    setAlertes((prev) => prev.filter((a) => a.id !== id));
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--color-gris)] font-sans">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Formulaire */}
      <div>
        <h2 className="font-sans text-xl font-bold text-[var(--color-marine)] mb-4">Creer une alerte</h2>
        <form onSubmit={handleSubmit} className="grid gap-4 bg-white rounded-xl border border-[var(--color-creme-dark)] p-5">
          <div>
            <label htmlFor="alerte-cat" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
              Categorie *
            </label>
            <select
              id="alerte-cat"
              required
              value={categorie}
              onChange={(e) => { setCategorie(e.target.value as AnnonceCategorie); setSousCategorie(''); }}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
            >
              <option value="">Selectionnez</option>
              <option value="cession">Cession & Installation</option>
              <option value="emploi">Emploi & Recrutement</option>
              <option value="remplacement">Remplacement</option>
              <option value="materiel">Materiel professionnel</option>
            </select>
          </div>

          {sousCategories.length > 0 && (
            <div>
              <label htmlFor="alerte-sous-cat" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
                Type
              </label>
              <select
                id="alerte-sous-cat"
                value={sousCategorie}
                onChange={(e) => setSousCategorie(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
              >
                <option value="">Tous</option>
                {sousCategories.map((sc) => (
                  <option key={sc.value} value={sc.value}>{sc.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="alerte-dept" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
              Departement
            </label>
            <select
              id="alerte-dept"
              value={departement}
              onChange={(e) => setDepartement(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
            >
              <option value="">Tous</option>
              {DEPARTEMENTS.map((d) => (
                <option key={d.code} value={d.code}>{d.code} - {d.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="alerte-prix" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
              Prix max (EUR)
            </label>
            <input
              id="alerte-prix"
              type="number"
              min="0"
              value={prixMax}
              onChange={(e) => setPrixMax(e.target.value)}
              placeholder="Optionnel"
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-[var(--color-marine)] mb-2 font-sans">Frequence</legend>
            <div className="flex gap-4">
              {([['immediat', 'Immediat'], ['quotidien', 'Quotidien'], ['hebdo', 'Hebdomadaire']] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 text-sm font-sans text-[var(--color-marine)] cursor-pointer">
                  <input
                    type="radio"
                    name="frequence"
                    value={val}
                    checked={frequence === val}
                    onChange={() => setFrequence(val)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-600 font-sans">{error}</p>}
          {success && <p className="text-sm text-[var(--color-success)] font-sans font-medium">{success}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-[var(--radius-md)] bg-[var(--color-orange)] px-6 py-3 text-lg font-semibold text-white font-sans transition-colors hover:bg-[var(--color-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/50 cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Creation...' : 'Creer l\'alerte'}
          </button>

          <p className="text-xs text-[var(--color-gris)] font-sans text-center">
            Les notifications par email seront activees prochainement.
          </p>
        </form>
      </div>

      {/* Liste des alertes */}
      <div>
        <h2 className="font-sans text-xl font-bold text-[var(--color-marine)] mb-4">
          Mes alertes ({alertes.length})
        </h2>
        {alertes.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--color-creme-dark)] p-8 text-center">
            <p className="text-[var(--color-gris)] font-sans">Aucune alerte active.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alertes.map((alerte) => {
              const catMeta = CATEGORIES_META[alerte.categorie as AnnonceCategorie];
              return (
                <div
                  key={alerte.id}
                  className={`bg-white rounded-xl border p-4 ${alerte.active ? 'border-[var(--color-creme-dark)]' : 'border-gray-200 opacity-60'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-sans font-semibold text-[var(--color-marine)] text-sm">
                      {catMeta?.label ?? alerte.categorie}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(alerte)}
                        className="text-xs font-sans text-[var(--color-orange)] font-medium cursor-pointer hover:underline"
                      >
                        {alerte.active ? 'Desactiver' : 'Activer'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAlerte(alerte.id)}
                        className="text-xs font-sans text-red-500 font-medium cursor-pointer hover:underline"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-[var(--color-gris)] font-sans">
                    {alerte.sous_categorie && <span className="px-2 py-0.5 bg-gray-100 rounded">{alerte.sous_categorie}</span>}
                    {alerte.departements?.map((d) => <span key={d} className="px-2 py-0.5 bg-gray-100 rounded">Dept {d}</span>)}
                    {alerte.prix_max && <span className="px-2 py-0.5 bg-gray-100 rounded">Max {(alerte.prix_max / 100).toLocaleString('fr-FR')} EUR</span>}
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{alerte.frequence}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlerteForm;
