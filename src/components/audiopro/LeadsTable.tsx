import { useState, useMemo, type FC } from 'react';
import type { UserLead } from '../../lib/audiopro';

export interface LeadsTableProps {
  initialLeads: UserLead[];
  initialFilter?: 'all' | 'unread';
  showCentreColumn: boolean;
}

type Filter = 'all' | 'unread';

const HEARING_LOSS_LABEL: Record<string, string> = {
  legere: 'Légère',
  moderee: 'Modérée',
  severe: 'Sévère',
  profonde: 'Profonde',
  inconnu: 'Inconnu',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'À l’instant';
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return formatDate(iso);
}

const LeadsTable: FC<LeadsTableProps> = ({
  initialLeads,
  initialFilter = 'all',
  showCentreColumn,
}) => {
  const [leads, setLeads] = useState<UserLead[]>(initialLeads);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    if (filter === 'unread') return leads.filter((l) => l.read_at === null);
    return leads;
  }, [leads, filter]);

  const unreadCount = useMemo(
    () => leads.filter((l) => l.read_at === null).length,
    [leads],
  );

  async function toggleRead(lead: UserLead) {
    const nextRead = lead.read_at === null;
    setBusyIds((prev) => new Set(prev).add(lead.id));
    try {
      const res = await fetch('/api/audiopro/leads-mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, read: nextRead }),
      });
      if (!res.ok) throw new Error('Erreur');
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id
            ? { ...l, read_at: nextRead ? new Date().toISOString() : null }
            : l,
        ),
      );
    } catch {
      alert('Impossible de mettre à jour le lead. Réessayez.');
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
    }
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-gris-clair bg-blanc p-10 text-center">
        <p className="font-sans text-marine text-lg font-semibold mb-2">
          Aucune demande pour le moment
        </p>
        <p className="font-sans text-gris-texte text-sm max-w-md mx-auto">
          Les demandes de bilan envoyées depuis votre fiche publique apparaîtront ici.
          Pour améliorer votre visibilité, veillez à compléter votre fiche au maximum.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filtres */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={
            'inline-flex items-center rounded-full px-4 py-2.5 text-sm font-sans font-medium transition-colors ' +
            (filter === 'all'
              ? 'bg-marine text-blanc'
              : 'bg-blanc border border-gris-clair text-gris-texte hover:text-marine')
          }
          style={{ minHeight: '44px' }}
        >
          Toutes ({leads.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={
            'inline-flex items-center rounded-full px-4 py-2.5 text-sm font-sans font-medium transition-colors gap-2 ' +
            (filter === 'unread'
              ? 'bg-orange text-blanc'
              : 'bg-blanc border border-gris-clair text-gris-texte hover:text-marine')
          }
          style={{ minHeight: '44px' }}
        >
          Non lues
          {unreadCount > 0 && (
            <span
              className={
                'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ' +
                (filter === 'unread' ? 'bg-blanc/30' : 'bg-orange text-blanc')
              }
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Table desktop */}
      <div className="hidden md:block rounded-xl border border-gris-clair bg-blanc overflow-hidden">
        <table className="w-full">
          <thead className="bg-creme">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wide text-marine">
                Patient
              </th>
              <th className="text-left px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wide text-marine">
                Téléphone
              </th>
              <th className="text-left px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wide text-marine">
                Zone
              </th>
              <th className="text-left px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wide text-marine">
                Type de perte
              </th>
              {showCentreColumn && (
                <th className="text-left px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wide text-marine">
                  Centre
                </th>
              )}
              <th className="text-left px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wide text-marine">
                Reçue
              </th>
              <th className="text-right px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wide text-marine">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={showCentreColumn ? 7 : 6}
                  className="px-4 py-8 text-center font-sans text-sm text-gris-texte"
                >
                  Aucune demande ne correspond à ce filtre.
                </td>
              </tr>
            ) : (
              visible.map((lead) => {
                const unread = lead.read_at === null;
                const busy = busyIds.has(lead.id);
                return (
                  <tr
                    key={lead.id}
                    className={
                      'border-t border-gris-clair font-sans text-sm ' +
                      (unread ? 'bg-orange/5' : '')
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {unread && (
                          <span
                            className="inline-block w-2 h-2 rounded-full bg-orange shrink-0"
                            aria-label="Non lue"
                            title="Non lue"
                          />
                        )}
                        <span className={unread ? 'font-semibold text-marine' : 'text-marine'}>
                          {lead.first_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`tel:${lead.phone.replace(/\s/g, '')}`}
                        className="text-marine hover:text-orange font-medium"
                      >
                        {lead.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gris-texte">{lead.zip_code}</td>
                    <td className="px-4 py-3 text-gris-texte">
                      {lead.hearing_loss_type
                        ? HEARING_LOSS_LABEL[lead.hearing_loss_type] ?? lead.hearing_loss_type
                        : '—'}
                    </td>
                    {showCentreColumn && (
                      <td className="px-4 py-3">
                        <a
                          href={`/centre/${lead.centre_slug}/`}
                          className="text-marine hover:text-orange underline-offset-2 hover:underline"
                          target="_blank"
                          rel="noopener"
                        >
                          {lead.centre_nom}
                        </a>
                      </td>
                    )}
                    <td className="px-4 py-3 text-gris-texte" title={formatDate(lead.created_at)}>
                      {formatRelative(lead.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleRead(lead)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gris-clair px-3 py-1.5 text-xs font-sans font-medium text-marine hover:bg-creme disabled:opacity-60 transition-colors"
                        style={{ minHeight: '36px' }}
                      >
                        {unread ? 'Marquer lu' : 'Marquer non lu'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden space-y-3">
        {visible.length === 0 ? (
          <p className="text-center font-sans text-sm text-gris-texte py-6">
            Aucune demande ne correspond à ce filtre.
          </p>
        ) : (
          visible.map((lead) => {
            const unread = lead.read_at === null;
            const busy = busyIds.has(lead.id);
            return (
              <article
                key={lead.id}
                className={
                  'rounded-xl border p-4 font-sans ' +
                  (unread ? 'border-orange/30 bg-orange/5' : 'border-gris-clair bg-blanc')
                }
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    {unread && (
                      <span className="inline-block w-2 h-2 rounded-full bg-orange shrink-0" />
                    )}
                    <p className={unread ? 'font-bold text-marine text-base' : 'font-semibold text-marine text-base'}>
                      {lead.first_name}
                    </p>
                  </div>
                  <p className="text-xs text-gris-texte" title={formatDate(lead.created_at)}>
                    {formatRelative(lead.created_at)}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-y-2 gap-x-3 text-sm mb-4">
                  <dt className="text-gris-texte">Téléphone</dt>
                  <dd>
                    <a
                      href={`tel:${lead.phone.replace(/\s/g, '')}`}
                      className="text-marine hover:text-orange font-medium"
                    >
                      {lead.phone}
                    </a>
                  </dd>
                  <dt className="text-gris-texte">Zone</dt>
                  <dd className="text-marine">{lead.zip_code}</dd>
                  <dt className="text-gris-texte">Type de perte</dt>
                  <dd className="text-marine">
                    {lead.hearing_loss_type
                      ? HEARING_LOSS_LABEL[lead.hearing_loss_type] ?? lead.hearing_loss_type
                      : '—'}
                  </dd>
                  {showCentreColumn && (
                    <>
                      <dt className="text-gris-texte">Centre</dt>
                      <dd>
                        <a
                          href={`/centre/${lead.centre_slug}/`}
                          className="text-marine hover:text-orange"
                          target="_blank"
                          rel="noopener"
                        >
                          {lead.centre_nom}
                        </a>
                      </dd>
                    </>
                  )}
                </dl>
                <div className="flex gap-2">
                  <a
                    href={`tel:${lead.phone.replace(/\s/g, '')}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-marine text-blanc px-3 py-2 text-sm font-medium"
                    style={{ minHeight: '44px' }}
                  >
                    Appeler
                  </a>
                  <button
                    type="button"
                    onClick={() => toggleRead(lead)}
                    disabled={busy}
                    className="inline-flex items-center justify-center rounded-lg border border-gris-clair px-3 py-2 text-sm font-medium text-marine hover:bg-creme disabled:opacity-60"
                    style={{ minHeight: '44px' }}
                  >
                    {unread ? 'Lue' : 'Non lue'}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LeadsTable;
