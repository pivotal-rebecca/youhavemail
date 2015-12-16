/*
* What an adorable little server
*/
var express = require('express');
var sendgrid = require('sendgrid');
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

var pivotSchema = mongoose.Schema({
    name: String,
    email: String,
    photo: String
});
var Pivot = mongoose.model('Pivot', pivotSchema);

var emailSchema = mongoose.Schema({
    subject: String,
    from: String,
    message: String
});
var EmailConfig = mongoose.model('EmailConfig', emailSchema);
EmailConfig.findOneAndUpdate({},
    {
        subject: 'You have mail!',
        from: 'jdeininger@pivotal.io',
        message: 'You have mail in the mail area on the 11th floor.'
    }, {upsert: true},
    function(err, config) {
        console.log("email config created");
    });

app.get('/pivots', function(req, res) {
    Pivot.find().then(function(docs) {
        res.status(200).json(docs).end();
    });
});

app.post('/send', function(req, res) {
    var emails = req.body;
    var emailConfig = EmailConfig.findOne()
        .then(function(emailConfig) {
            var email = {
                to: emails,
                subject: emailConfig.get('subject'),
                text: emailConfig.get('message')
            }
            sendgrid.send(email, function(err, json) {
                if (err) {
                    console.log(err);
                    res.status(500).json({error: 'Sending email failed'}).end();
                } else {
                    res.status(200).json({message: 'Sent emails! Hopefully people get their mail soon.'}).end();
                }
            });
        })
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
