
import React, { useState } from 'react';
import { Circle, CircleType } from '../types';
import { circleService } from '../services/circleService';

interface Props {
  onClose: () => void;
  onCreated: (circle: Circle) => void;
  userId: string;
}

const CreateCircleModal: React.FC<Props> = ({ onClose, onCreated, userId }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CircleType>(CircleType.PUBLIC);
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) return;
    const circle = circleService.createCircle(name, description, type, password, userId);
    onCreated(circle);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/10 backdrop-blur-sm">
      <div className="max-w-lg w-full glass p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
        {/* Aesthetic background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4a373]/10 blur-3xl -z-10"></div>
        
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold font-outfit text-[#2d1b10]">New Circle</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/40 rounded-full transition-all text-[#8d8a85]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#8d8a85]">Circle Name</label>
            <input
              autoFocus
              required
              placeholder="Deep Thoughts..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/60 border border-white/80 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#d4a373] text-[#432818] transition-all placeholder:text-[#a3a19d]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#8d8a85]">Description</label>
            <textarea
              required
              rows={3}
              placeholder="What is this space about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/60 border border-white/80 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#d4a373] text-[#432818] transition-all resize-none placeholder:text-[#a3a19d]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setType(CircleType.PUBLIC)}
              className={`p-4 rounded-2xl border transition-all text-sm font-bold flex flex-col items-center gap-2 ${type === CircleType.PUBLIC ? 'bg-[#ccd5ae]/40 border-[#a3ad83] text-[#5a6a3b]' : 'bg-white/40 border-white text-[#8d8a85] hover:bg-white/60'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 20c4.083 0 7.674-2.44 9.252-6M12 3C6.477 3 2 7.477 2 13c0 2.503.921 4.79 2.444 6.551M12 3c2.209 0 4 1.791 4 4s-1.791 4-4 4-4-1.791-4-4 1.791-4 4-4z" />
              </svg>
              Public
            </button>
            <button
              type="button"
              onClick={() => setType(CircleType.PRIVATE)}
              className={`p-4 rounded-2xl border transition-all text-sm font-bold flex flex-col items-center gap-2 ${type === CircleType.PRIVATE ? 'bg-[#faedcd]/60 border-[#d4a373] text-[#8d7535]' : 'bg-white/40 border-white text-[#8d8a85] hover:bg-white/60'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Private
            </button>
          </div>

          {type === CircleType.PRIVATE && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
              <label className="text-sm font-semibold text-[#8d8a85]">Circle Password</label>
              <input
                required
                type="password"
                placeholder="Share this manually"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/60 border border-white/80 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#d4a373] text-[#432818] transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-[#d4a373] to-[#a98467] rounded-2xl font-bold text-lg text-white shadow-lg shadow-[#d4a373]/30 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
          >
            Launch Circle
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateCircleModal;
