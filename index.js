const express = require('express');
const cors    = require('cors');
const mysql   = require('mysql');
const geoip   = require('geoip-country');
// dbInfo contains host, user, password, database parameters.
const dbInfo  = require('./dbInfo.json');
// Custom json for allowed data that contains values for each required value.
// For now, it contains only appId and deviceSize.
// This is used only for validation to prevent sql injection
const allowed = require('./allowed.json');
const app     = express();

// Use Cors
app.use(cors());

// Fetch the real ip even if the client was behind a proxy
app.set('trust proxy', true)

// Port to deploy this server
const PORT = process.env.PORT || 3030;

// Returns the sql query statement
function getQueryStatement(ip, appId, deviceSize, ipInfo)
{
    return `insert into ${appId} (ip, country, timestamp, devicesize) values ('${ip}', '${ipInfo.country}', '${(new Date()).toISOString().slice(0, 19).replace('T', ' ')}', '${deviceSize}')`;
}

// Returns ip address if from behind nginx proxy
function getIp(req)
{
    return req.headers['x-real-ip'] || req.ip;
}

// Get your own ip Handler => Only for test purposes.
app.get("/ip", (req, res) =>
{
    res.send({ ip: getIp(req), ipInfo: geoip.lookup(getIp(req)) });
})

// Register View Handler
app.get("/registerView", (req, res) =>
{
    // Get app id
    const appId = req.query.appId;
    // Get device size
    const deviceSize = req.query.deviceSize;
    // Get ip address
    const ip = getIp(req);

    // Validate data if present
    if (!appId || !deviceSize)
        return res.status(400).send({ message: "Insufficient query arguments." });

    // Validate data if allowed
    if (allowed.appId.indexOf(appId) < 0 || allowed.deviceSize.indexOf(deviceSize) < 0)
        return res.status(422).send({ message: "The supplied query arguments are invalid." });

    // Get ip info from geoip
    var ipInfo = geoip.lookup(ip);
    // RASPBERRYPI Node environment is not updated enough to understand ?? operator.
    // Check if ipInfo is not null. If it is, return empty object.
    if (!ipInfo)
        ipInfo = {};

    // Register View with the db
    var connection = mysql.createConnection(dbInfo);
    // Start Connection
    connection.connect();
    // Send Request to db
    connection.query(getQueryStatement(ip, appId, deviceSize, ipInfo), function (error, results, fields) {
        // Close db connection
        connection.end();
        // Respond with Error
        if (error)
            return res.status(400).send({ message: "Error with registering to db.", error: error, query: getQueryStatement(ip, appId, deviceSize, ipInfo) });
        // Respond with Success
        return res.status(200).send({ message: "Success!" });
    });
})

// Listen to port.
app.listen(PORT, () =>  console.log(`server started on port ${PORT}`));