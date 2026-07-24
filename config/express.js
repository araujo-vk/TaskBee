var express = require('express'); 

var app = express();

app.set('view engine', 'ejs');
app.set('views', './app/views');

app.use(express.urlencoded({ extended: true }));

module.exports = function () {
  return app;
};