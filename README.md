# ETHS Decision Tree Builder - Collaborative Editor

An interactive, real-time collaborative code editor for building decision trees with HTML, CSS, and JavaScript. Features live collaboration similar to Google Docs with Kahoot-style room codes!

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

## Features

### Core Editing
- **Multi-tab Editor**: Separate tabs for HTML, CSS, and JavaScript
- **Live Preview**: Instant preview of your decision tree
- **Syntax Highlighting**: Visual feedback for code errors
- **Smart Autocomplete**: Context-aware code completion
- **Emoji Support**: Type `:emoji_name:` to insert emojis (e.g., `:fire:` 🔥)
- **Auto-save**: Automatic saving to local storage
- **Import/Export**: Save and load your projects

### Real-Time Collaboration ⭐

The standout feature of this editor is real-time collaboration:

- **Room Creation**: Generate a unique 6-character room code (like Kahoot!)
- **Easy Joining**: Others can join using the room code
- **Live Sync**: All code changes sync in real-time across all participants
- **Participant List**: See everyone currently editing (like Google Docs)
- **Color-coded Users**: Each participant gets a unique color indicator
- **Instant Notifications**: Get notified when people join or leave
- **Persistent Sessions**: Room state is maintained as long as someone is connected

## Quick Start

### Prerequisites

- Node.js >= 14.0.0
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd EditorETHS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Development Mode

For development with auto-restart on file changes:

```bash
npm run dev
```

## How to Use Collaboration

### Creating a Room

1. Click the **👥 Collaborate** button in the header
2. Click **OK** when asked if you want to create a new room
3. Enter your name
4. You'll receive a **unique 6-character room code**
5. Share this code with your collaborators!

### Joining a Room

1. Click the **👥 Collaborate** button in the header
2. Click **Cancel** when asked if you want to create a new room
3. Enter the room code shared with you
4. Enter your name
5. You're in! You'll see all other participants in the panel

### Collaboration Features

- **Room Code Display**: The active room code is prominently displayed in the top-right
- **Copy to Clipboard**: Click the 📋 button to copy the room code
- **Participants Panel**: See all active collaborators with their colored indicators
- **Real-time Updates**: Code changes sync instantly across all participants
- **Leave Session**: Click the **🔴 Leave** button to exit the collaboration

### Sharing via URL

You can also share a direct join link:
```
http://your-domain.com/?room=ROOMCODE
```

Replace `ROOMCODE` with your actual room code. When someone opens this link, they'll be prompted to enter their name and will join automatically.

## Project Structure

```
EditorETHS/
├── index.html          # Main application (frontend + UI)
├── server.js           # Node.js server with Socket.IO
├── package.json        # Dependencies and scripts
├── render.yaml         # Render deployment configuration
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## Deployment on Render

This application is configured for easy deployment on [Render](https://render.com).

### Automatic Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create a Render Account**
   - Go to [render.com](https://render.com) and sign up

3. **Deploy from Repository**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file
   - Click "Create Web Service"

4. **Access Your App**
   - Once deployed, Render will provide a URL like `https://your-app.onrender.com`
   - Share this URL with your users!

### Manual Configuration (Alternative)

If not using `render.yaml`:

- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: Node
- **Plan**: Free (or upgrade as needed)

### Environment Variables

The application works with default settings, but you can customize:

- `PORT`: Server port (default: 3000, Render auto-assigns)
- `NODE_ENV`: Set to `production` for production builds

## Technical Details

### Backend Architecture

- **Express.js**: Web server framework
- **Socket.IO**: WebSocket library for real-time communication
- **Room Management**: In-memory storage of active rooms and participants
- **Auto-cleanup**: Rooms are automatically cleaned up 1 hour after being empty

### Frontend Architecture

- **Pure JavaScript**: No frameworks, vanilla JS for maximum compatibility
- **Socket.IO Client**: Real-time bidirectional communication
- **Local Storage**: Project persistence
- **Responsive Design**: Works on desktop and tablet

### Real-time Protocol

The collaboration uses Socket.IO events:

- `create-room`: Create a new collaboration room
- `join-room`: Join an existing room
- `code-change`: Broadcast code changes
- `cursor-move`: Share cursor positions
- `participant-joined`: New participant notification
- `participant-left`: Participant departure notification

## Browser Compatibility

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ⚠️ IE11 (limited support)

## Troubleshooting

### Port Already in Use

If port 3000 is in use:
```bash
PORT=3001 npm start
```

### Cannot Connect to Server

- Check if the server is running
- Verify firewall settings
- Ensure WebSocket connections are allowed

### Room Not Found

- Room codes are case-insensitive but must be exact
- Rooms expire after 1 hour of being empty
- Try creating a new room

### Code Not Syncing

- Check your internet connection
- Verify you're in the same room (check the room code)
- Try refreshing the page and rejoining

### Browser Extension Errors (Grammarly, Iterable, etc.)

If you see errors in the console like:
```
grm ERROR [iterable] Not supported: in app messages from Iterable
```

**This is NOT a bug in the application!** These errors come from browser extensions (Grammarly, Iterable, email tools, etc.) and can be safely ignored. They do not affect the collaboration functionality.

**To eliminate these errors:**
- Test in Incognito/Private mode (extensions are usually disabled)
- Temporarily disable browser extensions
- Or simply ignore them - they won't affect your experience

## Development

### Adding New Features

The codebase is organized into clear sections:

1. **HTML Structure** (line ~730): Header, menus, panels
2. **CSS Styles** (line ~7): All styling
3. **Core Editor Logic** (line ~880): Code editing functionality
4. **Collaboration System** (line ~2920): Real-time collaboration

### Testing Locally

To test collaboration locally:

1. Start the server
2. Open two browser windows
3. In the first, create a room
4. In the second, join using the room code
5. Make changes in either window and see them sync!

## Performance

- **Lightweight**: ~3MB total including all assets
- **Fast Sync**: Sub-100ms latency for local networks
- **Scalable**: Handles multiple concurrent rooms
- **Efficient**: Uses WebSocket for minimal overhead

## Security Notes

- Rooms use random 6-character codes (36^6 = 2+ billion combinations)
- No authentication required (designed for educational use)
- Code is not persisted server-side (privacy by design)
- For production use, consider adding authentication

## Future Enhancements

Potential features to add:

- [ ] Cursor position indicators (Google Docs style)
- [ ] Chat functionality
- [ ] Voice chat integration
- [ ] Project templates library
- [ ] Code history/undo across sessions
- [ ] Room passwords for private sessions
- [ ] Persistent rooms with database storage
- [ ] User authentication (OAuth, etc.)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section above

## License

MIT License - feel free to use this project for educational purposes.

## Acknowledgments

Built for ETHS (Evanston Township High School) educational purposes.

---

**Made with ❤️ for collaborative learning**

Start collaborating now by clicking the 👥 Collaborate button!
