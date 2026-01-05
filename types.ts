
export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

export enum CircleType {
  PUBLIC = 'public',
  PRIVATE = 'private'
}

export interface Circle {
  id: string;
  name: string;
  description: string;
  type: CircleType;
  passwordHash?: string;
  createdBy: string;
  createdAt: number;
  memberCount: number;
}

export interface Membership {
  id: string;
  userId: string;
  circleId: string;
  alias: string;
  joinedAt: number;
}

export interface Message {
  id: string;
  circleId: string;
  membershipId: string;
  alias: string; // Denormalized for quick display
  avatar?: string; // User's profile picture
  userId?: string; // User ID for ownership check
  content: string;
  parentId?: string; // For nesting
  timestamp: number;
  replies?: Message[];
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
}
