const { Pool, Client } = require('pg');
const express = require('express');
const config = require('./config.json');
const path = require('path');
const app = express();
require('ejs');
const { SHA3 } = require('sha3');
const hash = new SHA3(512);

const PORT = process.env.PORT || 3000;

const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

app.use(express.urlencoded({extended : false}));
app.use(express.json());

app.use(express.static('css'));
app.use(express.static('data'));

const pool = new Pool({
    user: config.dbuser,
    host: config.dbhost,
    database: config.dbuser,
    password: config.dbpass,
    port: config.dbport
});

app.get('/', (req,res) => {
    pool.query('SELECT * FROM posts ORDER BY dateUploaded DESC LIMIT 5', (err, response) => {
        if (err) {
          console.log(err)
        } else { 
            res.render('home.ejs',{month: month, loginError: false, posts: response.rows});
        } 
    });
})

app.post('/', function(req, res){
    if(req.body.year) {
        pool.query('SELECT * FROM users WHERE username=$1', [req.body.usernameRegister], (err, response) => {
            if(err) {
                console.log(err)
            } else {
                if(response.rows[0] == undefined) {
                    let dob = `${req.body.year}-${month.indexOf(req.body.month) + 1}-${req.body.day}`;
                    hash.update(req.body.password1);
                    let text = 'INSERT INTO users(username,firstname,lastname,email,pw,dob,gender) VALUES($1, $2, $3, $4, $5, $6, $7)';
                    let values = [req.body.usernameRegister, req.body.firstname, req.body.lastname, req.body.email, hash.digest('hex'), dob, req.body.gender];

                    hash.reset();
                
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
                hash.update(req.body.passwordLogin);
              if ( response.rows[0] == undefined){
                    res.render('home.ejs',{month: month, loginError: true});
              } else if(hash.digest('hex') != response.rows[0].pw){
                    res.render('home.ejs',{month: month, loginError: true});
                  hash.reset();
              } else {
                  res.send("uspesna najava");
                  hash.reset();
              }
            }
        });
    }
});

app.get('/check', (req, res) => {
    let text = `SELECT username FROM users WHERE username = $1`;
    let values = [req.query.username];
    pool.query(text, values, (err, response) => {
        if (err) {
          console.log(err)
        } else {
            if(response.rows[0]) {
                res.send(response.rows[0]);
            } else {
                res.send({username: false});
            }
        }
    });
});

app.get('/profile', (req, res) => {
    res.render('profile.ejs',{activeNow: 'photos'});
});

app.listen(PORT, _ => {
    console.log(`Server has started on port ${PORT}`);
})