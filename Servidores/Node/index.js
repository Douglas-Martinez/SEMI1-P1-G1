//Requires
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const uuid = require('uuid');
const mysql = require('mysql');

//AWS
const AWS = require('aws-sdk');
const aws_keys = require('./creds');
const s3 = new AWS.S3(aws_keys.s3);

//MYSQL
const db_credentials = require('./db');
var conn = mysql.createPool(db_credentials);

//Configuration
const port = process.env.PORT || 3000;
const app = express();

//Middlewares
app.set('json spaces', 2);
app.use(morgan('dev'));
app.use(cors(
    {
        origin: true,
        optionsSuccessStatus: 200
    }
));
app.use(
    bodyParser.json({
        limit: '10mb',
        extended: true
    })
);
app.use(
    bodyParser.urlencoded({
        extended: true
    })
);

//Rutas
/*
app.get("/getdata", async (req, res) => {
    conn.query(`SELECT * FROM usuario`, function (err, result) {
        if (err) throw err;
        res.send(result);
    });
});
*/


app.listen(port, (err) => {
    if(err) console.log('Ocurrio un error'), process.exit(1);

    console.log(`Escuchando en puerto ${port}`);
});