
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
            onClick={() => navigate('/discover')}
            className="px-6 py-3 bg-[#c9a96e] hover:bg-[#a98467] text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-[#c9a96e]/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 9a2 2 0 104 0 2 2 0 00-4 0z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
            </svg>
            Explore Circles
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/settings')}
              className="p-3 glass rounded-xl hover:bg-white/40 transition-all text-[#8d8a85]"
              title="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
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
                onClick={() => navigate(`/circle/${circle.id}`)}
                className="w-full py-3 bg-black/5 group-hover:bg-[#d4a373] rounded-2xl text-[#5c5852] group-hover:text-white font-semibold transition-all"
              >
                Open Circle
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
    </div>
  );
};

export default Dashboard;
