
import { Circle, CircleType, Membership, Message, User } from '../types';
import { ADJECTIVES, NOUNS } from '../constants';

const CIRCLES_KEY = 'likecircle_circles';
const MEMBERSHIPS_KEY = 'likecircle_memberships';
const MESSAGES_KEY = 'likecircle_messages';

export const circleService = {
  getCircles: (): Circle[] => {
    const data = localStorage.getItem(CIRCLES_KEY);
    return data ? JSON.parse(data) : [];
  },

  getCircleById: (id: string): Circle | undefined => {
    return circleService.getCircles().find(c => c.id === id);
  },

  createCircle: (name: string, description: string, type: CircleType, password?: string, userId?: string): Circle => {
    const circles = circleService.getCircles();
    const newCircle: Circle = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      description,
      type,
      passwordHash: type === CircleType.PRIVATE ? password : undefined, // In real apps, use proper hashing
      createdBy: userId || 'unknown',
      createdAt: Date.now(),
      memberCount: 0
    };
    circles.push(newCircle);
    localStorage.setItem(CIRCLES_KEY, JSON.stringify(circles));
    return newCircle;
  },

  getMembership: (userId: string, circleId: string): Membership | null => {
    const memberships: Membership[] = JSON.parse(localStorage.getItem(MEMBERSHIPS_KEY) || '[]');
    return memberships.find(m => m.userId === userId && m.circleId === circleId) || null;
  },

  joinCircle: (userId: string, circleId: string, password?: string): Membership => {
    const circle = circleService.getCircleById(circleId);
    if (!circle) throw new Error('Circle not found');
    
    if (circle.type === CircleType.PRIVATE && circle.passwordHash !== password) {
      throw new Error('Incorrect password');
    }

    const existing = circleService.getMembership(userId, circleId);
    if (existing) return existing;

    const memberships: Membership[] = JSON.parse(localStorage.getItem(MEMBERSHIPS_KEY) || '[]');
    
    // Generate Random Alias
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 100);
    const alias = `${adj}_${noun}_${num}`;

    const newMembership: Membership = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      circleId,
      alias,
      joinedAt: Date.now()
    };

    memberships.push(newMembership);
    localStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(memberships));

    // Increment member count
    const circles = circleService.getCircles();
    const updatedCircles = circles.map(c => c.id === circleId ? { ...c, memberCount: (c.memberCount || 0) + 1 } : c);
    localStorage.setItem(CIRCLES_KEY, JSON.stringify(updatedCircles));

    return newMembership;
  },

  getMessages: (circleId: string): Message[] => {
    const allMessages: Message[] = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
    const circleMessages = allMessages.filter(m => m.circleId === circleId);
    
    // Simple tree conversion logic for threading
    const messageMap = new Map<string, Message>();
    circleMessages.forEach(m => messageMap.set(m.id, { ...m, replies: [] }));
    
    const rootMessages: Message[] = [];
    circleMessages.forEach(m => {
      const msgWithReplies = messageMap.get(m.id)!;
      if (m.parentId) {
        const parent = messageMap.get(m.parentId);
        if (parent) {
          parent.replies?.push(msgWithReplies);
        } else {
          rootMessages.push(msgWithReplies);
        }
      } else {
        rootMessages.push(msgWithReplies);
      }
    });

    return rootMessages.sort((a, b) => b.timestamp - a.timestamp);
  },

  postMessage: (circleId: string, membershipId: string, alias: string, content: string, parentId?: string): Message => {
    const allMessages: Message[] = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      circleId,
      membershipId,
      alias,
      content,
      parentId,
      timestamp: Date.now()
    };
    allMessages.push(newMessage);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(allMessages));
    return newMessage;
  }
};
