import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Search, User, Circle } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  status: string;
  is_online: boolean;
}

interface Contact {
  id: string;
  profile: Profile;
}

interface ContactsListProps {
  onSelectContact: (contactId: string, contactName: string) => void;
  selectedContactId: string | null;
}

export function ContactsList({ onSelectContact, selectedContactId }: ContactsListProps) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadContacts();
      subscribeToContactsUpdates();
    }
  }, [user]);

  const loadContacts = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        id,
        contact_id,
        profiles!contacts_contact_id_fkey (
          id,
          email,
          full_name,
          avatar_url,
          status,
          is_online
        )
      `)
      .eq('user_id', user!.id);

    if (!error && data) {
      setContacts(
        data.map((contact) => ({
          id: contact.id,
          profile: contact.profiles as unknown as Profile,
        }))
      );
    }
  };

  const subscribeToContactsUpdates = () => {
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          loadContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const searchUsers = async () => {
    if (!searchEmail.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', `%${searchEmail}%`)
      .neq('id', user!.id)
      .limit(5);

    if (!error && data) {
      const existingContactIds = contacts.map((c) => c.profile.id);
      setSearchResults(data.filter((profile) => !existingContactIds.includes(profile.id)));
    }
    setLoading(false);
  };

  const addContact = async (contactId: string) => {
    const { error } = await supabase.from('contacts').insert({
      user_id: user!.id,
      contact_id: contactId,
    });

    if (!error) {
      await loadContacts();
      setSearchEmail('');
      setSearchResults([]);
      setShowAddContact(false);
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Messages</h2>
          <button
            onClick={() => setShowAddContact(!showAddContact)}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            title="Add Contact"
          >
            <UserPlus className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {showAddContact && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                  placeholder="Search by email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <button
                onClick={searchUsers}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium disabled:opacity-50"
              >
                Search
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                {searchResults.map((profile) => (
                  <div
                    key={profile.id}
                    className="p-3 hover:bg-gray-100 flex items-center justify-between border-b border-gray-200 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-800">{profile.full_name}</p>
                      <p className="text-xs text-gray-500">{profile.email}</p>
                    </div>
                    <button
                      onClick={() => addContact(profile.id)}
                      className="px-3 py-1 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition text-xs font-medium"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {contacts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No contacts yet</p>
            <p className="text-xs mt-1">Add contacts to start messaging</p>
          </div>
        ) : (
          <div>
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => onSelectContact(contact.profile.id, contact.profile.full_name)}
                className={`w-full p-4 hover:bg-gray-50 transition border-b border-gray-100 text-left ${
                  selectedContactId === contact.profile.id ? 'bg-teal-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-semibold">
                      {contact.profile.full_name.charAt(0).toUpperCase()}
                    </div>
                    {contact.profile.is_online && (
                      <Circle className="absolute bottom-0 right-0 w-3 h-3 fill-green-500 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{contact.profile.full_name}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {contact.profile.status || contact.profile.email}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
