### You Have Mail!

Let someone know they received mail. For use in the Pivotal Toronto office. Live-filtering of emails,

Mongo + Node + Express + cobbled HTML/CSS/jQuery + sendgrid

#### Build && Run Debug
You need: node, npm, mongo
```
$ npm install
$ npm start
```

#### Deploy
Deployed on PWS.
Set `YHMUSER` and `YHMPASS` env variables in PWS. Add & bind the mongo and sendgrid services.
Modify `manifest.yml` as necessary.
```
cf push
```

#### Updating Pivots data
Since the pivots API was annoying to authenticate against, there is a POST endpoint that accepts the JSON from `https://pivots.pivotallabs.com/api/users.json`. Log in to pivots with okta, grab this data, then save it to a file called `pivots.json`.

```
$ curl -X POST -H 'Content-Type: application/json' --user $YHMUSER -p --data @pivots.json 'http://youhavemail.cfapps.io/addPivots?location=Toronto'
```

This updates the Pivots' emails.
