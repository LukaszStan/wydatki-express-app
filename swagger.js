const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'Expenses API',
        description: 'API do zarządzania wydatkami użytkowników',
        version: '1.0.0',
    },
    host: 'localhost:5000',
    schemes: ['http'],
    basePath: '/expenses',
    definitions: {
        Expense: {
            id: '1',
            title: 'Zakupy spożywcze',
            amount: 150,
            category: 'Jedzenie',
            date: '2024-11-24',
            description: 'Zakupy w supermarkecie'
        },
        NewExpense: {
            title: 'Zakupy spożywcze',
            amount: 150,
            category: 'Jedzenie',
            date: '2024-11-24',
            description: 'Zakupy w supermarkecie'
        }
    }
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./routes/expenses.js'];

swaggerAutogen(outputFile, endpointsFiles, doc);