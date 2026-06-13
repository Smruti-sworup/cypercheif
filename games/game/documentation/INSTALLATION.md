# Installation Guide - Ultimate Multiplayer Gaming Hub

This guide details steps to set up and run the Ultimate Multiplayer Gaming Hub on a local machine.

## Prerequisites
Ensure the following are installed:
- **Node.js**: Version 18.13.0 or higher
- **npm**: Version 8.19.3 or higher

---

## 1. Backend Server Setup
Navigate to the backend directory and install dependencies:
```bash
cd games/game/backend
npm install
```

### Environment Configurations
Create a `.env` file in `games/game/backend/` and configure:
```env
PORT=5000
JWT_SECRET=ultimate_gaming_hub_secret_key_123!
```

### Database Synchronization
The server uses **SQLite** with **Sequelize ORM**. 
On start, the server automatically syncs the models and seeds standard Achievements. No manual migration or seeding commands are required!

### Start Backend Dev Server
```bash
npm start
```
The server will bind and log:
`Ultimate Multiplayer Gaming Hub server running on port 5000`

---

## 2. Frontend React Client Setup
Open a new terminal, navigate to the frontend directory, and install dependencies:
```bash
cd games/game/frontend
npm install
```

### Start Frontend Dev Server
Run the Vite development server:
```bash
npm run dev
```
By default, the client is served at:
`http://localhost:5173/`

---

## 3. Testing Local Multi-Player Matches
To test multi-player matches on your local machine:
1. Open one window at `http://localhost:5173/` and register an account (e.g., `Player1`). Since this is the first registration, it becomes an **Admin** profile!
2. Open a separate browser tab or an Incognito window, visit `http://localhost:5173/` and register a second account (e.g., `Player2`).
3. Under `Player1`'s panel, select **Chess**, **Ludo**, or **Carrom**, toggle **Private Custom Room** to true, and click **Create Room**.
4. Copy the generated **Room Code** (e.g. `QM-XY3D`).
5. Under `Player2`'s panel, type the copied room code into **Join Lobby Room** and click **Join Custom Room**.
6. Set both players' ready states to **Ready** to start!
