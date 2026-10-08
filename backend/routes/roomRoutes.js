const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { validateRoom } = require('../middleware/validation');

// Search available rooms for a given period
router.get('/available', roomController.getAvailableRooms);

// Room CRUD routes
router.get('/', roomController.getAllRooms);
router.get('/:id', roomController.getRoomById);
router.post('/', validateRoom, roomController.createRoom);
router.put('/:id', validateRoom, roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);

module.exports = router;
