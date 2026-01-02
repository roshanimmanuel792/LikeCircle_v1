
import React, { useState } from 'react';
import { Message } from '../types';

interface Props {
  message: Message;
  onReply: (message: Message) => void;
  isReply?: boolean;
  depth?: number;
}

const Post: React.FC<Props> = ({ message, onReply, isReply = false, depth = 0 }) => {
  const [reported, setReported] = useState(false);
  const date = new Date(message.timestamp);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleReport = () => {
    if (confirm('Are you sure you want to report this message?')) {
      setReported(true);
    }
  };

  if (reported) {
    return (
      <div className={`p-4 glass rounded-[2rem] text-center text-xs text-[#8d8a85] font-medium italic ${isReply ? 'ml-6 md:ml-12' : ''} my-2`}>
        This content was reported and is hidden.
      </div>
    );
  }

  // Max depth visually before we stop indenting too much
  const maxVisualDepth = 4;
  const currentDepth = Math.min(depth, maxVisualDepth);

  return (
    <div className={`relative ${isReply ? 'mt-4' : 'mt-8'}`}>
      {/* Threading Line */}
      {isReply && (
        <div 
          className="absolute left-[-24px] top-[-16px] bottom-0 border-l-2 border-[#d4a373]/30 rounded-bl-3xl"
          style={{ width: '24px', borderBottom: '2px solid rgba(212, 163, 115, 0.3)' }}
        ></div>
      )}

      <div className={`space-y-4 ${isReply ? 'ml-6' : ''} animate-in fade-in duration-500`}>
        <div className={`glass-hover bg-white/40 p-6 rounded-[2rem] border border-white/60 group transition-all shadow-sm hover:shadow-md ${isReply ? 'border-l-4 border-l-[#d4a373]/40' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#d4a373] to-[#a98467] flex items-center justify-center text-xs font-black text-white uppercase shadow-md shadow-[#d4a373]/10">
                {message.alias.substring(0, 2)}
              </div>
              <div className="flex flex-col">
                <span className="text-[#d4a373] font-black text-sm tracking-wide">@{message.alias}</span>
                <span className="text-[#8d8a85] text-[10px] uppercase font-black tracking-tighter opacity-70">{timeStr}</span>
              </div>
            </div>
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <button 
                onClick={() => onReply(message)}
                className="text-[10px] text-[#5c5852] hover:text-[#2d1b10] px-4 py-1.5 bg-white/60 hover:bg-white/90 rounded-full transition-all border border-black/5 font-black uppercase tracking-widest shadow-sm"
              >
                Reply Mention
              </button>
              <button 
                onClick={handleReport}
                className="p-2 text-[#8d8a85] hover:text-red-500 rounded-full hover:bg-red-50 transition-all"
                title="Report Content"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="pl-1">
            <p className="text-[#432818] leading-relaxed text-[16px] whitespace-pre-wrap font-medium">
              {message.content}
            </p>
          </div>
        </div>

        {/* Render Nested Replies recursively */}
        {message.replies && message.replies.length > 0 && (
          <div className="space-y-2 mt-4">
            {message.replies.map(reply => (
              <Post 
                key={reply.id} 
                message={reply} 
                onReply={onReply} 
                isReply 
                depth={depth + 1} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Post;
