const express = require('express');
const cors = require('cors');
const path = require('path');

// Import database (which self-initializes schema & seeds if empty)
require('./database/db');

// Import routes
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Concise HTTP request logger
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Serve frontend static files
const frontendPath = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Mount REST API endpoints
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'UP',
        hotel: 'Verdanté Boutique Hotel',
        timestamp: new Date().toISOString()
    });
});

// 404 for unmatched API routes
app.use('/api', notFoundHandler);

// Fallback for HTML direct page visits
app.use((req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Centralized error handler middleware
app.use(errorHandler);

// Start Server
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`\n======================================================`);
        console.log(`  🌿 VERDANTÉ HOTEL MANAGEMENT SYSTEM`);
        console.log(`  🚀 Server is running on: http://localhost:${PORT}`);
        console.log(`  🏨 Frontend App:        http://localhost:${PORT}`);
        console.log(`  📡 API Endpoints:        http://localhost:${PORT}/api/`);
        console.log(`======================================================\n`);
    });
}

module.exports = app;
