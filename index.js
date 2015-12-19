/*
* Rebecca P @ Pivotal, Toronto
* rputinski@pivotal.io
*/

var DEBUG = process.env.DEBUG === 'true';
var envServices;
var sendgrid;
if (!DEBUG) {
    envServices = JSON.parse(process.env.VCAP_SERVICES);
    sendgrid = require('sendgrid')(envServices.sendgrid[0].credentials.username, envServices.sendgrid[0].credentials.password);
}
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

    if (user.name === process.env.YHMUSER && user.pass === process.env.YHMPASS) {
        return next();
    }
    return unauthorized(res);
}
if (!DEBUG) {
    app.use(authMiddleware);
}

var mongoose = require('mongoose');

if (DEBUG) {
    mongoose.connect('mongodb://localhost/youhavemail');
} else {
    var mongo = envServices.mongolab[0];
    mongoose.connect(mongo.credentials.uri);
}

var pivotSchema = mongoose.Schema({
    name: String,
    email: String,
    photo: String
});
var Pivot = mongoose.model('Pivot', pivotSchema);

var emailSchema = mongoose.Schema({
    subject: String,
    from: String,
    message: String,
    fromName: String
});
var EmailConfig = mongoose.model('EmailConfig', emailSchema);

app.get('/emailConfig', function(req, res) {
    EmailConfig.findOne().then(function(config) {
        res.status(200).json(config).end();
    })
});

app.post('/emailConfig', function(req, res) {
    EmailConfig.findOneAndUpdate({}, {
        from: req.body.from,
        fromName: req.body.fromName,
        message: req.body.message,
        subject: req.body.subject
    }, function(err, config) {
        if (err) {
            res.status(500).json({error: err}).end();
        } else {
            res.status(200).json(config).end();
        }
    });
});

app.get('/pivots', function(req, res) {
    Pivot.find().then(function(docs) {
        res.status(200).json(docs).end();
    });
});

app.post('/send', function(req, res) {
    var emails = req.body;
    console.log(emails);
    var emailConfig = EmailConfig.findOne()
        .then(function(emailConfig) {
          console.log("found email config" + emailConfig);
            var email = {
                to: emails,
                from: emailConfig.get('fromEmail'),
                fromname: emailConfig.get('fromName'),
                subject: emailConfig.get('subject'),
                text: emailConfig.get('message')
            }
            sendgrid.send(email, function(err, json) {
                if (err) {
                    console.log(err);
                    res.status(500).json({error: 'Sending email failed'}).end();
                } else {
                    console.log(json);
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
                    res.status(500).json({error: 'Creating pivots'}).end();
                } else {
                    res.status(200).json({message: 'Created pivots'}).end();
                }
            });
        }
    });
});

app.get('/', function(req, res) {
    res.status(200).sendFile('index.html', {root: __dirname}, function(err) {
        if (err) {
            console.log(err);
            res.status(err.status).end();
        }
    });
});

var server = app.listen(process.env.PORT, function() {
    console.log("Started on " + process.env.PORT);
});
