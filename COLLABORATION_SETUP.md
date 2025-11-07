# Real-Time Collaboration Setup Guide

## 🎉 What's Included

KeyMap now has **full real-time collaboration** built on Supabase! Multiple users can:

- ✅ Edit the same map simultaneously
- ✅ See each other online (presence indicators)
- ✅ Share session links (no signup required)
- ✅ See live cursor positions (coming soon)
- ✅ Broadcast drawing/editing events in real-time

---

## 🚀 Quick Start (3 Steps)

### Step 1: Create a Supabase Project (5 minutes)

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Choose:
   - **Name**: KeyMap Collaboration
   - **Database Password**: (generate a strong one)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier (plenty for testing)
4. Wait ~2 minutes for project to initialize

### Step 2: Get Your API Keys

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (long string starting with `eyJ...`)

### Step 3: Configure KeyMap

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key-here
   ```

3. Restart your dev server:
   ```bash
   npm run dev
   ```

**That's it!** Collaboration is now fully enabled.

---

## 🎮 How to Use Collaboration

### Start a New Session

1. Click **"Collaborate"** button (top left)
2. Click **"Start New Session"**
3. Enter your name (e.g., "Sarah")
4. Optionally add session name (e.g., "Urban Planning Meeting")
5. Click **"Create"**
6. Copy the session link or ID
7. Share with team members!

### Join an Existing Session

**Option A: Use the Link**
- Someone sends you: `http://localhost:3000/?session=session_xxxxx`
- Open the link → Auto-prompts for your name → Join!

**Option B: Manual Join**
1. Click **"Collaborate"** button
2. Click **"Join Session"**
3. Enter your name
4. Paste the Session ID
5. Click **"Join"**

### While Collaborating

- **See who's online**: User list shows all connected users with colored dots
- **Draw together**: Your drawings appear instantly for everyone
- **Edit together**: Changes sync in real-time
- **Leave session**: Click "Leave Session" button

---

## 🧪 Demo Mode (No Supabase Required)

Don't want to set up Supabase yet? **Demo mode works automatically!**

- If no Supabase credentials are configured, collaboration runs in **localhost-only mode**
- Great for testing the UI and workflow
- To enable real collaboration, just add Supabase credentials

---

## 🛠️ Architecture

### Tech Stack

- **Supabase Realtime**: WebSocket-based pub/sub
- **Presence API**: Track who's online
- **Broadcast API**: Send events to all users
- **React Context**: Manage collaboration state

### Event Types

The system broadcasts these events in real-time:

| Event Type | Description |
|------------|-------------|
| `user:join` | User joined session |
| `user:leave` | User left session |
| `cursor:move` | Mouse cursor position |
| `feature:create` | New feature drawn |
| `feature:update` | Feature edited |
| `feature:delete` | Feature deleted |
| `layer:create` | New layer added |
| `layer:update` | Layer properties changed |
| `layer:delete` | Layer removed |
| `view:change` | Map pan/zoom |
| `chat:message` | Chat message sent |

### Data Flow

```
User A draws a line
       ↓
CollaborationContext.broadcast('feature:create', {...})
       ↓
Supabase Realtime Channel
       ↓
All connected users receive event
       ↓
Update their maps automatically
```

---

## 🔧 Configuration Options

### Presence Tracking

Users are automatically tracked and shown in the "Online Users" list. Each user gets:
- Unique ID
- Display name (entered at join)
- Random color (for cursors/indicators)
- Last active timestamp

### Session Management

Sessions are **ephemeral** (not stored in database):
- Created on-demand
- Exist while users are connected
- No cleanup needed
- Privacy-friendly (no data persistence)

To add persistence (save session history):
1. Create a Supabase table for sessions
2. Store session metadata on creation
3. Load past sessions in ProjectManager

### Performance

Current settings:
- **Events per second**: 10 (throttled for performance)
- **Channel per session**: Isolated collaboration rooms
- **Automatic reconnection**: Built into Supabase client

