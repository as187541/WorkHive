const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// --- CONFIGURATION FIRST ---
// Load environment variables from .env file BEFORE anything else
dotenv.config();

// --- THEN, IMPORT YOUR OWN FILES ---
const authRouter = require('./routes/authRoutes');
const workspaceRouter = require('./routes/workspaceRoutes');
const adminRouter = require('./routes/adminRoutes');
const redemptionRouter = require('./routes/redemptionRoutes');
const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE SETUP ---
app.use(cors());
app.use(express.json());

// --- API ROUTES ---
app.get('/', (req, res) => {
  res.send("<h1>SaaS Project Backend</h1><p>API is running...</p>");
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/workspaces', workspaceRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/redemptions', redemptionRouter);

// --- STARTUP LOGIC ---
const startServer = async () => {
  // ... your startServer function remains exactly the same
  console.log("Attempting to start the server..."); 
  try {
    if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
      console.error("❌ FATAL ERROR: Make sure MONGO_URI and JWT_SECRET are defined in your .env file.");
      process.exit(1);
    }
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Successfully connected to MongoDB!");

    console.log("Starting Express server listener...");
    app.listen(PORT, () => {
      console.log(`🚀 Server is LIVE and running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("❌ A startup error occurred:", error.message);
    process.exit(1);
  }
};

// Call the function to start the server
startServer();