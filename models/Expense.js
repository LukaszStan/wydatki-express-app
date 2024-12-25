const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    title: { type: String, required: true, minlength: 3 },
    amount: { type: Number, required: true, min: 1 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    date: { type: Date, required: true },
    description: { type: String, minlength: 5, default: 'Brak opisu' },
});

// Middleware 'pre' przed zapisaniem dokumentu
expenseSchema.pre('save', function (next) {
    console.log('Przed zapisaniem wydatku:', this);
    if (!this.description) {
        this.description = 'Brak opisu';
    }
    next();
});

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;