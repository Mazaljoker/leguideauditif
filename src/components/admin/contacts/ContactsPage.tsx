// ContactsPage.tsx — root React de /admin/contacts.
// Pattern aligné sur ProspectsPage : state racine + filtres + actions optimistes.

import { useEffect, useMemo, useState } from 'react';
import ContactsHeader from './ContactsHeader';
import ContactsFilters, { type ContactFilters } from './ContactsFilters';
import ContactsTable from './ContactsTable';
import ImportDialog from './ImportDialog';
import Toast from '../ui/react/Toast';
import { useToast } from '../../../lib/useToast';
import { normalizeForSearch } from '../../../lib/prospects';
import type { Contact } from '../../../types/prospect';

interface Props {
  initialContacts: Contact[];
}

export default function ContactsPage({ initialContacts }: Props) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [filters, setFilters] = useState<ContactFilters>({
    states: [],
    onlyUnconverted: false,
    onlyWithReply: false,
  });
  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchInput), 150);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filteredContacts = useMemo(() => {
    let result = contacts;

    if (filters.states.length > 0) {
      result = result.filter(
        (c) => c.waalaxy_state && filters.states.includes(c.waalaxy_state)
      );
    }
    if (filters.onlyUnconverted) {
      result = result.filter((c) => !c.converted_to_prospect_id);
    }
    if (filters.onlyWithReply) {
      result = result.filter((c) => c.waalaxy_message_replied);
    }

    if (searchDebounced.trim()) {
      const q = normalizeForSearch(searchDebounced);
      result = result.filter(
        (c) =>
          normalizeForSearch(`${c.first_name} ${c.last_name}`).includes(q) ||
          normalizeForSearch(c.company_name).includes(q) ||
          normalizeForSearch(c.location).includes(q) ||
          normalizeForSearch(c.job_title).includes(q)
      );
    }

    return result;
  }, [contacts, filters, searchDebounced]);

  async function reload() {
    try {
      const res = await fetch('/api/admin/contacts/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok) {
        setContacts((json.contacts as Contact[]) ?? []);
      }
    } catch {
      // silencieux — le SSR initial tient la route
    }
  }

  async function handleConvert(contactId: string) {
    const previous = contacts;
    try {
      const res = await fetch('/api/admin/contacts/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');

      setContacts((prev) =>
        prev.map((c) => (c.id === contactId ? (json.contact as Contact) : c))
      );
      showToast(
        json.created
          ? 'Prospect créé depuis le contact.'
          : 'Contact lié à un prospect existant.',
        'success'
      );
    } catch (e) {
      setContacts(previous);
      showToast(`Conversion impossible : ${(e as Error).message}`, 'error');
    }
  }

  async function handleArchive(contactId: string) {
    const previous = contacts;
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
    try {
      const res = await fetch('/api/admin/contacts/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      showToast('Contact archivé.', 'success');
    } catch (e) {
      setContacts(previous);
      showToast(`Archivage impossible : ${(e as Error).message}`, 'error');
    }
  }

  return (
    <>
      <ContactsHeader
        total={contacts.length}
        onImportClick={() => setIsImportOpen(true)}
      />

      <ContactsFilters
        contacts={contacts}
        filters={filters}
        onFiltersChange={setFilters}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
      />

      <ContactsTable
        contacts={filteredContacts}
        onConvert={handleConvert}
        onArchive={handleArchive}
      />

      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={reload}
      />

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          action={toast.action}
          onClose={hideToast}
        />
      )}
    </>
  );
}
