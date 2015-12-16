/*
* What an adorable little server
*/
var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: '5mb'}));

var basicAuth = require('basic-auth');
var authMiddleware = function(req, res, next) {
    var unauthorized = function(res) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.sendStatus(401);
    }

    var user = basicAuth(req);
    if (!user || !user.name || !user.pass) {
        return unauthorized(res);
    }

    if (user.name === 'admin' && user.pass === 'password') {
        return next();
    }
    return unauthorized(res);
}
// app.use(authMiddleware);

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/youhavemail');

var schema = mongoose.Schema({
    name: String,
    email: String,
    photo: String
});
var Pivot = mongoose.model('Pivot', schema);

app.get('/pivots', function(req, res) {
    Pivot.find().then(function(docs) {
        res.status(200).json(docs).end();
    });
});

// Paste the result of https://pivots.pivotallabs.com/api/users
// in the body of a POST to /addPivots?location=Toronto
app.post('/addPivots', function(req, res) {
    var json = req.body;
    json.forEach(function(pivot) {
        if (pivot.location_name === req.query.location) {
            Pivot.findOneAndUpdate(
                {email: pivot.email},
                {
                    name: pivot.first_name+" "+pivot.last_name,
                    email: pivot.email,
                    photo: pivot.photo_url
                },
                {upsert: true}
            ).then(function(err, doc) {
                if (err) {
                    console.log(err);
                }
            });
        }
    });

    res.status(200).json({message: 'Created pivots'}).end();
});

app.get('/', function(req, res) {
    res.status(200).sendFile('index.html', {root: __dirname}, function(err) {
        if (err) {
            console.log(err);
            res.status(err.status).end();
        }
    });
});

var server = app.listen(3000, function() {
    console.log("Started on 3000");
});
