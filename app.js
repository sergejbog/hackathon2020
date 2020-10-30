const { Pool, Client } = require('pg');
const express = require('express');
const config = require('./config.json');
const path = require('path');
const app = express();
require('ejs');

const PORT = process.env.PORT || 3000;

const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

app.use(express.urlencoded());
app.use(express.json());

app.use(express.static('css'));

const pool = new Pool({
    user: config.dbuser,
    host: config.dbhost,
    database: config.dbuser,
    password: config.dbpass,
    port: config.dbport
});

app.get('/', (req,res) => {
    res.render('home.ejs',{month: month});
})

app.post('/', function(req, res){
    let dob = `${req.body.year}-${month.indexOf(req.body.month) + 1}-${req.body.day}`;

    text = 'INSERT INTO users(username,firstname,lastname,email,pw,dob,gender) VALUES($1, $2, $3, $4, $5, $6, $7)';
    values = [req.body.usernameRegister, req.body.firstname, req.body.lastname, req.body.email, req.body.password1, dob, req.body.gender];

    pool.query(text, values, (err, res) => {
        if (err) {
          console.log(err)
        } else {
          console.log(res)
        }
    });
    res.render("home.ejs",{month: month})
});

app.listen(PORT, _ => {
    console.log(`Server has started on port ${PORT}`);
})