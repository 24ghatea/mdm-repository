const app = require('../backend/server');
const http = require('http');

let server;
let baseUrl;

async function runTests() {
    console.log('🧪 Starting Automated API Test Suite...\n');
    let passed = 0;
    let failed = 0;

    // Start server on ephemeral port for tests
    await new Promise((resolve) => {
        server = http.createServer(app);
        server.listen(0, () => {
            const port = server.address().port;
            baseUrl = `http://localhost:${port}`;
            console.log(`📡 Test Server running on ${baseUrl}\n`);
            resolve();
        });
    });

    async function assert(testName, fn) {
        try {
            await fn();
            console.log(`  ✅ [PASS] ${testName}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ [FAIL] ${testName}`);
            console.error(`     Reason: ${err.message}\n`);
            failed++;
        }
    }

    try {
        // 1. Health check
        await assert('Health Check API returns UP', async () => {
            const res = await fetch(`${baseUrl}/api/health`);
            const data = await res.json();
            if (res.status !== 200 || data.status !== 'UP') throw new Error(`Status ${res.status}, body: ${JSON.stringify(data)}`);
        });

        // 2. Dashboard stats
        await assert('Dashboard Stats API returns valid structure and metrics', async () => {
            const res = await fetch(`${baseUrl}/api/dashboard/stats`);
            const data = await res.json();
            if (res.status !== 200 || !data.success || !data.data.metrics) {
                throw new Error('Invalid dashboard stats structure');
            }
            if (typeof data.data.metrics.totalRooms !== 'number' || data.data.metrics.totalRooms < 10) {
                throw new Error('Expected at least 10 seeded rooms');
            }
        });

        // 3. Room CRUD
        let createdRoomId;
        const testRoomNumber = 'TEST-' + Math.floor(Math.random() * 10000);

        await assert('POST /api/rooms creates a new room with 201 status', async () => {
            const res = await fetch(`${baseUrl}/api/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_number: testRoomNumber,
                    type: 'Deluxe',
                    price: 299.99,
                    status: 'Available'
                })
            });
            const data = await res.json();
            if (res.status !== 201 || !data.success || !data.data.id) {
                throw new Error(`Failed to create room: ${JSON.stringify(data)}`);
            }
            createdRoomId = data.data.id;
        });

        await assert('POST /api/rooms rejects duplicate room numbers with 409 Conflict', async () => {
            const res = await fetch(`${baseUrl}/api/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_number: testRoomNumber,
                    type: 'Deluxe',
                    price: 299.99
                })
            });
            const data = await res.json();
            if (res.status !== 409 || data.success !== false) {
                throw new Error(`Expected 409 Conflict, got ${res.status}: ${JSON.stringify(data)}`);
            }
        });

        await assert('POST /api/rooms rejects negative price with 400 Bad Request', async () => {
            const res = await fetch(`${baseUrl}/api/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_number: 'TEST-NEG',
                    type: 'Single',
                    price: -50
                })
            });
            if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
        });

        await assert('GET /api/rooms returns room list and filter works', async () => {
            const res = await fetch(`${baseUrl}/api/rooms?type=Deluxe`);
            const data = await res.json();
            if (res.status !== 200 || !Array.isArray(data.data)) throw new Error('Failed to fetch rooms');
            if (!data.data.every(r => r.type === 'Deluxe')) throw new Error('Filter did not restrict to Deluxe');
        });

        await assert('PUT /api/rooms/:id updates room details', async () => {
            const res = await fetch(`${baseUrl}/api/rooms/${createdRoomId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_number: testRoomNumber,
                    type: 'Suite',
                    price: 499.00,
                    status: 'Available'
                })
            });
            const data = await res.json();
            if (res.status !== 200 || data.data.type !== 'Suite' || data.data.price !== 499) {
                throw new Error(`Failed to update room: ${JSON.stringify(data)}`);
            }
        });

        // 4. Double-Booking & Availability Logic Tests
        let booking1Id;
        await assert('POST /api/bookings creates initial confirmed booking (2027-05-10 to 2027-05-15)', async () => {
            const res = await fetch(`${baseUrl}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: createdRoomId,
                    guest_name: 'Arthur Pendragon',
                    guest_email: 'arthur@camelot.org',
                    guest_phone: '+1 555-0199',
                    check_in: '2027-05-10',
                    check_out: '2027-05-15'
                })
            });
            const data = await res.json();
            if (res.status !== 201 || !data.success) {
                throw new Error(`Failed to create booking: ${JSON.stringify(data)}`);
            }
            booking1Id = data.data.id;
        });

        await assert('DOUBLE BOOKING: Rejects overlapping booking (2027-05-12 to 2027-05-17) with 409 Conflict', async () => {
            const res = await fetch(`${baseUrl}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: createdRoomId,
                    guest_name: 'Guinevere',
                    guest_email: 'guinevere@camelot.org',
                    guest_phone: '+1 555-0200',
                    check_in: '2027-05-12',
                    check_out: '2027-05-17'
                })
            });
            const data = await res.json();
            if (res.status !== 409 || data.success !== false) {
                throw new Error(`Expected 409 Conflict for overlap, got ${res.status}: ${JSON.stringify(data)}`);
            }
        });

        await assert('DOUBLE BOOKING: Rejects internal overlapping booking (2027-05-11 to 2027-05-14) with 409 Conflict', async () => {
            const res = await fetch(`${baseUrl}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: createdRoomId,
                    guest_name: 'Lancelot',
                    guest_email: 'lancelot@camelot.org',
                    guest_phone: '+1 555-0201',
                    check_in: '2027-05-11',
                    check_out: '2027-05-14'
                })
            });
            if (res.status !== 409) throw new Error(`Expected 409 Conflict, got ${res.status}`);
        });

        await assert('ADJACENT BOOKING: Accepts adjacent check-in on existing check-out date (2027-05-15 to 2027-05-18)', async () => {
            const res = await fetch(`${baseUrl}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: createdRoomId,
                    guest_name: 'Merlin Ambrosius',
                    guest_email: 'merlin@avalon.org',
                    guest_phone: '+1 555-0202',
                    check_in: '2027-05-15',
                    check_out: '2027-05-18'
                })
            });
            const data = await res.json();
            if (res.status !== 201 || !data.success) {
                throw new Error(`Adjacent booking should succeed, got ${res.status}: ${JSON.stringify(data)}`);
            }
        });

        await assert('ADJACENT BOOKING: Accepts adjacent check-out on existing check-in date (2027-05-05 to 2027-05-10)', async () => {
            const res = await fetch(`${baseUrl}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: createdRoomId,
                    guest_name: 'Gawain of Orkney',
                    guest_email: 'gawain@camelot.org',
                    guest_phone: '+1 555-0203',
                    check_in: '2027-05-05',
                    check_out: '2027-05-10'
                })
            });
            const data = await res.json();
            if (res.status !== 201 || !data.success) {
                throw new Error(`Adjacent previous booking should succeed, got ${res.status}: ${JSON.stringify(data)}`);
            }
        });

        // 5. Booking Validation Checks
        await assert('VALIDATION: Rejects invalid email with 400 Bad Request', async () => {
            const res = await fetch(`${baseUrl}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: createdRoomId,
                    guest_name: 'Invalid Email User',
                    guest_email: 'not-an-email',
                    guest_phone: '+1 555-0204',
                    check_in: '2027-06-01',
                    check_out: '2027-06-05'
                })
            });
            if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
        });

        await assert('VALIDATION: Rejects check_out <= check_in with 400 Bad Request', async () => {
            const res = await fetch(`${baseUrl}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: createdRoomId,
                    guest_name: 'Reverse Date User',
                    guest_email: 'valid@example.com',
                    guest_phone: '+1 555-0205',
                    check_in: '2027-06-10',
                    check_out: '2027-06-08'
                })
            });
            if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
        });

        // 6. Booking cancellation and search
        await assert('PATCH /api/bookings/:id/cancel cancels booking', async () => {
            const res = await fetch(`${baseUrl}/api/bookings/${booking1Id}/cancel`, {
                method: 'PATCH'
            });
            const data = await res.json();
            if (res.status !== 200 || data.data.status !== 'Cancelled') {
                throw new Error(`Failed to cancel booking: ${JSON.stringify(data)}`);
            }
        });

        await assert('AFTER CANCELLATION: Now allows booking the previously cancelled dates (2027-05-10 to 2027-05-15)', async () => {
            const res = await fetch(`${baseUrl}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: createdRoomId,
                    guest_name: 'Percival',
                    guest_email: 'percival@grail.org',
                    guest_phone: '+1 555-0206',
                    check_in: '2027-05-10',
                    check_out: '2027-05-15'
                })
            });
            const data = await res.json();
            if (res.status !== 201 || !data.success) {
                throw new Error(`Expected success after cancellation freed the room, got ${res.status}: ${JSON.stringify(data)}`);
            }
        });

        // 7. Search available rooms
        await assert('GET /api/rooms/available returns available rooms for dates', async () => {
            const res = await fetch(`${baseUrl}/api/rooms/available?checkIn=2027-08-01&checkOut=2027-08-05`);
            const data = await res.json();
            if (res.status !== 200 || !Array.isArray(data.data) || data.data.length === 0) {
                throw new Error(`Availability search failed: ${JSON.stringify(data)}`);
            }
        });

        // Clean up test bookings and room
        const testBookings = await (await fetch(`${baseUrl}/api/bookings?roomId=${createdRoomId}`)).json();
        if (testBookings.data) {
            for (const b of testBookings.data) {
                await fetch(`${baseUrl}/api/bookings/${b.id}`, { method: 'DELETE' });
            }
        }
        await fetch(`${baseUrl}/api/rooms/${createdRoomId}`, { method: 'DELETE' });

    } finally {
        server.close();
        console.log(`\n======================================================`);
        console.log(`  🏁 Test Suite Completed: ${passed} Passed, ${failed} Failed`);
        console.log(`======================================================\n`);
        process.exit(failed > 0 ? 1 : 0);
    }
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
