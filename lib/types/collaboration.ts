import type { Feature, FeatureCollection } from 'geojson';

// User in a collaboration session
export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  cursor?: {
    x: number;
    y: number;
    lng: number;
    lat: number;
  };
  lastActive: number;
}

// Collaboration session
export interface CollaborationSession {
  id: string;
  name: string;
  created: string;
  createdBy: string;
  users: CollaborationUser[];
}

// Event types for real-time sync
export type CollaborationEventType =
  | 'user:join'
  | 'user:leave'
  | 'cursor:move'
  | 'feature:create'
  | 'feature:update'
  | 'feature:delete'
  | 'layer:create'
  | 'layer:update'
  | 'layer:delete'
  | 'view:change'
  | 'chat:message';

// Base event structure
export interface CollaborationEvent {
  type: CollaborationEventType;
  userId: string;
  timestamp: number;
}

// Specific event types
export interface UserJoinEvent extends CollaborationEvent {
  type: 'user:join';
  user: CollaborationUser;
}

export interface UserLeaveEvent extends CollaborationEvent {
  type: 'user:leave';
}

export interface CursorMoveEvent extends CollaborationEvent {
  type: 'cursor:move';
  cursor: {
    x: number;
    y: number;
    lng: number;
    lat: number;
  };
}

export interface FeatureCreateEvent extends CollaborationEvent {
  type: 'feature:create';
  layerId: string;
  feature: Feature;
}

export interface FeatureUpdateEvent extends CollaborationEvent {
  type: 'feature:update';
  layerId: string;
  featureId: string;
  feature: Feature;
}

export interface FeatureDeleteEvent extends CollaborationEvent {
  type: 'feature:delete';
  layerId: string;
  featureId: string;
}

export interface LayerCreateEvent extends CollaborationEvent {
  type: 'layer:create';
  layer: {
    id: string;
    name: string;
    type: string;
    geometryType: string;
    data: FeatureCollection;
  };
}

export interface LayerUpdateEvent extends CollaborationEvent {
  type: 'layer:update';
  layerId: string;
  updates: Partial<{
    name: string;
    visible: boolean;
    opacity: number;
  }>;
}

export interface LayerDeleteEvent extends CollaborationEvent {
  type: 'layer:delete';
  layerId: string;
}

export interface ViewChangeEvent extends CollaborationEvent {
  type: 'view:change';
  center: [number, number];
  zoom: number;
}

export interface ChatMessageEvent extends CollaborationEvent {
  type: 'chat:message';
  message: string;
  userName: string;
}

// Union type of all events
export type CollaborationEventData =
  | UserJoinEvent
  | UserLeaveEvent
  | CursorMoveEvent
  | FeatureCreateEvent
  | FeatureUpdateEvent
  | FeatureDeleteEvent
  | LayerCreateEvent
  | LayerUpdateEvent
  | LayerDeleteEvent
  | ViewChangeEvent
  | ChatMessageEvent;

// Supabase realtime message format
export interface RealtimeMessage {
  event: string;
  payload: CollaborationEventData;
}

// User colors for collaboration
export const COLLABORATION_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
];

// Get a color for a user based on their ID
export function getUserColor(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLLABORATION_COLORS[hash % COLLABORATION_COLORS.length];
}
