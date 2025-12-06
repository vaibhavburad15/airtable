
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const authRoutes = require('./routes/auth');
const formRoutes = require('./routes/forms');
const webhookRoutes = require('./routes/webhooks');
const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/airtable_clone';
const PORT = process.env.PORT || 5000;
mongoose
  .connect(MONGODB_URI) 
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));
app.use('/api/auth', authRoutes);
app.use('/api/forms', upload.any(), formRoutes);
app.use('/webhooks/airtable', webhookRoutes);
app.get('/', (req, res) => {
  res.send('API running');
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
module.exports = app;
