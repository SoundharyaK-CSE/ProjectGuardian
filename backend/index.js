const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

// Load environment explicitly from the backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// DB Connection
const db = require('./config/db');

// Verify DB connection safely on startup without revealing secrets
db.query('SELECT NOW()')
  .then(() => console.log('Database connected successfully.'))
  .catch(err => console.error('Database connection failed at startup:', err.message));

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health/db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: 'Database unavailable' });
  }
});

// AI Service integration stub
const aiRoutes = require('./routes/ai');
app.use('/api/ai', aiRoutes);

// Analysis routes
const analysisRoutes = require('./routes/analysisRoutes');
app.use('/api/analysis', analysisRoutes);

// Dashboard routes
const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/api/dashboard', dashboardRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
