const express = require('express');
const app = express();
const GitHub = require('./github')
const gh = new GitHub();

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
   res.sendfile(__dirname + '/public/index.html');
});

app.get('/overview', (req, res) => {
   res.sendfile(__dirname + '/public/overview.html');
});

app.get('/data.json', (req, res) => {
   gh.fetchData((err, data) => {
      res.json(data);
   });
});

app.get('/trigger_refresh', (req, res) => {
   res.set('Content-Type', 'plain/text');
   gh.refresh(() => res.send(""));
});

app.listen(process.env.PORT);
console.log('Listening on port ' + process.env.PORT);
