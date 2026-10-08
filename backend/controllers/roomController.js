const db = require('../database/db');
const { validateDateRange, syncAllRoomsStatus } = require('../utils/bookingUtils');

// GET /api/rooms - Retrieve all rooms with optional filtering
exports.getAllRooms = (req, res, next) => {
    try {
        syncAllRoomsStatus();
        const { type, status, search } = req.query;
        let query = 'SELECT * FROM rooms WHERE 1=1';
        const params = [];

        if (type && type !== 'all') {
            query += ' AND type = ?';
            params.push(type);
        }

        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }

        if (search && search.trim() !== '') {
            query += ' AND (room_number LIKE ? OR type LIKE ?)';
            const term = `%${search.trim()}%`;
            params.push(term, term);
        }

        query += ' ORDER BY room_number ASC';

        const rooms = db.prepare(query).all(...params);

        return res.status(200).json({
            success: true,
            count: rooms.length,
            data: rooms
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/rooms/available - Search available rooms for a given date range and optional type
exports.getAvailableRooms = (req, res, next) => {
    try {
        const { type, checkIn, checkOut } = req.query;

        if (!checkIn || !checkOut) {
            return res.status(400).json({
                success: false,
                message: 'Both checkIn and checkOut query parameters (YYYY-MM-DD) are required for availability search.'
            });
        }

        const dateValidation = validateDateRange(checkIn, checkOut);
        if (!dateValidation.valid) {
            return res.status(400).json({
                success: false,
                message: dateValidation.error
            });
        }

        // Logic: Room is available if it is NOT in Maintenance, and NOT booked in overlapping range
        let query = `
            SELECT r.* 
            FROM rooms r
            WHERE r.status != 'Maintenance'
              AND r.id NOT IN (
                  SELECT b.room_id 
                  FROM bookings b 
                  WHERE b.status = 'Confirmed'
                    AND (? < b.check_out AND ? > b.check_in)
              )
        `;
        const params = [checkIn, checkOut];

        if (type && type !== 'all') {
            query += ' AND r.type = ?';
            params.push(type);
        }

        query += ' ORDER BY r.price ASC, r.room_number ASC';

        const availableRooms = db.prepare(query).all(...params);

        return res.status(200).json({
            success: true,
            checkIn,
            checkOut,
            count: availableRooms.length,
            data: availableRooms
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/rooms/:id - Retrieve single room details
exports.getRoomById = (req, res, next) => {
    try {
        const roomId = parseInt(req.params.id, 10);
        if (isNaN(roomId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid room ID format.'
            });
        }

        const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: `Room with ID ${roomId} was not found.`
            });
        }

        // Fetch recent active or upcoming bookings for this room
        const bookings = db.prepare(`
            SELECT id, guest_name, guest_email, guest_phone, check_in, check_out, status, created_at
            FROM bookings
            WHERE room_id = ?
            ORDER BY check_in DESC
            LIMIT 10
        `).all(roomId);

        return res.status(200).json({
            success: true,
            data: {
                ...room,
                bookings
            }
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/rooms - Create a new room
exports.createRoom = (req, res, next) => {
    try {
        const { room_number, type, price, status = 'Available' } = req.body;

        const trimmedRoomNumber = room_number.trim();

        // Check if room number already exists
        const existing = db.prepare('SELECT id FROM rooms WHERE LOWER(room_number) = LOWER(?)').get(trimmedRoomNumber);
        if (existing) {
            return res.status(409).json({
                success: false,
                message: `Room number "${trimmedRoomNumber}" already exists. Please choose a unique room number.`
            });
        }

        const stmt = db.prepare(`
            INSERT INTO rooms (room_number, type, price, status)
            VALUES (?, ?, ?, ?)
        `);

        const result = stmt.run(trimmedRoomNumber, type, parseFloat(price), status);
        const newRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(result.lastInsertRowid);

        return res.status(201).json({
            success: true,
            message: `Room ${newRoom.room_number} (${newRoom.type}) created successfully.`,
            data: newRoom
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/rooms/:id - Update an existing room
exports.updateRoom = (req, res, next) => {
    try {
        const roomId = parseInt(req.params.id, 10);
        if (isNaN(roomId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid room ID format.'
            });
        }

        const currentRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
        if (!currentRoom) {
            return res.status(404).json({
                success: false,
                message: `Room with ID ${roomId} was not found.`
            });
        }

        const { room_number, type, price, status } = req.body;

        const updatedRoomNumber = room_number !== undefined ? room_number.trim() : currentRoom.room_number;
        const updatedType = type !== undefined ? type : currentRoom.type;
        const updatedPrice = price !== undefined ? parseFloat(price) : currentRoom.price;
        const updatedStatus = status !== undefined ? status : currentRoom.status;

        // Check duplicate room number
        if (updatedRoomNumber.toLowerCase() !== currentRoom.room_number.toLowerCase()) {
            const conflict = db.prepare('SELECT id FROM rooms WHERE LOWER(room_number) = LOWER(?) AND id != ?').get(updatedRoomNumber, roomId);
            if (conflict) {
                return res.status(409).json({
                    success: false,
                    message: `Room number "${updatedRoomNumber}" is already in use by another room.`
                });
            }
        }

        const stmt = db.prepare(`
            UPDATE rooms 
            SET room_number = ?, type = ?, price = ?, status = ?
            WHERE id = ?
        `);
        stmt.run(updatedRoomNumber, updatedType, updatedPrice, updatedStatus, roomId);

        const updatedRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);

        return res.status(200).json({
            success: true,
            message: `Room ${updatedRoom.room_number} updated successfully.`,
            data: updatedRoom
        });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/rooms/:id - Delete a room
exports.deleteRoom = (req, res, next) => {
    try {
        const roomId = parseInt(req.params.id, 10);
        if (isNaN(roomId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid room ID format.'
            });
        }

        const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: `Room with ID ${roomId} was not found.`
            });
        }

        // Check for active or upcoming bookings
        const activeBookings = db.prepare(`
            SELECT COUNT(*) as count FROM bookings 
            WHERE room_id = ? AND status = 'Confirmed'
        `).get(roomId).count;

        if (activeBookings > 0) {
            return res.status(409).json({
                success: false,
                message: `Cannot delete Room ${room.room_number} because it currently has ${activeBookings} active or confirmed booking(s). Please cancel or reassign them first.`
            });
        }

        // Delete any past cancelled or completed bookings associated with this room to maintain integrity
        db.prepare('DELETE FROM bookings WHERE room_id = ?').run(roomId);
        db.prepare('DELETE FROM rooms WHERE id = ?').run(roomId);

        return res.status(200).json({
            success: true,
            message: `Room ${room.room_number} and historical references were deleted successfully.`
        });
    } catch (err) {
        next(err);
    }
};
