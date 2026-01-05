
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { apiClient } from '../services/apiClient';

interface Props {
  user: User;
  onLogout: () => void;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string;
  alias: string;
}

interface UserCircle {
  id: string;
  name: string;
  description: string;
  type: string;
  joinedAt: number;
}

interface UserMessage {
  id: string;
  content: string;
  createdAt: number;
  circleId: string;
  circleName: string;
  alias: string;
}

const Settings: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [circles, setCircles] = useState<UserCircle[]>([]);
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'circles' | 'messages'>('profile');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [profileRes, circlesRes, messagesRes] = await Promise.all([
          apiClient.get('/api/me/profile'),
          apiClient.get('/api/me/circles'),
          apiClient.get('/api/me/messages'),
        ]);
        
        setProfile(profileRes);
        setCircles(circlesRes.circles || []);
        setMessages(messagesRes.messages || []);
        setAvatarUrl(profileRes.avatar || '');
      } catch (err) {
        console.error('Failed to load settings data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleUpdateAvatar = async () => {
    if (!avatarUrl.trim()) return;
    
    try {
      setUpdating(true);
      await apiClient.put('/api/me/profile', { avatar: avatarUrl });
      if (profile) {
        setProfile({ ...profile, avatar: avatarUrl });
      }
      alert('Profile picture updated!');
    } catch (err) {
      console.error('Failed to update avatar', err);
      alert('Failed to update profile picture');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f5f2e8]">
        <div className="w-12 h-12 border-4 border-[#d4a373] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f2e8] p-4 sm:p-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-[#d4a373]/20 hover:bg-white/80 transition-all"
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-[#e07a5f]/10 text-[#e07a5f] rounded-lg border border-[#e07a5f]/20 hover:bg-[#e07a5f]/20 transition-all"
          >
            Logout
          </button>
        </div>

        <h1 className="text-3xl font-bold text-[#432818]">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex gap-2 border-b border-[#d4a373]/20">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'profile'
                ? 'border-b-2 border-[#d4a373] text-[#432818]'
                : 'text-[#432818]/60 hover:text-[#432818]'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('circles')}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'circles'
                ? 'border-b-2 border-[#d4a373] text-[#432818]'
                : 'text-[#432818]/60 hover:text-[#432818]'
            }`}
          >
            My Circles ({circles.length})
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'messages'
                ? 'border-b-2 border-[#d4a373] text-[#432818]'
                : 'text-[#432818]/60 hover:text-[#432818]'
            }`}
          >
            My Messages ({messages.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto">
        {/* Profile Tab */}
        {activeTab === 'profile' && profile && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-[#d4a373]/20">
            <div className="flex flex-col sm:flex-row gap-8">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-[#d4a373]/10 mb-4">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-[#d4a373]">
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="text-2xl font-bold text-[#432818] mb-1">{profile.alias}</p>
              </div>

              {/* Profile Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#432818]/60 mb-1">Name</label>
                  <p className="text-lg text-[#432818]">{profile.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#432818]/60 mb-1">Email</label>
                  <p className="text-lg text-[#432818]">{profile.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#432818]/60 mb-1">Username (Alias)</label>
                  <p className="text-lg text-[#432818]">{profile.alias}</p>
                  <p className="text-sm text-[#432818]/60 mt-1">This is your anonymous username across all circles</p>
                </div>

                <div className="pt-4 border-t border-[#d4a373]/20">
                  <label className="block text-sm font-medium text-[#432818]/60 mb-2">
                    Update Profile Picture (URL)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="Enter image URL"
                      className="flex-1 px-4 py-2 bg-white/60 border border-[#d4a373]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a373]/50"
                    />
                    <button
                      onClick={handleUpdateAvatar}
                      disabled={updating || !avatarUrl.trim()}
                      className="px-6 py-2 bg-[#d4a373] text-white rounded-lg hover:bg-[#c89563] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {updating ? 'Updating...' : 'Update'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Circles Tab */}
        {activeTab === 'circles' && (
          <div className="space-y-4">
            {circles.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-12 border border-[#d4a373]/20 text-center">
                <p className="text-[#432818]/60">You haven't joined any circles yet</p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-4 px-6 py-2 bg-[#d4a373] text-white rounded-lg hover:bg-[#c89563] transition-all"
                >
                  Browse Circles
                </button>
              </div>
            ) : (
              circles.map((circle) => (
                <div
                  key={circle.id}
                  onClick={() => navigate(`/circle/${circle.id}`)}
                  className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-[#d4a373]/20 hover:bg-white/80 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-[#432818] mb-2">{circle.name}</h3>
                      <p className="text-[#432818]/70 mb-3">{circle.description}</p>
                      <div className="flex gap-4 text-sm text-[#432818]/60">
                        <span className="px-3 py-1 bg-[#d4a373]/10 rounded-full">
                          {circle.type === 'public' ? '🌍 Public' : '🔒 Private'}
                        </span>
                        <span>Joined {formatDate(circle.joinedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-12 border border-[#d4a373]/20 text-center">
                <p className="text-[#432818]/60">You haven't posted any messages yet</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-[#d4a373]/20"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#432818]">{message.alias}</span>
                      <span className="text-sm text-[#432818]/60">
                        in{' '}
                        <button
                          onClick={() => navigate(`/circle/${message.circleId}`)}
                          className="text-[#d4a373] hover:underline"
                        >
                          {message.circleName}
                        </button>
                      </span>
                    </div>
                    <span className="text-sm text-[#432818]/60">{formatDate(message.createdAt)}</span>
                  </div>
                  <p className="text-[#432818] whitespace-pre-wrap">{message.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
