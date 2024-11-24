var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.json({ message: 'API Śledzenia Wydatków w Express.js' });
});

module.exports = router;