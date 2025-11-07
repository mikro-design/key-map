'use client';

import { useState } from 'react';
import { useCollaboration } from '@/lib/contexts/CollaborationContext';
import { toast } from 'sonner';

export default function CollaborationPanel() {
  const {
    session,
    isConnected,
    currentUser,
    users,
    createSession,
    joinSession,
    leaveSession,
  } = useCollaboration();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [userName, setUserName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleCreateSession = async () => {
    if (!userName.trim()) {
      toast.error('Name required', { description: 'Please enter your name' });
      return;
    }

    try {
      const newSessionId = await createSession(userName, sessionName || undefined);
      setMode('menu');
      setUserName('');
      setSessionName('');
      setShowShareDialog(true);
    } catch (error: any) {
      toast.error('Failed to create session', { description: error.message });
    }
  };

  const handleJoinSession = async () => {
    if (!userName.trim()) {
      toast.error('Name required', { description: 'Please enter your name' });
      return;
    }

    if (!sessionId.trim()) {
      toast.error('Session ID required', { description: 'Please enter a session ID' });
      return;
    }

    try {
      await joinSession(sessionId, userName);
      setMode('menu');
      setUserName('');
      setSessionId('');
    } catch (error: any) {
      toast.error('Failed to join session', { description: error.message });
    }
  };

  const copySessionLink = () => {
    if (!session) return;

    const link = `${window.location.origin}/?session=${session.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied', { description: 'Share this link with collaborators' });
  };

  const copySessionId = () => {
    if (!session) return;

    navigator.clipboard.writeText(session.id);
    toast.success('Session ID copied', { description: 'Share this ID with collaborators' });
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow border flex items-center gap-2 ${
            isConnected
              ? 'bg-green-600 text-white border-green-500'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}
          title="Collaboration"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span className="text-sm font-medium">
            {isConnected ? `Collaborate (${users.length})` : 'Collaborate'}
          </span>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            <div className="absolute top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 w-96">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Real-Time Collaboration
                </h3>
              </div>

              {/* Content */}
              <div className="p-4">
                {!session && mode === 'menu' && (
                  <div className="space-y-3">
                    <button
                      onClick={() => setMode('create')}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Start New Session
                    </button>

                    <button
                      onClick={() => setMode('join')}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                        />
                      </svg>
                      Join Session
                    </button>

                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <strong>💡 Tip:</strong> Real-time collaboration lets multiple users edit the same map
                      simultaneously. Everyone sees changes instantly!
                    </div>
                  </div>
                )}

                {!session && mode === 'create' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Session Name (optional)
                      </label>
                      <input
                        type="text"
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        placeholder="Urban Planning Meeting"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setMode('menu')}
                        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleCreateSession}
                        disabled={!userName.trim()}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                )}

                {!session && mode === 'join' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        onKeyPress={(e) => e.key === 'Enter' && handleJoinSession()}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Session ID *
                      </label>
                      <input
                        type="text"
                        value={sessionId}
                        onChange={(e) => setSessionId(e.target.value)}
                        placeholder="session_xxxxx_xxxxx"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && handleJoinSession()}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setMode('menu')}
                        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleJoinSession}
                        disabled={!userName.trim() || !sessionId.trim()}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                )}

                {session && (
                  <div className="space-y-3">
                    {/* Session Info */}
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="font-semibold text-sm">Connected</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <div className="font-medium">{session.name}</div>
                        <div className="font-mono mt-1 text-[10px]">{session.id}</div>
                      </div>
                    </div>

                    {/* Online Users */}
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Online Users ({users.length})
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {users.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: user.color }}
                            ></div>
                            <span className="text-sm">
                              {user.name}
                              {user.id === currentUser?.id && ' (You)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={copySessionLink}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        Copy Link
                      </button>
                      <button
                        onClick={copySessionId}
                        className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
                      >
                        Copy ID
                      </button>
                    </div>

                    <button
                      onClick={leaveSession}
                      className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                    >
                      Leave Session
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Share Dialog Popup */}
      {showShareDialog && session && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/50" onClick={() => setShowShareDialog(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-96 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-4">🎉 Session Created!</h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Share this link with others to start collaborating:
            </p>

            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-4 font-mono text-xs break-all">
              {window.location.origin}/?session={session.id}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  copySessionLink();
                  setShowShareDialog(false);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Copy Link
              </button>
              <button
                onClick={() => setShowShareDialog(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
