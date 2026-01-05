
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Circle, CircleType } from '../types';
import { circleService } from '../services/circleService';

interface Props {
  user: User;
  onLogout: () => void;
}

const Discover: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadCircles();
  }, []);

  const loadCircles = async (searchTerm: string = '') => {
    try {
      setLoading(true);
      const data = await circleService.discoverCircles(searchTerm || undefined);
      setCircles(data);
      setError('');
    } catch (err) {
      console.error('Failed to load circles', err);
      setError('Failed to load circles');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadCircles(search);
  };

  const handleJoin = async (circle: Circle) => {
    if (circle.type === CircleType.PRIVATE) {
      setShowPasswordModal(circle.id);
      setPassword('');
      setError('');
    } else {
      await performJoin(circle.id);
    }
  };

  const performJoin = async (circleId: string, pwd?: string) => {
    try {
      setJoining(circleId);
      await circleService.joinCircle(user.id, circleId, pwd);
      // Reload circles to remove joined one from discover list
      await loadCircles(search);
      setShowPasswordModal(null);
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to join circle');
    } finally {
      setJoining(null);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPasswordModal) return;
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    await performJoin(showPasswordModal, password);
  };

  return (
    <div className="min-h-screen bg-[#f5f2e8] p-4 sm:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
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

        <h1 className="text-3xl font-bold text-[#432818] mb-2">Discover Circles</h1>
        <p className="text-[#8d8a85]">Find and join public communities</p>
      </div>

      {/* Search */}
      <div className="max-w-6xl mx-auto mb-8">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search circles by name..."
            className="flex-1 px-6 py-3 bg-white/60 backdrop-blur-sm border border-[#d4a373]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a373]/50"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-[#d4a373] text-white rounded-xl hover:bg-[#c89563] transition-all font-semibold"
          >
            Search
          </button>
        </form>
      </div>

      {/* Circles Grid */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-[#8d8a85]">Loading circles...</div>
        ) : circles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {circles.map((circle) => (
              <div
                key={circle.id}
                className="glass p-8 rounded-[2rem] group flex flex-col justify-between space-y-6 transition-all duration-300 hover:translate-y-[-4px] hover:border-[#d4a373]/50"
              >
                <div>
                  <h3 className="text-xl font-bold text-[#432818] mb-2">{circle.name}</h3>
                  <p className="text-[#8d8a85] text-sm mb-4">{circle.description}</p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs bg-[#d4a373]/10 text-[#d4a373] px-3 py-1 rounded-full font-semibold">
                      {circle.type === 'public' ? '🌍 Public' : '🔒 Private'}
                    </span>
                    <span className="text-xs bg-[#432818]/10 text-[#432818] px-3 py-1 rounded-full font-semibold">
                      {circle.memberCount} members
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleJoin(circle)}
                  disabled={joining === circle.id}
                  className="w-full py-3 bg-[#d4a373] text-white rounded-lg hover:bg-[#c89563] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                >
                  {joining === circle.id ? 'Joining...' : 'Join Circle'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass p-12 rounded-[2rem] text-center border border-[#d4a373]/20">
            <p className="text-[#8d8a85] mb-4">No circles found</p>
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  loadCircles('');
                }}
                className="text-[#d4a373] hover:underline font-semibold"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#f5f2e8] rounded-[2rem] p-8 max-w-sm w-full border border-[#d4a373]/20">
            <h2 className="text-2xl font-bold text-[#432818] mb-4">Enter Circle Password</h2>
            <p className="text-[#8d8a85] mb-6">This is a private circle. Please enter the password to join.</p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Circle password"
                className="w-full px-4 py-2 bg-white/60 border border-[#d4a373]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a373]/50"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(null)}
                  className="flex-1 px-4 py-2 bg-white/60 border border-[#d4a373]/20 rounded-lg hover:bg-white/80 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining === showPasswordModal}
                  className="flex-1 px-4 py-2 bg-[#d4a373] text-white rounded-lg hover:bg-[#c89563] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                >
                  {joining === showPasswordModal ? 'Joining...' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Discover;
