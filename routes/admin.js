var express = require('express');
var router = express.Router();
var authorize = require('../middlewares/auth');

//GET /admin strona admina
router.get('/', authorize, (req, res) => {
    res.json({message: 'Witaj w sekcji dla adminów'});
});

module.exports = router;