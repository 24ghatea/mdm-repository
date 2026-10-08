const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../../database/hotel.db');
const schemaPath = path.resolve(__dirname, 'schema.sql');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Connect to SQLite database
const db = new Database(dbPath, {
    // verbose: console.log
});

// Configure SQLite pragmas for performance & integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
function initDatabase() {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
    seedDatabase();
}

// Helper to format date offset from today
function getDateStr(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
}

// Seed initial realistic demo data if empty
function seedDatabase() {
    const roomCount = db.prepare('SELECT COUNT(*) AS count FROM rooms').get().count;
    if (roomCount === 0) {
        console.log('🌱 Seeding sample rooms...');
        const insertRoom = db.prepare(`
            INSERT INTO rooms (room_number, type, price, status)
            VALUES (@room_number, @type, @price, @status)
        `);

        const sampleRooms = [
            { room_number: '101', type: 'Single', price: 120.00, status: 'Available' },
            { room_number: '102', type: 'Single', price: 135.00, status: 'Available' },
            { room_number: '103', type: 'Single', price: 125.00, status: 'Booked' },
            { room_number: '201', type: 'Double', price: 195.00, status: 'Available' },
            { room_number: '202', type: 'Double', price: 215.00, status: 'Booked' },
            { room_number: '203', type: 'Double', price: 200.00, status: 'Maintenance' },
            { room_number: '301', type: 'Deluxe', price: 320.00, status: 'Available' },
            { room_number: '302', type: 'Deluxe', price: 350.00, status: 'Booked' },
            { room_number: '303', type: 'Deluxe', price: 335.00, status: 'Available' },
            { room_number: '401', type: 'Suite', price: 550.00, status: 'Available' },
            { room_number: '402', type: 'Suite', price: 620.00, status: 'Booked' },
            { room_number: '403', type: 'Suite', price: 580.00, status: 'Available' }
        ];

        const insertManyRooms = db.transaction((rooms) => {
            for (const room of rooms) {
                insertRoom.run(room);
            }
        });
        insertManyRooms(sampleRooms);

        // Fetch inserted rooms to get IDs
        const roomsMap = {};
        db.prepare('SELECT id, room_number FROM rooms').all().forEach(r => {
            roomsMap[r.room_number] = r.id;
        });

        console.log('🌱 Seeding sample bookings...');
        const insertBooking = db.prepare(`
            INSERT INTO bookings (room_id, guest_name, guest_email, guest_phone, check_in, check_out, status)
            VALUES (@room_id, @guest_name, @guest_email, @guest_phone, @check_in, @check_out, @status)
        `);

        const sampleBookings = [
            {
                room_id: roomsMap['103'],
                guest_name: 'Eleanor Vance',
                guest_email: 'eleanor.vance@example.com',
                guest_phone: '+1 (555) 234-5678',
                check_in: getDateStr(-1),
                check_out: getDateStr(3),
                status: 'Confirmed'
            },
            {
                room_id: roomsMap['202'],
                guest_name: 'Marcus Sterling',
                guest_email: 'm.sterling@example.com',
                guest_phone: '+1 (555) 876-5432',
                check_in: getDateStr(0),
                check_out: getDateStr(4),
                status: 'Confirmed'
            },
            {
                room_id: roomsMap['302'],
                guest_name: 'Sophia Laurent',
                guest_email: 'sophia.l@luxdomain.com',
                guest_phone: '+1 (555) 345-9876',
                check_in: getDateStr(-2),
                check_out: getDateStr(2),
                status: 'Confirmed'
            },
            {
                room_id: roomsMap['402'],
                guest_name: 'Alexander Hayes',
                guest_email: 'a.hayes@venturecap.com',
                guest_phone: '+1 (555) 901-2345',
                check_in: getDateStr(1),
                check_out: getDateStr(5),
                status: 'Confirmed'
            },
            {
                room_id: roomsMap['101'],
                guest_name: 'Clara Oswald',
                guest_email: 'clara.oswald@tardis.org',
                guest_phone: '+1 (555) 432-1098',
                check_in: getDateStr(-10),
                check_out: getDateStr(-5),
                status: 'Completed'
            },
            {
                room_id: roomsMap['201'],
                guest_name: 'Julian Thorne',
                guest_email: 'julian.thorne@arts.edu',
                guest_phone: '+1 (555) 765-4321',
                check_in: getDateStr(-6),
                check_out: getDateStr(-2),
                status: 'Completed'
            },
            {
                room_id: roomsMap['301'],
                guest_name: 'Beatrix Potter',
                guest_email: 'b.potter@cottage.net',
                guest_phone: '+1 (555) 654-3210',
                check_in: getDateStr(8),
                check_out: getDateStr(12),
                status: 'Cancelled'
            }
        ];

        const insertManyBookings = db.transaction((bookings) => {
            for (const booking of bookings) {
                insertBooking.run(booking);
            }
        });
        insertManyBookings(sampleBookings);
        console.log('✅ Sample data seeded successfully.');
    }
}

// Automatically initialize on import
initDatabase();

module.exports = db;
