const { Pool, Client } = require('pg');
const express = require('express');
const config = require('./config.json');
const path = require('path');
const app = express();
require('ejs');
const md5 = require('md5');

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

    console.log(req);
})

app.post('/', function(req, res){

    if(req.body.year) {
        pool.query('SELECT * FROM users WHERE username=$1', [req.body.usernameRegister], (err, response) => {
            if(err) {
                console.log(err)
            } else {
                if(response.rows[0] == undefined) {
                    let dob = `${req.body.year}-${month.indexOf(req.body.month) + 1}-${req.body.day}`;

                    let text = 'INSERT INTO users(username,firstname,lastname,email,pw,dob,gender) VALUES($1, $2, $3, $4, $5, $6, $7)';
                    let values = [req.body.usernameRegister, req.body.firstname, req.body.lastname, req.body.email, md5(req.body.password1), dob, req.body.gender];
                
                    pool.query(text, values, (err, response) => {
                        if (err) {
                          console.log(err)
                        } else {
                          console.log(response)
                        }
                    });
                    res.send("uspesna registracija")
                } else {
                    res.send("vejce postoj user");
                }
            }
        });        
    }

    else {
        let text = `SELECT pw FROM users WHERE username = $1`;
        let values = [req.body.usernameLogin];

        pool.query(text, values, (err, response) => {
            if (err) {
              console.log(err)
            } else {
              console.log(response.rows[0]);
              if ( response.rows[0] == undefined){
                  res.send("ne postoj username");
              } else if(md5(req.body.passwordLogin) != response.rows[0].pw){
                  res.send("gresen password");
              } else {
                  res.send("uspesna najava");
              }
            }
        });
    }
    
});

app.listen(PORT, _ => {
    console.log(`Server has started on port ${PORT}`);
})