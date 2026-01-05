
import { Circle, CircleType, Membership, Message } from '../types';
import { apiClient } from './apiClient';

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

export const circleService = {
  getCircles: async (): Promise<Circle[]> => {
    const { circles } = await apiClient.get('/api/circles');
    return circles;
  },

  discoverCircles: async (search?: string): Promise<Circle[]> => {
    const path = search ? `/api/circles/discover?search=${encodeURIComponent(search)}` : '/api/circles/discover';
    const { circles } = await apiClient.get(path);
    return circles;
  },

  getCircleById: async (id: string): Promise<Circle | null> => {
    const res = await apiClient.get(`/api/circles/${id}`);
    return res.circle ?? null;
  },

  createCircle: async (name: string, description: string, type: CircleType, password?: string): Promise<Circle> => {
    const { circle } = await apiClient.post('/api/circles', { name, description, type, password });
    return circle;
  },

  getMembership: async (_userId: string, circleId: string): Promise<Membership | null> => {
    try {
      const { membership } = await apiClient.get(`/api/circles/${circleId}/membership`);
      return membership;
    } catch (error: any) {
      if (error.message.includes('Not a member') || error.message.includes('404')) return null;
      throw error;
    }
  },

  joinCircle: async (_userId: string, circleId: string, password?: string): Promise<Membership> => {
    const { membership } = await apiClient.post(`/api/circles/${circleId}/join`, { password });
    return membership;
  },

  getMessages: async (circleId: string): Promise<Message[]> => {
    const { messages } = await apiClient.get(`/api/circles/${circleId}/messages`);
    return buildMessageTree(messages);
  },

  postMessage: async (circleId: string, membershipId: string, alias: string, content: string, parentId?: string): Promise<Message> => {
    const { message } = await apiClient.post(`/api/circles/${circleId}/messages`, { content, parentId });
    return { ...message, membershipId, alias, replies: [] };
  },

  reportMessage: async (messageId: string): Promise<void> => {
    await apiClient.post(`/api/messages/${messageId}/report`);
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await apiClient.delete(`/api/messages/${messageId}`);
  }
};
