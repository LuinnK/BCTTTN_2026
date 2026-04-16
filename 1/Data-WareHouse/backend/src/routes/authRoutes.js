const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

// Route: POST /api/v1/auth/login
router.post('/login', AuthController.login);

module.exports = router;