const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const Category = require('../models/Category');

// Suma wydatków w każdej kategorii
router.get('/summary-by-category', async (req, res) => {
    try {
        const summary = await Expense.aggregate([
            {
                $group: {
                    _id: "$category",
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "category",
                },
            },
            {
                $unwind: "$category",
            },
            {
                $project: {
                    _id: 0,
                    category: "$category.name",
                    totalAmount: 1,
                    count: 1,
                },
            },
            {
                $sort: { totalAmount: -1 },
            },
        ]);

        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Średnie wydatki na dzień
router.get('/average-daily', async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Musisz podać startDate i endDate w formacie YYYY-MM-DD' });
    }

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Nieprawidłowe formaty dat. Użyj formatu YYYY-MM-DD.' });
        }

        if (start > end) {
            return res.status(400).json({ error: 'startDate musi być wcześniejsze niż endDate.' });
        }

        const result = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end },
                },
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" },
                },
            },
        ]);

        const totalAmount = result.length > 0 ? result[0].totalAmount : 0;

        const daysCount = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        const averageDaily = totalAmount / daysCount;

        res.json({ totalAmount, averageDaily, daysCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /expenses:
 *   get:
 *     summary: Pobierz listę wszystkich wydatków
 *     tags: [Expenses]
 *     responses:
 *       200:
 *         description: Lista wydatków
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/definitions/Expense'
 */
router.get('/', async(req, res) => {
    try{
        const expenses = await Expense.find().populate('category', 'name description');
        res.json(expenses);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

/**
 * @swagger
 * /expenses/search:
 *   get:
 *     summary: Wyszukaj wydatki według filtrów
 *     tags: [Expenses]
 *     parameters:
 *       - name: category
 *         in: query
 *         description: Kategoria wydatków
 *         schema:
 *           type: string
 *       - name: minAmount
 *         in: query
 *         description: Minimalna kwota
 *         schema:
 *           type: number
 *       - name: maxAmount
 *         in: query
 *         description: Maksymalna kwota
 *         schema:
 *           type: number
 *       - name: date
 *         in: query
 *         description: Data wydatku
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista wydatków spełniających kryteria
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/definitions/Expense'
 */
router.get('/search', async (req, res) => {
    const { category, minAmount, maxAmount, date } = req.query;
    const filter = {};

    if (category) {
        const foundCategory = await Category.findOne({ name: category });
        if (foundCategory) filter.category = foundCategory._id;
    }
    if (minAmount) filter.amount = { ...filter.amount, $gte: parseFloat(minAmount) };
    if (maxAmount) filter.amount = { ...filter.amount, $lte: parseFloat(maxAmount) };
    if (date) filter.date = date;

    try {
        const expenses = await Expense.find(filter).populate('category', 'name description');
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /expenses/{id}:
 *   get:
 *     summary: Pobierz szczegóły wydatku
 *     tags: [Expenses]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID wydatku
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Szczegóły wydatku
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Expense'
 *       404:
 *         description: Wydatek nie znaleziony
 */
router.get('/:id', async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id).populate('category', 'name description');
        if (!expense) {
            return res.status(404).json({ message: 'Wydatek nie znaleziony' });
        }
        res.json(expense);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /expenses:
 *   post:
 *     summary: Dodaj nowy wydatek
 *     tags: [Expenses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/definitions/NewExpense'
 *     responses:
 *       201:
 *         description: Wydatek dodany
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Expense'
 *       400:
 *         description: Nieprawidłowe dane wejściowe
 */
router.post('/', [
    check('title').notEmpty().isLength({ min: 3 }).withMessage('Tytuł musi mieć co najmniej 3 znaki'),
    check('amount').notEmpty().isFloat({ gt: 0 }).withMessage('Kwota musi być większa od 0'),
    check('category').notEmpty().withMessage('Kategoria jest wymagana'),
    check('date').notEmpty().isISO8601().withMessage('Nieprawidłowy format daty'),
    check('description').optional().isLength({ min: 5 }).withMessage('Opis musi mieć co najmniej 5 znaków'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { title, amount, category, date, description } = req.body;

    try {
        const foundCategory = await Category.findOne({ name: category });
        if (!foundCategory) {
            return res.status(400).json({ message: 'Podana kategoria nie istnieje' });
        }

        const newExpense = new Expense({
            title,
            amount,
            category: foundCategory._id,
            date,
            description,
        });

        await newExpense.save();
        res.status(201).json(newExpense);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /expenses/{id}:
 *   put:
 *     summary: Zaktualizuj cały wydatek
 *     tags: [Expenses]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID wydatku
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/definitions/NewExpense'
 *     responses:
 *       200:
 *         description: Wydatek zaktualizowany
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Expense'
 *       400:
 *          description: Wszystkie pola są wymagane
 *       404:
 *         description: Wydatek nie znaleziony
 */
router.put('/:id', [
    check('title').notEmpty().isString().isLength({ min: 3 }).withMessage('Tytuł musi mieć co najmniej 3 znaki'),
    check('amount').notEmpty().isFloat({ gt: 0 }).withMessage('Kwota musi być większa od zera'),
    check('category').notEmpty().isString().withMessage('Kategoria jest wymagana'),
    check('date').notEmpty().isISO8601().withMessage('Data musi być w formacie ISO8601'),
    check('description').optional().isString().isLength({ min: 5 }).withMessage('Opis musi mieć co najmniej 5 znaków')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const updatedExpense = await Expense.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updatedExpense) {
            return res.status(404).json({ message: 'Wydatek nie znaleziony' });
        }

        res.json(updatedExpense);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /expenses/{id}:
 *   patch:
 *     summary: Zaktualizuj wybrane pola wydatku
 *     tags: [Expenses]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID wydatku
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               amount:
 *                 type: number
 *               category:
 *                 type: string
 *               date:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Wydatek zaktualizowany
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Expense'
 *       404:
 *         description: Wydatek nie znaleziony
 */
router.patch('/:id', [
    check('title').optional().isString().isLength({ min: 3 }).withMessage('Tytuł musi mieć co najmniej 3 znaki'),
    check('amount').optional().isFloat({ gt: 0 }).withMessage('Kwota musi być większa od zera'),
    check('category').optional().isString().withMessage('Kategoria jest wymagana'),
    check('date').optional().isISO8601().withMessage('Data musi być w formacie ISO8601'),
    check('description').optional().isString().isLength({ min: 5 }).withMessage('Opis musi mieć co najmniej 5 znaków')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const updatedExpense = await Expense.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!updatedExpense) {
            return res.status(404).json({ message: 'Wydatek nie znaleziony' });
        }

        res.json(updatedExpense);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /expenses/{id}:
 *   delete:
 *     summary: Usuń wydatek
 *     tags: [Expenses]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID wydatku
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Wydatek usunięty
 *       404:
 *         description: Wydatek nie znaleziony
 */
router.delete('/:id', async (req, res) => {
    try {
        const deletedExpense = await Expense.findByIdAndDelete(req.params.id);

        if (!deletedExpense) {
            return res.status(404).json({ message: 'Wydatek nie znaleziony' });
        }

        res.json(deletedExpense);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;