'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isDemoMode, createDemoChannel } from '@/lib/services/supabase';
import {
  CollaborationUser,
  CollaborationSession,
  CollaborationEventData,
  CollaborationEventType,
  getUserColor,
} from '@/lib/types/collaboration';
import { toast } from 'sonner';

interface CollaborationContextType {
  // Session state
  session: CollaborationSession | null;
  isConnected: boolean;
  currentUser: CollaborationUser | null;
  users: CollaborationUser[];

  // Session management
  createSession: (userName: string, sessionName?: string) => Promise<string>;
  joinSession: (sessionId: string, userName: string) => Promise<void>;
  leaveSession: () => void;

  // Event broadcasting
  broadcast: (event: Omit<CollaborationEventData, 'userId' | 'timestamp'>) => void;

  // Event subscription
  onEvent: (callback: (event: CollaborationEventData) => void) => () => void;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export function CollaborationProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<CollaborationUser | null>(null);
  const [users, setUsers] = useState<CollaborationUser[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const eventCallbacksRef = useRef<((event: CollaborationEventData) => void)[]>([]);

  // Generate unique user ID
  const generateUserId = useCallback(() => {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Generate session ID
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Create a new collaboration session
  const createSession = useCallback(
    async (userName: string, sessionName?: string): Promise<string> => {
      const sessionId = generateSessionId();
      const userId = generateUserId();

      const newUser: CollaborationUser = {
        id: userId,
        name: userName,
        color: getUserColor(userId),
        lastActive: Date.now(),
      };

      const newSession: CollaborationSession = {
        id: sessionId,
        name: sessionName || `Session ${new Date().toLocaleTimeString()}`,
        created: new Date().toISOString(),
        createdBy: userId,
        users: [newUser],
      };

      setCurrentUser(newUser);
      setSession(newSession);
      setUsers([newUser]);

      // Connect to Supabase channel
      await connectToChannel(sessionId, newUser);

      toast.success('Session created', {
        description: 'Share the session link with others to collaborate',
      });

      return sessionId;
    },
    [generateUserId, generateSessionId]
  );

  // Join an existing session
  const joinSession = useCallback(
    async (sessionId: string, userName: string) => {
      const userId = generateUserId();

      const newUser: CollaborationUser = {
        id: userId,
        name: userName,
        color: getUserColor(userId),
        lastActive: Date.now(),
      };

      setCurrentUser(newUser);

      // Connect to Supabase channel
      await connectToChannel(sessionId, newUser);

      toast.success('Joined session', {
        description: `Connected as ${userName}`,
      });
    },
    [generateUserId]
  );

  // Connect to Supabase Realtime channel
  const connectToChannel = async (sessionId: string, user: CollaborationUser) => {
    try {
      // Disconnect existing channel
      if (channelRef.current) {
        await channelRef.current.unsubscribe();
      }

      // Create new channel
      const channel = isDemoMode
        ? createDemoChannel(`collaboration:${sessionId}`)
        : supabase.channel(`collaboration:${sessionId}`, {
            config: {
              presence: {
                key: user.id,
              },
            },
          });

      if (!isDemoMode) {
        // Subscribe to presence events (who's online)
        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const onlineUsers = Object.values(state).flat() as CollaborationUser[];
            setUsers(onlineUsers);
          })
          .on('presence', { event: 'join' }, ({ newPresences }: any) => {
            const newUsers = newPresences as CollaborationUser[];
            newUsers.forEach((user) => {
              toast.info(`${user.name} joined`, {
                description: 'Now collaborating',
              });
            });
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
            const leftUsers = leftPresences as CollaborationUser[];
            leftUsers.forEach((user) => {
              toast.info(`${user.name} left`, {
                description: 'Session ended',
              });
            });
          })
          // Subscribe to broadcast events
          .on('broadcast', { event: 'collaboration-event' }, ({ payload }: any) => {
            const event = payload as CollaborationEventData;

            // Don't process our own events
            if (event.userId === user.id) return;

            // Call all registered callbacks
            eventCallbacksRef.current.forEach((callback) => callback(event));
          })
          .subscribe(async (status: any) => {
            if (status === 'SUBSCRIBED') {
              // Track presence
              await channel.track(user);
              setIsConnected(true);
              console.log('✅ Connected to collaboration session:', sessionId);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              setIsConnected(false);
              toast.error('Connection error', {
                description: 'Failed to connect to collaboration session',
              });
            }
          });
      } else {
        // Demo mode - just mark as connected
        setIsConnected(true);
        setUsers([user]);
      }

      channelRef.current = channel;
    } catch (error: any) {
      console.error('Failed to connect to channel:', error);
      toast.error('Connection failed', {
        description: error.message || 'Could not connect to collaboration session',
      });
    }
  };

  // Broadcast an event to all users
  const broadcast = useCallback(
    (event: Omit<CollaborationEventData, 'userId' | 'timestamp'>) => {
      if (!channelRef.current || !currentUser || !isConnected) return;

      const fullEvent: CollaborationEventData = {
        ...event,
        userId: currentUser.id,
        timestamp: Date.now(),
      } as CollaborationEventData;

      if (isDemoMode) {
        // In demo mode, just call local callbacks
        eventCallbacksRef.current.forEach((callback) => callback(fullEvent));
      } else {
        // Broadcast to Supabase channel
        channelRef.current.send({
          type: 'broadcast',
          event: 'collaboration-event',
          payload: fullEvent,
        });
      }
    },
    [currentUser, isConnected]
  );

  // Subscribe to events
  const onEvent = useCallback((callback: (event: CollaborationEventData) => void) => {
    eventCallbacksRef.current.push(callback);

    // Return unsubscribe function
    return () => {
      eventCallbacksRef.current = eventCallbacksRef.current.filter((cb) => cb !== callback);
    };
  }, []);

  // Leave session
  const leaveSession = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    setSession(null);
    setCurrentUser(null);
    setUsers([]);
    setIsConnected(false);

    toast.info('Left session', {
      description: 'Collaboration ended',
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  const value: CollaborationContextType = {
    session,
    isConnected,
    currentUser,
    users,
    createSession,
    joinSession,
    leaveSession,
    broadcast,
    onEvent,
  };

  return <CollaborationContext.Provider value={value}>{children}</CollaborationContext.Provider>;
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborationProvider');
  }
  return context;
}
