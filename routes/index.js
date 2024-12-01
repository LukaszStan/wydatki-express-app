const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.json({ message: 'API Śledzenia Wydatków w Express.js' });
});

module.exports = router;