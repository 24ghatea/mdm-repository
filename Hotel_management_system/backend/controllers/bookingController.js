const db = require('../database/db');
const { checkBookingOverlap, calculateNights, syncRoomStatus } = require('../utils/bookingUtils');

// GET /api/bookings - List bookings with optional status filter, search & sort
exports.getAllBookings = (req, res, next) => {
    try {
        const { status, search, roomId } = req.query;
        let query = `
            SELECT b.*, r.room_number, r.type as room_type, r.price as price_per_night
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            query += ' AND b.status = ?';
            params.push(status);
        }

        if (roomId) {
            query += ' AND b.room_id = ?';
            params.push(parseInt(roomId, 10));
        }

        if (search && search.trim() !== '') {
            query += ' AND (b.guest_name LIKE ? OR b.guest_email LIKE ? OR b.guest_phone LIKE ? OR r.room_number LIKE ?)';
            const term = `%${search.trim()}%`;
            params.push(term, term, term, term);
        }

        query += ' ORDER BY b.created_at DESC, b.check_in DESC';

        const bookings = db.prepare(query).all(...params);

        // Add calculated stay details
        const enrichedBookings = bookings.map(b => {
            const nights = calculateNights(b.check_in, b.check_out);
            const totalAmount = nights * b.price_per_night;
            return {
                ...b,
                nights,
                total_amount: totalAmount
            };
        });

        return res.status(200).json({
            success: true,
            count: enrichedBookings.length,
            data: enrichedBookings
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/bookings/:id - Get single booking by ID
exports.getBookingById = (req, res, next) => {
    try {
        const bookingId = parseInt(req.params.id, 10);
        if (isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking ID format.'
            });
        }

        const query = `
            SELECT b.*, r.room_number, r.type as room_type, r.price as price_per_night
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            WHERE b.id = ?
        `;
        const booking = db.prepare(query).get(bookingId);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `Booking #${bookingId} was not found.`
            });
        }

        const nights = calculateNights(booking.check_in, booking.check_out);
        booking.nights = nights;
        booking.total_amount = nights * booking.price_per_night;

        return res.status(200).json({
            success: true,
            data: booking
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/bookings - Create new booking with overlap prevention
exports.createBooking = (req, res, next) => {
    try {
        const { room_id, guest_name, guest_email, guest_phone, check_in, check_out, status = 'Confirmed' } = req.body;
        const targetRoomId = parseInt(room_id, 10);

        // Verify room
        const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(targetRoomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: `Target room with ID ${targetRoomId} does not exist.`
            });
        }

        if (room.status === 'Maintenance') {
            return res.status(400).json({
                success: false,
                message: `Room ${room.room_number} is currently under maintenance and cannot be booked.`
            });
        }

        // CRITICAL DOUBLE-BOOKING CHECK
        // requested_checkin < existing_checkout AND requested_checkout > existing_checkin
        if (status === 'Confirmed') {
            const conflict = checkBookingOverlap(targetRoomId, check_in, check_out);
            if (conflict) {
                return res.status(409).json({
                    success: false,
                    message: `Conflict: Room ${room.room_number} is already booked for overlapping dates (${conflict.check_in} to ${conflict.check_out}) by ${conflict.guest_name}. Please choose alternate dates or a different room.`,
                    conflictingBooking: {
                        id: conflict.id,
                        guest_name: conflict.guest_name,
                        check_in: conflict.check_in,
                        check_out: conflict.check_out
                    }
                });
            }
        }

        const stmt = db.prepare(`
            INSERT INTO bookings (room_id, guest_name, guest_email, guest_phone, check_in, check_out, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            targetRoomId,
            guest_name.trim(),
            guest_email.trim().toLowerCase(),
            guest_phone.trim(),
            check_in,
            check_out,
            status
        );

        const newBookingId = result.lastInsertRowid;
        syncRoomStatus(targetRoomId);

        const createdBooking = db.prepare(`
            SELECT b.*, r.room_number, r.type as room_type, r.price as price_per_night
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            WHERE b.id = ?
        `).get(newBookingId);

        const nights = calculateNights(createdBooking.check_in, createdBooking.check_out);
        createdBooking.nights = nights;
        createdBooking.total_amount = nights * createdBooking.price_per_night;

        return res.status(201).json({
            success: true,
            message: `Booking #${newBookingId} for Room ${room.room_number} confirmed successfully.`,
            data: createdBooking
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/bookings/:id - Update an existing booking
exports.updateBooking = (req, res, next) => {
    try {
        const bookingId = parseInt(req.params.id, 10);
        if (isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking ID format.'
            });
        }

        const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: `Booking #${bookingId} was not found.`
            });
        }

        const {
            room_id = existing.room_id,
            guest_name = existing.guest_name,
            guest_email = existing.guest_email,
            guest_phone = existing.guest_phone,
            check_in = existing.check_in,
            check_out = existing.check_out,
            status = existing.status
        } = req.body;

        const targetRoomId = parseInt(room_id, 10);
        const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(targetRoomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: `Room with ID ${targetRoomId} does not exist.`
            });
        }

        // Check overlap if status is Confirmed, excluding this booking itself
        if (status === 'Confirmed') {
            const conflict = checkBookingOverlap(targetRoomId, check_in, check_out, bookingId);
            if (conflict) {
                return res.status(409).json({
                    success: false,
                    message: `Conflict: Room ${room.room_number} is already booked for overlapping dates (${conflict.check_in} to ${conflict.check_out}) by ${conflict.guest_name}.`,
                    conflictingBooking: conflict
                });
            }
        }

        const stmt = db.prepare(`
            UPDATE bookings
            SET room_id = ?, guest_name = ?, guest_email = ?, guest_phone = ?, check_in = ?, check_out = ?, status = ?
            WHERE id = ?
        `);

        stmt.run(
            targetRoomId,
            guest_name.trim(),
            guest_email.trim().toLowerCase(),
            guest_phone.trim(),
            check_in,
            check_out,
            status,
            bookingId
        );

        syncRoomStatus(existing.room_id);
        if (existing.room_id !== targetRoomId) {
            syncRoomStatus(targetRoomId);
        }

        const updatedBooking = db.prepare(`
            SELECT b.*, r.room_number, r.type as room_type, r.price as price_per_night
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            WHERE b.id = ?
        `).get(bookingId);

        const nights = calculateNights(updatedBooking.check_in, updatedBooking.check_out);
        updatedBooking.nights = nights;
        updatedBooking.total_amount = nights * updatedBooking.price_per_night;

        return res.status(200).json({
            success: true,
            message: `Booking #${bookingId} updated successfully.`,
            data: updatedBooking
        });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/bookings/:id/cancel - Cancel a booking
