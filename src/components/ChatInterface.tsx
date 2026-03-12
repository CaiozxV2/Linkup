import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, MessageCircle, Phone, Video } from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  message_type?: 'text' | 'voice';
  duration_seconds?: number;
}

interface ChatInterfaceProps {
  contactId: string;
  contactName: string;
}

export function ChatInterface({ contactId, contactName }: ChatInterfaceProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && contactId) {
      loadOrCreateConversation();
    }
  }, [user, contactId]);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
      subscribeToMessages();
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadOrCreateConversation = async () => {
    const { data: existingConversations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user!.id);

    if (existingConversations) {
      for (const conv of existingConversations) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.conversation_id);

        if (participants && participants.length === 2) {
          const participantIds = participants.map((p) => p.user_id);
          if (participantIds.includes(user!.id) && participantIds.includes(contactId)) {
            setConversationId(conv.conversation_id);
            return;
          }
        }
      }
    }

    const { data: newConv } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (newConv) {
      await supabase.from('conversation_participants').insert([
        { conversation_id: newConv.id, user_id: user!.id },
        { conversation_id: newConv.id, user_id: contactId },
      ]);
      setConversationId(newConv.id);
    }
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId!)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || loading) return;

    setLoading(true);
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user!.id,
      content: newMessage.trim(),
    });

    if (!error) {
      setNewMessage('');
    }
    setLoading(false);
  };

  const sendVoiceMessage = async (audioBase64: string, duration: number) => {
    if (!conversationId || loading) return;

    setLoading(true);
    const fileName = `${user!.id}-${Date.now()}.wav`;
    const filePath = `voice-messages/${fileName}`;

    try {
      const blobData = await (await fetch(audioBase64)).blob();
      const { error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(filePath, blobData);

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('voice-messages')
          .getPublicUrl(filePath);

        await supabase.from('voice_messages').insert({
          conversation_id: conversationId,
          sender_id: user!.id,
          audio_url: publicUrlData.publicUrl,
          duration_seconds: duration,
        });
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
    }

    setLoading(false);
  };

  const initiateCall = (callType: 'audio' | 'video') => {
    console.log(`Starting ${callType} call with ${contactName}`);
    alert(`${callType === 'video' ? 'Video' : 'Audio'} call feature coming soon!`);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center font-semibold">
              {contactName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold">{contactName}</h2>
              <p className="text-sm text-blue-100">Active now</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => initiateCall('audio')}
              className="p-2 hover:bg-blue-700 rounded-full transition"
              title="Audio call"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              onClick={() => initiateCall('video')}
              className="p-2 hover:bg-blue-700 rounded-full transition"
              title="Video call"
            >
              <Video className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageCircle className="w-16 h-16 mb-4" />
            <p>No messages yet</p>
            <p className="text-sm">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((message) => {
            const isSender = message.sender_id === user!.id;
            return (
              <div key={message.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-md px-4 py-2 rounded-2xl ${
                    isSender
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'
                  }`}
                >
                  {message.message_type === 'voice' ? (
                    <div className="space-y-2">
                      <audio
                        src={message.content}
                        controls
                        className="w-full h-6"
                      />
                      <p
                        className={`text-xs ${
                          isSender ? 'text-blue-100' : 'text-gray-400'
                        }`}
                      >
                        {message.duration_seconds}s
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="break-words">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isSender ? 'text-blue-100' : 'text-gray-400'
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 p-4 space-y-3">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || loading}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <VoiceRecorder onSendVoiceMessage={sendVoiceMessage} disabled={loading} />
      </div>
    </div>
  );
}
