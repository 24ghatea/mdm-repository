const { validateDateRange } = require('../utils/bookingUtils');
const db = require('../database/db');

// Helper to validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof email === 'string' && emailRegex.test(email.trim());
}

// Helper to validate phone format
function isValidPhone(phone) {
    if (typeof phone !== 'string') return false;
    const cleaned = phone.replace(/[\s\-\(\)\+\.]/g, '');
    return cleaned.length >= 7 && /^\d+$/.test(cleaned);
}

// Validation middleware for Room creation/update
function validateRoom(req, res, next) {
    const { room_number, type, price, status } = req.body;
    const isUpdate = req.method === 'PUT';
    const errors = [];

    // Room Number
    if (!isUpdate || room_number !== undefined) {
        if (!room_number || typeof room_number !== 'string' || room_number.trim().length === 0) {
            errors.push('Room number is required and cannot be empty.');
        } else if (room_number.trim().length > 20) {
            errors.push('Room number cannot exceed 20 characters.');
        }
    }

    // Room Type
    const validTypes = ['Single', 'Double', 'Deluxe', 'Suite'];
    if (!isUpdate || type !== undefined) {
        if (!type || !validTypes.includes(type)) {
            errors.push(`Room type must be one of: ${validTypes.join(', ')}.`);
        }
    }

    // Price
    if (!isUpdate || price !== undefined) {
        const numPrice = Number(price);
        if (isNaN(numPrice) || numPrice <= 0) {
            errors.push('Price must be a valid positive number greater than 0.');
        }
    }

    // Status
    const validStatuses = ['Available', 'Booked', 'Maintenance'];
    if (status !== undefined) {
        if (!validStatuses.includes(status)) {
            errors.push(`Status must be one of: ${validStatuses.join(', ')}.`);
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }

    next();
}

// Validation middleware for Booking creation/update
function validateBooking(req, res, next) {
    const { room_id, guest_name, guest_email, guest_phone, check_in, check_out, status } = req.body;
    const isUpdate = req.method === 'PUT';
    const errors = [];

    // Room ID
    if (!isUpdate || room_id !== undefined) {
        const parsedRoomId = parseInt(room_id, 10);
        if (!room_id || isNaN(parsedRoomId) || parsedRoomId <= 0) {
            errors.push('A valid room ID is required.');
        } else {
            const roomExists = db.prepare('SELECT id FROM rooms WHERE id = ?').get(parsedRoomId);
            if (!roomExists) {
                errors.push(`Room with ID ${parsedRoomId} does not exist.`);
            }
        }
    }

    // Guest Name
    if (!isUpdate || guest_name !== undefined) {
        if (!guest_name || typeof guest_name !== 'string' || guest_name.trim().length < 2) {
            errors.push('Guest name is required and must be at least 2 characters.');
        }
    }

    // Guest Email
    if (!isUpdate || guest_email !== undefined) {
        if (!guest_email || !isValidEmail(guest_email)) {
            errors.push('A valid guest email address is required.');
        }
    }

    // Guest Phone
    if (!isUpdate || guest_phone !== undefined) {
        if (!guest_phone || !isValidPhone(guest_phone)) {
            errors.push('A valid guest phone number is required (at least 7 digits).');
        }
    }

    // Dates
    if (!isUpdate || (check_in !== undefined && check_out !== undefined)) {
        if (!check_in || !check_out) {
            errors.push('Both check-in and check-out dates are required.');
        } else {
            const dateVal = validateDateRange(check_in, check_out);
            if (!dateVal.valid) {
                errors.push(dateVal.error);
            }
        }
    }

    // Status
    const validStatuses = ['Confirmed', 'Cancelled', 'Completed'];
    if (status !== undefined) {
        if (!validStatuses.includes(status)) {
            errors.push(`Booking status must be one of: ${validStatuses.join(', ')}.`);
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }

    next();
}

module.exports = {
    validateRoom,
    validateBooking
};
