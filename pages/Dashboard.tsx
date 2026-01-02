
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Circle, CircleType } from '../types';
import { circleService } from '../services/circleService';
import CreateCircleModal from '../components/CreateCircleModal';

interface Props {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinPrivate, setShowJoinPrivate] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await circleService.getCircles();
        setCircles(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleJoin = async (circle: Circle) => {
    if (circle.type === CircleType.PUBLIC) {
      try {
        await circleService.joinCircle(user.id, circle.id);
        navigate(`/circle/${circle.id}`);
      } catch (err: any) {
        setError(err.message || 'Failed to join');
      }
    } else {
      setShowJoinPrivate(circle.id);
      setError('');
    }
  };

  const submitJoinPrivate = async () => {
    if (!showJoinPrivate) return;
    try {
      await circleService.joinCircle(user.id, showJoinPrivate, password);
      navigate(`/circle/${showJoinPrivate}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-6 py-12 space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold font-outfit text-[#2d1b10]">Welcome, Anonymous</h1>
          <p className="text-[#5c5852]">Discover or create a circle for your thoughts.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-[#d4a373] hover:bg-[#a98467] text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-[#d4a373]/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Circle
          </button>
          <button
            onClick={onLogout}
            className="p-3 glass rounded-xl hover:bg-white/40 transition-all text-[#8d8a85]"
            title="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Circle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-[#8d8a85]">Loading circles...</div>
        ) : circles.length > 0 ? (
          circles.map((circle) => (
            <div 
              key={circle.id}
              className="glass p-8 rounded-[2rem] group flex flex-col justify-between space-y-6 transition-all duration-300 hover:translate-y-[-4px] hover:border-[#d4a373]/50"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ${circle.type === CircleType.PUBLIC ? 'bg-[#ccd5ae]/40 text-[#5a6a3b]' : 'bg-[#faedcd]/60 text-[#8d7535]'}`}>
                    {circle.type.toUpperCase()}
                  </span>
                  <span className="text-[#8d8a85] text-xs">
                    {circle.memberCount || 0} members
                  </span>
                </div>
                <h3 className="text-xl font-bold font-outfit text-[#2d1b10] group-hover:text-[#d4a373] transition-colors">
                  {circle.name}
                </h3>
                <p className="text-[#5c5852] text-sm mt-2 line-clamp-3">
                  {circle.description}
                </p>
              </div>
              
              <button
                onClick={() => handleJoin(circle)}
                className="w-full py-3 bg-black/5 group-hover:bg-[#d4a373] rounded-2xl text-[#5c5852] group-hover:text-white font-semibold transition-all"
              >
                Join Circle
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-20 glass rounded-[2.5rem]">
            <p className="text-[#8d8a85] mb-6 font-medium">No circles found. Be the first to start a conversation!</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-8 py-4 bg-[#d4a373] hover:bg-[#a98467] text-white rounded-2xl transition-all shadow-lg shadow-[#d4a373]/20"
            >
              Initialize First Circle
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateCircleModal 
          onClose={() => setShowCreate(false)} 
          onCreated={(c) => {
            setCircles([c, ...circles]);
            setShowCreate(false);
          }}
          userId={user.id}
        />
      )}

      {showJoinPrivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/10 backdrop-blur-sm">
          <div className="max-w-sm w-full glass p-8 rounded-[2.5rem] space-y-6 shadow-2xl">
            <h2 className="text-2xl font-bold font-outfit text-center text-[#2d1b10]">Private Circle</h2>
            <p className="text-[#5c5852] text-center text-sm">This circle requires a password to join.</p>
            
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/60 border border-white/80 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#d4a373] text-[#432818]"
              />
              {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setShowJoinPrivate(null)}
                  className="flex-1 py-3 bg-white/40 rounded-xl text-[#5c5852] hover:bg-white/60 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={submitJoinPrivate}
                  className="flex-1 py-3 bg-[#d4a373] rounded-xl text-white font-bold hover:bg-[#a98467] transition-all"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
