var express = require('express'); 
var app = express();
const path = require('path');
app.set('view engine', 'ejs');
app.set('views', './app/views');

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
module.exports = function () {
  return app;
};