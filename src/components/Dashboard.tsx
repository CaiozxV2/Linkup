import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ContactsList } from './ContactsList';
import { ChatInterface } from './ChatInterface';
import { LogOut, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContactName, setSelectedContactName] = useState<string>('');
  const [userProfile, setUserProfile] = useState<{ full_name: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user!.id)
      .maybeSingle();

    if (data) {
      setUserProfile(data);
    }
  };

  const handleSelectContact = (contactId: string, contactName: string) => {
    setSelectedContactId(contactId);
    setSelectedContactName(contactName);
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-teal-600 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-6 h-6" />
          <div>
            <h1 className="text-lg font-bold">ChatApp</h1>
            {userProfile && (
              <p className="text-sm text-teal-100">Welcome, {userProfile.full_name}</p>
            )}
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 rounded-lg transition font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <ContactsList
          onSelectContact={handleSelectContact}
          selectedContactId={selectedContactId}
        />

        {selectedContactId ? (
          <ChatInterface contactId={selectedContactId} contactName={selectedContactName} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-400">
              <MessageCircle className="w-20 h-20 mx-auto mb-4" />
              <p className="text-lg">Select a contact to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