exports.cancelBooking = (req, res, next) => {
    try {
        const bookingId = parseInt(req.params.id, 10);
        if (isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking ID format.'
            });
        }

        const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `Booking #${bookingId} was not found.`
            });
        }

        if (booking.status === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: `Booking #${bookingId} is already cancelled.`
            });
        }

        db.prepare("UPDATE bookings SET status = 'Cancelled' WHERE id = ?").run(bookingId);
        syncRoomStatus(booking.room_id);

        const updatedBooking = db.prepare(`
            SELECT b.*, r.room_number, r.type as room_type, r.price as price_per_night
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            WHERE b.id = ?
        `).get(bookingId);

        return res.status(200).json({
            success: true,
            message: `Booking #${bookingId} has been successfully cancelled.`,
            data: updatedBooking
        });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/bookings/:id - Delete a booking
exports.deleteBooking = (req, res, next) => {
    try {
        const bookingId = parseInt(req.params.id, 10);
        if (isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking ID format.'
            });
        }

        const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `Booking #${bookingId} was not found.`
            });
        }

        db.prepare('DELETE FROM bookings WHERE id = ?').run(bookingId);
        syncRoomStatus(booking.room_id);

        return res.status(200).json({
            success: true,
            message: `Booking #${bookingId} was permanently deleted.`
        });
    } catch (err) {
        next(err);
    }
};
