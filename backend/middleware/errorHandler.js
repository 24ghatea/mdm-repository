// Centralized Express error handler middleware

function errorHandler(err, req, res, next) {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

    // Handle SQLite unique constraint error
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && err.message.includes('UNIQUE constraint failed'))) {
        return res.status(409).json({
            success: false,
            message: 'A record with these unique details already exists (e.g., room number duplicate).'
        });
    }

    // Handle SQLite foreign key constraint
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || (err.message && err.message.includes('FOREIGN KEY constraint failed'))) {
        return res.status(400).json({
            success: false,
            message: 'Cannot perform operation due to existing related records.'
        });
    }

    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    return res.status(statusCode).json({
        success: false,
        message: err.message || 'An unexpected server error occurred. Please try again.'
    });
}

function notFoundHandler(req, res) {
    return res.status(404).json({
        success: false,
        message: `Endpoint not found: ${req.method} ${req.originalUrl}`
    });
}

module.exports = {
    errorHandler,
    notFoundHandler
};
