var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var swaggerUi = require('swagger-ui-express');
var swaggerDocument = require('./swagger-output.json');

var indexRouter = require('./routes/index');
var expensesRouter = require('./routes/expenses');
var adminRouter = require('./routes/admin');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/expenses', expensesRouter);
app.use('/admin', adminRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// obsługa error 404
app.use((req, res) => {
  res.status(404).json({error: 'Nie znaleziono zasobu'});
});

// obłsuga błędów globalnych
app.use((err, req, res) => {
  // logowanie błędów
  console.error(err.stack);

  // error w JSON
  res.status(err.status || 500).json({
    message: err.message || "Wystąpił błąd serwera",
    error: req.app.get('env') === 'development' ? err : {},
  });
});

// logowanie zapytań
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