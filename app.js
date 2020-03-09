require('dotenv').config()
const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const port = process.env.PORT || 8080;
const validUrl = require('valid-url');

const OktaJwtVerifier = require('@okta/jwt-verifier');
const clientid = process.env.OKTA_CLIENT_ID;
const oktaDomain = `https://${OKTA_DOMAIN}`

const oktaJwtVerifier = new OktaJwtVerifier({
    issuer: `${oktaDomain}/oauth2/default`,
    clientId: clientId
})

var parseUrl = function(url) {
    url = decodeURIComponent(url)
    if (!/^(?:f|ht)tps?\:\/\//.test(url)) {
        url = 'http://' + url;
    }

    return url;
};

app.get('/api/public', (req, res) => {
    res.status(200).send('Publicly accessible endpoint')
})

app.get('/', verifyToken, function(req, res) {
    oktaJwtVerifier.verifyAccessToken(req.token)
        .then(jwt => {
            var urlToScreenshot = parseUrl(req.query.url);

            if (validUrl.isWebUri(urlToScreenshot)) {
                console.log('Screenshotting: ' + urlToScreenshot);
                (async() => {
                    const browser = await puppeteer.launch({
                        args: ['--no-sandbox', '--disable-setuid-sandbox']
                    });

                    const page = await browser.newPage();
                    await page.goto(urlToScreenshot);
                    await page.screenshot().then(function(buffer) {
                        res.setHeader('Content-Disposition', 'attachment;filename="' + urlToScreenshot + '.png"');
                        res.setHeader('Content-Type', 'image/png');
                        res.send(buffer)
                    });

                    await browser.close();
                })();
            } else {
                res.send('Invalid url: ' + urlToScreenshot);
            }
        })
        .catch(err => {
            res.sendStatus(403)
        })
});

function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization']

    if (bearerHeader) {
        const bearer = bearerHeader.split(' ')
        const bearerToken = bearer[1]
        req.token = bearerToken
        next()
    } else {
        res.sendStatus(403)
    }
}

app.listen(port, function() {
    console.log('App listening on port ' + port)
})
