const db = require('../database/db');

/**
 * Checks whether a room has an overlapping booking for the given date range.
 * 
 * Logic rule:
 * requested_checkin < existing_checkout AND requested_checkout > existing_checkin
 * Only Confirmed or active (non-Cancelled) bookings are checked.
 * 
 * @param {number} roomId - The room's database ID
 * @param {string} checkIn - Requested check-in date (YYYY-MM-DD)
 * @param {string} checkOut - Requested check-out date (YYYY-MM-DD)
 * @param {number|null} excludeBookingId - Optional booking ID to exclude (used during updates)
 * @returns {object|null} - The conflicting booking record, or null if no conflict
 */
function checkBookingOverlap(roomId, checkIn, checkOut, excludeBookingId = null) {
    let query = `
        SELECT b.*, r.room_number, r.type as room_type
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        WHERE b.room_id = ?
          AND b.status = 'Confirmed'
          AND (? < b.check_out AND ? > b.check_in)
    `;
    const params = [roomId, checkIn, checkOut];

    if (excludeBookingId) {
        query += ` AND b.id != ?`;
        params.push(excludeBookingId);
    }

    const conflict = db.prepare(query).get(...params);
    return conflict || null;
}

/**
 * Calculates number of nights between check-in and check-out
 * @param {string} checkIn 
 * @param {string} checkOut 
 * @returns {number}
 */
function calculateNights(checkIn, checkOut) {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const diffTime = d2.getTime() - d1.getTime();
    return Math.max(1, Math.round(diffTime / (1000 * 3600 * 24)));
}

/**
 * Validates ISO date format YYYY-MM-DD and ensures check_out > check_in
 * @param {string} checkIn 
 * @param {string} checkOut 
 * @returns {{ valid: boolean, error?: string }}
 */
function validateDateRange(checkIn, checkOut) {
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRegex.test(checkIn) || isNaN(Date.parse(checkIn))) {
        return { valid: false, error: 'Check-in date must be a valid date in YYYY-MM-DD format.' };
    }
    if (!isoRegex.test(checkOut) || isNaN(Date.parse(checkOut))) {
        return { valid: false, error: 'Check-out date must be a valid date in YYYY-MM-DD format.' };
    }

    const dIn = new Date(checkIn + 'T00:00:00');
    const dOut = new Date(checkOut + 'T00:00:00');

    if (dOut <= dIn) {
        return { valid: false, error: 'Check-out date must be strictly after check-in date.' };
    }

    return { valid: true };
}

/**
 * Recalculates and updates room availability status based on current active bookings.
 * If room status is 'Maintenance', it stays 'Maintenance'.
 * Otherwise, if there is a Confirmed booking covering today, status = 'Booked', else 'Available'.
 */
function syncRoomStatus(roomId) {
    const room = db.prepare('SELECT id, status FROM rooms WHERE id = ?').get(roomId);
    if (!room || room.status === 'Maintenance') return;

    const todayStr = new Date().toISOString().split('T')[0];
    const activeBooking = db.prepare(`
        SELECT id FROM bookings 
        WHERE room_id = ? 
          AND status = 'Confirmed'
          AND check_in <= ? AND check_out > ?
    `).get(roomId, todayStr, todayStr);

    const newStatus = activeBooking ? 'Booked' : 'Available';
    if (room.status !== newStatus) {
        db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run(newStatus, roomId);
    }
}

/**
 * Sync status for all rooms
 */
function syncAllRoomsStatus() {
    const rooms = db.prepare("SELECT id FROM rooms WHERE status != 'Maintenance'").all();
    for (const r of rooms) {
        syncRoomStatus(r.id);
    }
}

module.exports = {
    checkBookingOverlap,
    calculateNights,
    validateDateRange,
    syncRoomStatus,
    syncAllRoomsStatus
};
