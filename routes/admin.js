const express = require('express');
const router = express.Router();
const authorize = require('../middlewares/auth');

//GET /admin strona admina
router.get('/', authorize, (req, res) => {
    res.json({message: 'Witaj w sekcji dla adminów'});
});

module.exports = router;