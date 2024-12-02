const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { check, validationResult } = require('express-validator');

const filePath = path.join(__dirname, '../public/data/expenses-data.json');

//wczytywanie pliku
const readDataFromFile = () => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading expenses data file:', err);
                return reject(new Error('Could not load expenses data'));
            }
            try {
                const expenses = JSON.parse(data);
                resolve(expenses);
            } catch (parseError) {
                console.error('Error parsing expenses data file:', parseError);
                reject(new Error('Could not parse expenses data'));
            }
        });
    });
}

//zapis do pliku
const writeDataToFile = (data) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
            if (err) {
                console.error('Error writing expenses data file:', err);
                return reject(new Error('Could not save expenses data'));
            }
            resolve();
        });
    })
}

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
        const expenses = await readDataFromFile();
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
router.get('/search', async (req, res) =>{
    const { category, minAmount, maxAmount, date } = req.query;

    try {
        const expenses = await readDataFromFile();
        const filteredExpenses = expenses.filter(exp => {
            return (
                (!category || exp.category === category) &&
                (!minAmount || exp.amount >= parseFloat(minAmount)) &&
                (!maxAmount || exp.amount <= parseFloat(maxAmount)) &&
                (!date || exp.date === date)
            );
        });

        res.json(filteredExpenses);
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
    try{
        const expenses = await readDataFromFile();
        const expense = expenses.find(exp => exp.id === parseInt(req.params.id));
        if (!expense) {
            return res.status(404).json({ message: 'Wydatek nie znaleziony' });
        }
        res.json(expense);
    } catch (error){
        res.status(500).json({error: error.message});
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
    check('title').notEmpty().isString().isLength({ min: 3 }).withMessage('Tytuł jest wymagany i musi mieć co najmniej 3 znaki'),
    check('amount').notEmpty().isFloat({ gt: 0 }).withMessage('Kwota musi być liczbą większą od zera'),
    check('category').notEmpty().isString().withMessage('Kategoria jest wymagana'),
    check('date').notEmpty().isISO8601().withMessage('Data musi być w poprawnym formacie'),
    check('description').optional().isString().isLength({ min: 5 }).withMessage('Opis, jeśli jest podany, musi mieć co najmniej 5 znaków')
] ,async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { title, amount, category, date, description } = req.body;

    try {
        const expenses = await readDataFromFile();
        const newExpense = {
            id: expenses.length ? expenses[expenses.length - 1].id + 1 : 1,
            title,
            amount,
            category,
            date,
            description
        };

        expenses.push(newExpense);
        await writeDataToFile(expenses);

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
    check('title').notEmpty().isString().isLength({ min: 3 }).withMessage('Tytuł jest wymagany i musi mieć co najmniej 3 znaki'),
    check('amount').notEmpty().isFloat({ gt: 0 }).withMessage('Kwota musi być liczbą większą od zera'),
    check('category').notEmpty().isString().withMessage('Kategoria jest wymagana'),
    check('date').notEmpty().isISO8601().withMessage('Data musi być w poprawnym formacie'),
    check('description').optional().isString().isLength({ min: 5 }).withMessage('Opis, jeśli jest podany, musi mieć co najmniej 5 znaków')
] ,async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { title, amount, category, date, description } = req.body;

    try {
        const expenses = await readDataFromFile();
        const index = expenses.findIndex(exp => exp.id === parseInt(req.params.id));

        if (index === -1) {
            return res.status(404).json({ message: 'Wydatek nie znaleziony' });
        }

        expenses[index] = { id: parseInt(req.params.id), title, amount, category, date, description };
        await writeDataToFile(expenses);

        res.json(expenses[index]);
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
    check('title').optional().isString().isLength({ min: 3 }).withMessage('Tytuł jest wymagany i musi mieć co najmniej 3 znaki'),
    check('amount').optional().isFloat({ gt: 0 }).withMessage('Kwota musi być liczbą większą od zera'),
    check('category').optional().isString().withMessage('Kategoria jest wymagana'),
    check('date').optional().isISO8601().withMessage('Data musi być w poprawnym formacie'),
    check('description').optional().isString().isLength({ min: 5 }).withMessage('Opis, jeśli jest podany, musi mieć co najmniej 5 znaków')
] ,async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const updates = req.body;

    try {
        const expenses = await readDataFromFile();
        const index = expenses.findIndex(exp => exp.id === parseInt(req.params.id));

        if (index === -1) {
            return res.status(404).json({ message: 'Wydatek nie znaleziony' });
        }

        const updatedExpense = { ...expenses[index], ...updates };
        expenses[index] = updatedExpense;

        await writeDataToFile(expenses);
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
        const expenses = await readDataFromFile();
        const index = expenses.findIndex(exp => exp.id === parseInt(req.params.id));

        if (index === -1) {
            return res.status(404).json({ message: 'Wydatek nie znaleziony' });
        }

        const deletedExpense = expenses.splice(index, 1);
        await writeDataToFile(expenses);

        res.json(deletedExpense[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;