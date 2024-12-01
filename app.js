const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');
const cors = require('cors');

const indexRouter = require('./routes/index');
const expensesRouter = require('./routes/expenses');
const adminRouter = require('./routes/admin');

const app = express();

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors(corsOptions));

// transformacja danych wejsciowych
app.use((req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].toLowerCase();
      }
    }
  }
  next();
});

// timestamp do odpowiedzi
app.use((req, res, next) => {
  const sendResponse = res.json;
  res.json = function (data) {
    if (Array.isArray(data)) {
      data = data.map(item => ({
        ...item,
        timestamp: new Date().toISOString()
      }));
    } else if (data && typeof data === 'object') {
      data.timestamp = new Date().toISOString();
    }
    sendResponse.call(this, data);
  };
  next();
});

app.use('/', indexRouter);
app.use('/expenses', expensesRouter);
app.use('/admin', adminRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// obsluga bledow
app.use((err, req, res, next) => {
  // logowanie szczegolow bledu w konsoli
  console.error('Błąd: ', err.message);
  console.error('Szczegóły błędu: ', err.stack);

  // zwracanie kodeu 500 i wiadomosci
  res.status(500).json({
    message: 'Wystąpił błąd serwera'
  });
});

// obsluga bledu 404
app.use((req, res) => {
  res.status(404).json({ error: 'Nie znaleziono zasobu' });
});

// logowanie zapytan
app.use((req, res, next) => {
  const startTime = Date.now();

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);

  res.on('finish', () => {
    const elapsedTime = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${elapsedTime}ms)`);
  });
  next();
});

module.exports = app;