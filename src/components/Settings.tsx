import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Bell, Shield, Palette, Globe } from 'lucide-react';

interface UserSettings {
  id: string;
  language: string;
  theme: string;
  wallpaper_url: string | null;
  primary_color: string;
  secondary_color: string;
  notifications_enabled: boolean;
  sound_enabled: boolean;
  two_factor_enabled: boolean;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
];

const THEMES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'auto', label: 'Auto' },
];

const COLORS = [
  { name: 'Blue', primary: '#3B82F6', secondary: '#1E40AF' },
  { name: 'Green', primary: '#10B981', secondary: '#047857' },
  { name: 'Purple', primary: '#8B5CF6', secondary: '#6D28D9' },
  { name: 'Red', primary: '#EF4444', secondary: '#991B1B' },
  { name: 'Orange', primary: '#F97316', secondary: '#C2410C' },
];

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('light');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState('#1E40AF');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSettings(data);
      setLanguage(data.language);
      setTheme(data.theme);
      setPrimaryColor(data.primary_color);
      setSecondaryColor(data.secondary_color);
      setNotificationsEnabled(data.notifications_enabled);
      setSoundEnabled(data.sound_enabled);
      setTwoFactorEnabled(data.two_factor_enabled);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from('user_settings')
      .update({
        language,
        theme,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        notifications_enabled: notificationsEnabled,
        sound_enabled: soundEnabled,
        two_factor_enabled: twoFactorEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (!error) {
      setSuccess('Settings saved successfully');
      setTimeout(() => {
        onClose();
      }, 1500);
    }

    setLoading(false);
  };

  const selectColor = (color: typeof COLORS[0]) => {
    setPrimaryColor(color.primary);
    setSecondaryColor(color.secondary);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Language</h3>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Theme</h3>
            </div>
            <div className="flex gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${
                    theme === t.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-gray-800 mb-4">Color Scheme</h3>
            <div className="grid grid-cols-5 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => selectColor(color)}
                  className={`w-full aspect-square rounded-lg transition border-2 ${
                    primaryColor === color.primary
                      ? 'border-gray-400 scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.primary }}
                  title={color.name}
                >
                  {primaryColor === color.primary && (
                    <span className="text-white font-bold text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Notifications</h3>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="w-5 h-5 rounded accent-blue-600"
                />
                <span className="text-gray-700">Enable notifications</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-5 h-5 rounded accent-blue-600"
                />
                <span className="text-gray-700">Sound enabled</span>
              </label>
            </div>
          </div>

          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Security</h3>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={twoFactorEnabled}
                onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                className="w-5 h-5 rounded accent-blue-600"
              />
              <span className="text-gray-700">Two-factor authentication</span>
            </label>
            <p className="text-xs text-gray-500 mt-2">Enhance your account security with 2FA</p>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={saveSettings}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
