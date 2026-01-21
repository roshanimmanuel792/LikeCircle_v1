import io, { Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const socketService = {
  connect: (apiBaseUrl: string, token: string) => {
    if (socket?.connected) return socket;

    socket = io(apiBaseUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return socket;
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  joinCircle: (circleId: string) => {
    socket?.emit('join-circle', circleId);
  },

  sendMessage: (circleId: string, content: string, parentId?: string) => {
    socket?.emit('send-message', { circleId, content, parentId: parentId || null });
  },

  onNewMessage: (callback: (message: any) => void) => {
    socket?.on('new-message', callback);
  },

  onUserJoined: (callback: (data: any) => void) => {
    socket?.on('user-joined', callback);
  },

  onUserLeft: (callback: (data: any) => void) => {
    socket?.on('user-left', callback);
  },

  onMessageUpdated: (callback: (data: any) => void) => {
    socket?.on('message-updated', callback);
  },

  onMessageError: (callback: (error: any) => void) => {
    socket?.on('message-error', callback);
  },

  offNewMessage: () => {
    socket?.off('new-message');
  },

  offUserJoined: () => {
    socket?.off('user-joined');
  },

  offUserLeft: () => {
    socket?.off('user-left');
  },

  offMessageUpdated: () => {
    socket?.off('message-updated');
  },

  offMessageError: () => {
    socket?.off('message-error');
  },

  getSocket: () => socket,
};
