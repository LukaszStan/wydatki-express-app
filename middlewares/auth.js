function authorize(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || authHeader !== 'token') {
        return res.status(403).json({ message: 'Dostęp zabroniony' });
    }

    next();
}

module.exports = authorize;