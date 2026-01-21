
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Circle, Message, Membership, CircleType } from '../types';
import { circleService } from '../services/circleService';
import { socketService } from '../services/socketService';
import { apiClient } from '../services/apiClient';
import Post from '../components/Post';

const EDIT_WINDOW_MINUTES = 10;

const flattenMessages = (nodes: Message[]): Message[] => {
  const flat: Message[] = [];
  const walk = (items: Message[]) => {
    items.forEach((item) => {
      const { replies, ...rest } = item;
      flat.push({ ...rest, replies: [] });
      if (replies && replies.length) {
        walk(replies);
      }
    });
  };
  walk(nodes);
  return flat;
};

const buildMessageTree = (flat: Message[]): Message[] => {
  const map = new Map<string, Message>();
  flat.forEach((m) => map.set(m.id, { ...m, replies: [] }));

  const roots: Message[] = [];
  flat.forEach((m) => {
    const node = map.get(m.id)!;
    if (m.parentId) {
      const parent = map.get(m.parentId);
      parent ? parent.replies?.push(node) : roots.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots.sort((a, b) => a.timestamp - b.timestamp);
};

const upsertMessage = (tree: Message[], incoming: Message): Message[] => {
  const flat = flattenMessages(tree).filter((m) => m.id !== incoming.id);
  flat.push({ ...incoming, replies: [] });
  return buildMessageTree(flat);
};

interface Props {
  user: User;
  onLogout: () => void;
}

const CircleView: React.FC<Props> = ({ user, onLogout }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());

  // Normalize message from API response
  const normalizeMessage = (msg: any, circleId: string): Message => ({
    id: String(msg.id),
    circleId: String(msg.circleId || circleId),
    membershipId: String(msg.membershipId || ''),
    alias: msg.alias,
    avatar: msg.avatar,
    userId: msg.userId ? String(msg.userId) : undefined,
    content: msg.content,
    parentId: msg.parentId || undefined,
    timestamp: Number(msg.timestamp) || Date.now(),
    isEdited: Boolean(msg.isEdited),
    editedAt: msg.editedAt ? Number(msg.editedAt) : undefined,
    replies: [],
  });

  // Polling function: fetch messages every 3 seconds
  const pollMessages = async (circleId: string) => {
    try {
      const freshMessages = await circleService.getMessages(circleId);
      const flatFresh = flattenMessages(freshMessages);
      
      // Find new messages not yet seen
      const newMessages = flatFresh.filter(m => !messageIdsRef.current.has(m.id));
      
      // Add them to the tree
      if (newMessages.length > 0) {
        newMessages.forEach(msg => {
          messageIdsRef.current.add(msg.id);
        });
        
        setMessages(prev => {
          let updated = prev;
          newMessages.forEach(msg => {
            updated = upsertMessage(updated, msg);
          });
          return updated;
        });
      }
    } catch (err) {
      console.error('Polling failed', err);
    }
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        
        // Fetch current user's database ID
        const profile = await apiClient.get('/api/me/profile');
        setCurrentUserId(profile.databaseId);
        
        const c = await circleService.getCircleById(id);
        if (!c) {
          navigate('/');
          return;
        }
        setCircle(c);

        const m = await circleService.getMembership(user.id, id);
        if (!m) {
          navigate('/');
          return;
        }
        setMembership(m);

        const msgs = await circleService.getMessages(id);
        setMessages(msgs);
        
        // Track message IDs for deduplication
        const flatMsgs = flattenMessages(msgs);
        messageIdsRef.current = new Set(flatMsgs.map(m => m.id));

        // Start polling for cross-device sync
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = setInterval(() => pollMessages(id), 3000);

        // Connect to WebSocket
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
        const token = localStorage.getItem('accessToken');
        if (token) {
          socketService.connect(apiUrl, token);
          socketService.joinCircle(id);
          
          // Listen for real-time messages
          socketService.onNewMessage((newMsg: any) => {
            const normalized = normalizeMessage(newMsg, id);
            messageIdsRef.current.add(normalized.id);
            setMessages((prev) => upsertMessage(prev, normalized));
          });

          socketService.onMessageUpdated((updatedMsg: any) => {
            const normalized = normalizeMessage(updatedMsg, id);
            normalized.isEdited = true;
            messageIdsRef.current.add(normalized.id);
            setMessages((prev) => upsertMessage(prev, normalized));
          });

          socketService.onUserJoined((data: any) => {
            setActiveUsers(data.totalActive);
          });

          socketService.onUserLeft((data: any) => {
            setActiveUsers(data.totalActive);
          });

          socketService.onMessageError((payload: any) => {
            setError(payload?.error || 'Failed to send message');
          });
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load circle');
      } finally {
        setLoading(false);
      }
    };
    load();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      socketService.offNewMessage();
      socketService.offMessageUpdated();
      socketService.offUserJoined();
      socketService.offUserLeft();
      socketService.offMessageError();
    };
  }, [id, user.id, navigate]);

  const handleSetReply = (msg: Message) => {
    setReplyingTo(msg);
    // Focus input and potentially pre-fill mention
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !circle || !membership) return;

    // If it's a reply, we can optionally prefix with mention if the user didn't
    let finalContent = content;
    if (replyingTo && !content.startsWith(`@${replyingTo.alias}`)) {
      // We don't force it, but the hierarchy handles the "mentioning" visually
    }

    try {
      const newMsg = await circleService.postMessage(circle.id, membership.id, membership.alias, finalContent, replyingTo?.id);
      setMessages((prev) => upsertMessage(prev, newMsg));
      setContent('');
      setReplyingTo(null);
    } catch (err: any) {
      setError(err.message || 'Failed to post');
    }
    
    // Smooth scroll to bottom for top-level posts, or just stay for nested?
    // Usually better to scroll slightly to show the new message
    setTimeout(() => {
      if (scrollRef.current && !replyingTo) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleReport = async (messageId: string) => {
    try {
      await circleService.reportMessage(messageId);
    } catch (err: any) {
      alert(err.message || 'Failed to report');
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await circleService.deleteMessage(messageId);
      // Remove deleted message from state
      setMessages((prev) => buildMessageTree(flattenMessages(prev).filter(m => m.id !== messageId)));
    } catch (err: any) {
      alert(err.message || 'Failed to delete message');
    }
  };

  const handleEdit = async (messageId: string, updatedContent: string) => {
    const edited = await circleService.editMessage(messageId, updatedContent);
    setMessages((prev) => upsertMessage(prev, edited));
  };

  const handleLeaveCircle = async () => {
    if (!id) return;
    try {
      await circleService.leaveCircle(id);
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Failed to leave circle');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-[#8d8a85]">Loading...</div>;
  }

  if (!circle || !membership) return null;

  const isCreator = circle.createdBy === user.id;

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto w-full pt-8 pb-4 px-4 overflow-hidden">
      {/* Circle Header */}
      <div className="glass p-6 rounded-[2.5rem] flex items-center justify-between mb-6 shrink-0 shadow-lg shadow-black/5 relative z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/40 rounded-full transition-all text-[#8d8a85]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold font-outfit text-[#2d1b10]">{circle.name}</h1>
            <div className="flex items-center gap-2">
              <span className="text-[#8d8a85] text-xs font-medium">Joined as</span>
              <span className="text-[#d4a373] text-xs font-bold">{membership.alias}</span>
              {activeUsers > 0 && (
                <span className="ml-2 px-2 py-1 bg-[#ccd5ae]/40 rounded-full text-[#5a6a3b] text-xs font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 bg-[#5a6a3b] rounded-full animate-pulse"></span>
                  {activeUsers} online
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setShowInfo(!showInfo)}
             title="Circle Info"
             className={`p-3 rounded-2xl transition-all ${showInfo ? 'bg-[#d4a373] text-white' : 'bg-white/40 hover:bg-white/60 text-[#8d8a85]'}`}
           >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
           </button>
           <button
             onClick={() => setShowLeaveModal(true)}
             title="Leave Group"
             className="px-4 py-2 bg-[#e07a5f]/10 hover:bg-[#e07a5f]/20 text-[#e07a5f] rounded-xl font-semibold transition-all flex items-center gap-2"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4.414l-4.293 4.293a1 1 0 01-1.414 0L4 7.414 5.414 6l3.293 3.293L13.586 6 15 7.414z" clipRule="evenodd" />
             </svg>
             Leave Group
           </button>
        </div>

        {/* Info Dropdown */}
        {showInfo && (
          <div className="absolute top-full right-0 mt-4 w-72 glass p-6 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h4 className="font-bold text-[#2d1b10] mb-2 font-outfit">Circle Details</h4>
            <p className="text-sm text-[#5c5852] mb-4">{circle.description}</p>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-[#8d8a85]">Type</span>
                <span className="font-bold uppercase text-[#d4a373]">{circle.type}</span>
              </div>
              {isCreator && circle.type === CircleType.PRIVATE && (
                <div className="p-3 bg-[#faedcd]/40 border border-[#d4a373]/20 rounded-xl">
                  <span className="block text-[10px] uppercase text-[#8d7535] font-bold mb-1">Passcode</span>
                  <code className="text-[#432818] font-bold text-sm tracking-widest">{circle.passwordHash}</code>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-8 scroll-smooth" ref={scrollRef}>
        {messages.length > 0 ? (
          messages.map(msg => (
            <Post
              key={msg.id}
              message={msg}
              onReply={handleSetReply}
              onReport={handleReport}
              onDelete={handleDelete}
              onEdit={handleEdit}
              currentUserId={currentUserId || undefined}
              editWindowMinutes={EDIT_WINDOW_MINUTES}
            />
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-60">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-[#d4a373]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-xl font-bold text-[#2d1b10]">The floor is yours...</h3>
            <p className="text-[#5c5852] font-medium">Speak your truth anonymously.</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 pt-4 z-10">
        <div className="relative">
          {error && <div className="text-red-500 text-xs text-center mb-2">{error}</div>}
          {replyingTo && (
            <div className="absolute bottom-full left-0 right-0 mb-[-1.5rem] pb-[1.5rem] animate-in slide-in-from-bottom-4 duration-300">
              <div className="glass mx-6 py-2 px-6 rounded-t-3xl border-b-0 flex items-center justify-between shadow-lg shadow-black/5 bg-[#faedcd]/80 backdrop-blur-xl">
                <div className="text-xs text-[#5c5852] flex items-center gap-2">
                  <span className="font-bold text-[#8d7535] uppercase tracking-wider text-[10px]">Replying specifically to</span>
                  <span className="text-[#d4a373] font-black">@{replyingTo.alias}</span>
                </div>
                <button 
                  onClick={() => setReplyingTo(null)} 
                  className="p-1 hover:bg-black/10 rounded-full text-[#8d8a85] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          <form 
            onSubmit={handleSubmit} 
            className={`glass p-3 flex gap-2 relative z-10 ${replyingTo ? 'rounded-b-[2.5rem] rounded-t-[1rem]' : 'rounded-[2.5rem]'} shadow-xl shadow-black/10 transition-all duration-300`}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder={replyingTo ? `Write a reply to @${replyingTo.alias}...` : "Start a new discussion..."}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 bg-transparent border-none focus:ring-0 px-5 py-4 placeholder:text-[#a3a19d] text-[#432818] font-medium"
            />
            <button
              type="submit"
              disabled={!content.trim()}
              className="px-8 py-4 bg-gradient-to-r from-[#d4a373] to-[#a98467] text-white disabled:from-[#e5e7eb] disabled:to-[#d1d5db] disabled:text-[#8d8a85] rounded-[1.8rem] transition-all flex items-center gap-3 font-bold shadow-lg shadow-[#d4a373]/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{replyingTo ? 'Reply' : 'Post'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${replyingTo ? 'rotate-0' : 'rotate-90'}`} viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </form>
        </div>
        
        {/* Helper text */}
        <p className="text-center text-[10px] text-[#a3a19d] mt-3 font-bold uppercase tracking-widest">
          {replyingTo ? "Mentioning is active" : "General chat is active"}
        </p>
      </div>

      {/* Leave Group Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm">
          <div className="max-w-md w-full glass p-8 rounded-[2.5rem] space-y-6 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-[#e07a5f]/10 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#e07a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold font-outfit text-[#2d1b10]">Leave Circle?</h2>
              <p className="text-[#5c5852] mt-2">
                Are you sure you want to leave <span className="font-bold text-[#d4a373]">{circle.name}</span>? You can rejoin later if you change your mind.
              </p>
            </div>
            
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-3 bg-white/40 rounded-xl text-[#5c5852] hover:bg-white/60 font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveCircle}
                className="flex-1 py-3 bg-[#e07a5f] rounded-xl text-white font-bold hover:bg-[#d16a4f] transition-all"
              >
                Yes, Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CircleView;
