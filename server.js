const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');

// --- CONFIGURATION FIRST ---
// Load environment variables from .env file BEFORE anything else
dotenv.config();

// --- THEN, IMPORT YOUR OWN FILES ---
const authRouter = require('./routes/authRoutes');
const workspaceRouter = require('./routes/workspaceRoutes');
const adminRouter = require('./routes/adminRoutes');
const redemptionRouter = require('./routes/redemptionRoutes');
const talentRouter = require('./routes/talentRoutes');
const hireRouter = require('./routes/hireRoutes');
const ratingRouter = require('./routes/ratingRoutes');
const servicePackageRouter = require('./routes/servicePackageRoutes');
const messageRouter = require('./routes/messageRoutes');
const jobPostingRouter = require('./routes/jobPostingRoutes');
const proposalRouter = require('./routes/proposalRoutes');
const taskRouter = require('./routes/taskRoutes');
const activityRouter = require('./routes/activityRoutes');
const connectionRouter = require('./routes/connectionRoutes');
const { initSocket } = require('./utils/socket');
const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE SETUP ---
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// --- API ROUTES ---
app.get('/', (req, res) => {
  res.send("<h1>SaaS Project Backend</h1><p>API is running...</p>");
});

// Health check endpoint for uptime monitoring (UptimeRobot, etc.)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/workspaces', workspaceRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/redemptions', redemptionRouter);
app.use('/api/v1/talent', talentRouter);
app.use('/api/v1/hires', hireRouter);
app.use('/api/v1/ratings', ratingRouter);
app.use('/api/v1/services', servicePackageRouter);
app.use('/api/v1/messages', messageRouter);
app.use('/api/v1/jobs', jobPostingRouter);
app.use('/api/v1/proposals', proposalRouter);
app.use('/api/v1/tasks', taskRouter);
app.use('/api/v1/activities', activityRouter);
app.use('/api/v1/connections', connectionRouter);

// --- STARTUP LOGIC ---
const startServer = async () => {
  console.log("Attempting to start the server..."); 
  try {
    if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
      console.error("❌ FATAL ERROR: Make sure MONGO_URI and JWT_SECRET are defined in your .env file.");
      process.exit(1);
    }
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Successfully connected to MongoDB!");

    // Create HTTP server and attach Socket.IO
    const httpServer = http.createServer(app);
    initSocket(httpServer);
    console.log("✅ Socket.IO initialized!");

    console.log("Starting Express server listener...");
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is LIVE and running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("❌ A startup error occurred:", error.message);
    process.exit(1);
  }
};

// Call the function to start the server
startServer();