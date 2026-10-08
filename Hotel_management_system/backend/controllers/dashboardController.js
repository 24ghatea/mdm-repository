const db = require('../database/db');
const { calculateNights, syncAllRoomsStatus } = require('../utils/bookingUtils');

// GET /api/dashboard/stats - Summary statistics and recent activity
exports.getDashboardStats = (req, res, next) => {
    try {
        syncAllRoomsStatus();

        // Room metrics
        const totalRooms = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
        const availableRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'Available'").get().count;
        const bookedRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'Booked'").get().count;
        const maintenanceRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'Maintenance'").get().count;

        // Booking metrics
        const totalBookings = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
        const confirmedBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'Confirmed'").get().count;
        const completedBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'Completed'").get().count;
        const cancelledBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'Cancelled'").get().count;

        // Total calculated revenue from Confirmed + Completed bookings
        const revenueBookings = db.prepare(`
            SELECT b.check_in, b.check_out, r.price
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            WHERE b.status IN ('Confirmed', 'Completed')
        `).all();

        const totalRevenue = revenueBookings.reduce((sum, b) => {
            const nights = calculateNights(b.check_in, b.check_out);
            return sum + (nights * b.price);
        }, 0);

        // Room breakdown by type
        const roomTypes = db.prepare(`
            SELECT type, COUNT(*) as count, 
                   SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available,
                   SUM(CASE WHEN status = 'Booked' THEN 1 ELSE 0 END) as booked,
                   SUM(CASE WHEN status = 'Maintenance' THEN 1 ELSE 0 END) as maintenance
            FROM rooms
            GROUP BY type
        `).all();

        // Recent 5 bookings
        const recentBookings = db.prepare(`
            SELECT b.*, r.room_number, r.type as room_type, r.price as price_per_night
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            ORDER BY b.created_at DESC, b.id DESC
            LIMIT 5
        `).all().map(b => ({
            ...b,
            nights: calculateNights(b.check_in, b.check_out),
            total_amount: calculateNights(b.check_in, b.check_out) * b.price_per_night
        }));

        // All rooms overview for live status grid
        const allRooms = db.prepare(`
            SELECT id, room_number, type, price, status
            FROM rooms
            ORDER BY room_number ASC
        `).all();

        return res.status(200).json({
            success: true,
            data: {
                metrics: {
                    totalRooms,
                    availableRooms,
                    bookedRooms,
                    maintenanceRooms,
                    totalBookings,
                    confirmedBookings,
                    completedBookings,
                    cancelledBookings,
                    totalRevenue
                },
                roomTypes,
                recentBookings,
                allRooms
            }
        });
    } catch (err) {
        next(err);
    }
};
