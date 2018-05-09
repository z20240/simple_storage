var express = require('express');
var redis = require('redis');
var router = express.Router();
const {promisify} = require('util');

var client = redis.createClient();
client.on("error", (err) => {
    console.log("Error " + err);
});

router.get('/', function(req, res, next) {
});

/**
 * Method: POST
 * Endpoint: /object
 * Body: JSON: {mykey : value1}
 * Time: 6.00 pm
 * Response: {"key":"mykey", "value":"value1", "timestamp": time } //Where time is timestamp of the post request (6.00pm) .
 */
router.post('/object', function(req, res, next) {
    let now =  Math.floor(Date.now() / 1000);
    let obj = {};

    Object.keys(req.body).forEach(key => {
        client.set(key, JSON.stringify(req.body[key]));
        client.set(`${key} ${now}`, JSON.stringify(req.body[key]));
        obj = {"key": key, "value": req.body[key], "timestamp": now};
    })

    return res.json(obj);
});

/**
 * Method: GET
 * Endpoint: /object/mykey
 * Endpoint: /object/mykey?timestamp=1440568980 [6.03pm] // notice that the time here is not exactly 6.00pm
 * Response: {"value": value1 } // still return value 1 , because value 2 was only added at 6.05pm
 */
router.get('/object/:key', function(req, res, next) {
    let timestamp = parseInt(req.query.timestamp);
    let key = req.params.key;
    let qry_key = req.params.key + " [0-9]*";
    let latest_time;
    let pre_do;

    pre_do = timestamp ? getLatestTimeByKey(qry_key, timestamp) : Promise.resolve(undefined);

    pre_do.then((last_time) => {

        if (last_time < 0)
            return res.json({ "value" : ""});

        client.get(key + (last_time ? ` ${last_time}` :""), (err, value) => {
            if (err)
                return res.json({"err": "error occured in get value"});

            res.json({"value" : value});
        })
    });
});

/**
 * @param {string} qry_key using for query timestamp by key
 * @param {number} timestamp user input timestamp
 * @return {promise}
 */
function getLatestTimeByKey(qry_key, timestamp) {
    return new Promise((reslove, reject) => {
        let max_time = -1;
        client.keys(qry_key, (err, keys) => {
            if (err) reject(err);

            keys.forEach(key => {
                let t_stamp = key.match(/ (\d+)$/)[1];
                max_time = (timestamp >= t_stamp && t_stamp >= max_time) ? t_stamp : max_time;
            });
            reslove(max_time);
        });
    });
}

module.exports = router;
