const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { validateBooking } = require('../middleware/validation');

// Booking CRUD and action routes
router.get('/', bookingController.getAllBookings);
router.get('/:id', bookingController.getBookingById);
router.post('/', validateBooking, bookingController.createBooking);
router.put('/:id', validateBooking, bookingController.updateBooking);
router.patch('/:id/cancel', bookingController.cancelBooking);
router.delete('/:id', bookingController.deleteBooking);

module.exports = router;
