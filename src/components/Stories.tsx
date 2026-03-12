import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Plus } from 'lucide-react';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  profile?: {
    full_name: string;
    photo_url: string | null;
  };
}

interface StoriesProps {
  onClose: () => void;
}

export function Stories({ onClose }: StoriesProps) {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadStories();
    const interval = setInterval(loadStories, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const loadStories = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('stories')
      .select(`
        *,
        profiles!stories_user_id_fkey(full_name, photo_url)
      `)
      .gte('expires_at', new Date().toISOString())
      .in(
        'user_id',
        [
          user.id,
          ...(await supabase
            .from('contacts')
            .select('contact_id')
            .eq('user_id', user.id)
            .then((res) => res.data?.map((c) => c.contact_id) || []))
        ]
      )
      .order('created_at', { ascending: false });

    if (data) {
      setStories(data);
    }
  };

  const uploadStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `stories/${fileName}`;
    const isVideo = file.type.startsWith('video');

    const { error: uploadError } = await supabase.storage
      .from('stories')
      .upload(filePath, file);

    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage.from('stories').getPublicUrl(filePath);

      await supabase.from('stories').insert({
        user_id: user.id,
        media_url: publicUrlData.publicUrl,
        media_type: isVideo ? 'video' : 'image',
      });

      loadStories();
    }

    setUploading(false);
  };

  const deleteStory = async (storyId: string) => {
    const { error } = await supabase.from('stories').delete().eq('id', storyId);

    if (!error) {
      loadStories();
      setSelectedStory(null);
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getTimeAgo = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diff = now.getTime() - created.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'now';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Stories</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {selectedStory ? (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
              {selectedStory.media_type === 'video' ? (
                <video
                  src={selectedStory.media_url}
                  controls
                  className="w-full h-full object-contain"
                  autoPlay
                />
              ) : (
                <img
                  src={selectedStory.media_url}
                  alt="Story"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">
                  {selectedStory.profile?.full_name}
                </h3>
                <p className="text-sm text-gray-500">{getTimeAgo(selectedStory.created_at)}</p>
                {selectedStory.caption && (
                  <p className="text-gray-700 mt-2">{selectedStory.caption}</p>
                )}
              </div>
              {selectedStory.user_id === user?.id && (
                <button
                  onClick={() => deleteStory(selectedStory.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition"
                >
                  Delete
                </button>
              )}
            </div>

            <button
              onClick={() => setSelectedStory(null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
            >
              Back
            </button>
          </div>
        ) : (
          <div>
            <label className="flex items-center justify-center gap-2 p-8 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition cursor-pointer mb-6">
              <Plus className="w-6 h-6 text-blue-600" />
              <span className="text-blue-600 font-medium">Add Story</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={uploadStory}
                disabled={uploading}
                className="hidden"
              />
            </label>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {stories.length === 0 ? (
                <p className="col-span-full text-center text-gray-500 py-8">No stories yet</p>
              ) : (
                stories
                  .filter((s) => !isExpired(s.expires_at))
                  .map((story) => (
                    <button
                      key={story.id}
                      onClick={() => setSelectedStory(story)}
                      className="relative group rounded-lg overflow-hidden aspect-square hover:opacity-90 transition"
                    >
                      {story.media_type === 'video' ? (
                        <video
                          src={story.media_url}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={story.media_url}
                          alt="Story"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition"></div>
                      <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
                        {story.profile?.photo_url ? (
                          <img
                            src={story.profile.photo_url}
                            alt={story.profile.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          story.profile?.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