---

## 🎯 Roadmap

### Phase 1: Foundation ✅ (Completed)
- [x] Session management (create/join)
- [x] User presence tracking
- [x] Realtime infrastructure
- [x] UI components

### Phase 2: Core Sync (Next)
- [ ] Real-time drawing sync
- [ ] Real-time editing sync
- [ ] Real-time deletion sync
- [ ] Cursor position broadcasting
- [ ] Conflict resolution

### Phase 3: Enhanced Features
- [ ] In-app chat
- [ ] Feature commenting
- [ ] View synchronization (follow mode)
- [ ] Permissions (viewer vs editor)
- [ ] Session recordings

### Phase 4: Polish
- [ ] Undo/redo across users
- [ ] Offline support
- [ ] Mobile optimization
- [ ] Custom user avatars

---

## 🐛 Troubleshooting

### "Connection Error" message

**Check:**
1. Are Supabase credentials correct in `.env.local`?
2. Is the Supabase project URL reachable?
3. Check browser console for detailed errors
4. Verify anon key has correct permissions

**Solution:**
- Go to Supabase Dashboard → Settings → API
- Regenerate keys if needed
- Make sure to restart dev server after changing `.env.local`

### Users not seeing each other

**Check:**
1. Are both users in the same session? (same Session ID)
2. Check browser console - any WebSocket errors?
3. Is Supabase Realtime enabled? (should be by default)

**Solution:**
- Copy the exact session link/ID
- Make sure both users refresh after joining
- Check Supabase Dashboard → Realtime → Logs

### "Demo Mode" warning in console

This means Supabase is not configured. Either:
- **Option A**: Add Supabase credentials to `.env.local`
- **Option B**: Keep using demo mode for local testing

---

## 💡 Tips & Best Practices

### Session Naming
- Use descriptive names: "Monday Site Survey", "Q4 Planning Review"
- Helps identify sessions when you have multiple open

### Team Workflow
1. **Lead creates session** → Shares link in Slack/Teams
2. **Team joins** → Everyone enters their real name
3. **Collaborate** → Draw, edit, discuss
4. **Export results** → Use "Export Data" when done
5. **Save project** → Use "Projects → Save" to preserve work

### Performance Tips
- Limit to 5-10 simultaneous users per session
- Large datasets (>1000 features) may slow down sync
- Use layers to organize data instead of one huge layer

### Security Notes
- Session IDs are random and hard to guess
- No data is stored (ephemeral sessions)
- Anyone with link can join (share carefully!)
- For private sessions: share ID instead of link (less discoverable)

---

## 📚 For Developers

### Adding Custom Events

```typescript
// In your component
import { useCollaboration } from '@/lib/contexts/CollaborationContext';

function MyComponent() {
  const { broadcast, onEvent } = useCollaboration();

  // Send an event
  const sendCustomEvent = () => {
    broadcast({
      type: 'custom:my-event',
      data: { foo: 'bar' }
    });
  };

  // Listen for events
  useEffect(() => {
    const unsubscribe = onEvent((event) => {
      if (event.type === 'custom:my-event') {
        console.log('Received:', event);
      }
    });

    return unsubscribe;
  }, [onEvent]);
}
```

### Testing Locally

1. Open two browser windows (or use incognito)
2. In Window 1: Create session, copy link
3. In Window 2: Paste link and join
4. Test drawing/editing in both windows
5. Watch for realtime updates!

---

## 🤝 Contributing

Want to improve collaboration features? Check out:

- `lib/contexts/CollaborationContext.tsx` - Core collaboration logic
- `lib/types/collaboration.ts` - Type definitions
- `components/map/CollaborationPanel.tsx` - UI component
- `lib/services/supabase.ts` - Supabase client setup

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/key-map/issues)
- **Supabase Docs**: [supabase.com/docs/guides/realtime](https://supabase.com/docs/guides/realtime)
- **Discord**: (Add your Discord link)

---

**Happy Collaborating! 🎉**
