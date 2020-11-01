const { Pool, Client } = require('pg');
const express = require('express');
const config = require('./config.json');
const path = require('path');
const fs = require('fs');
const app = express();
require('ejs');
const session = require('express-session');
const upload = require('express-fileupload');
  
const { SHA3 } = require('sha3');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const randomstring = require("randomstring");
const { render } = require('ejs');
const hash = new SHA3(512);
// const verify = require('verify-user.js');
const PORT = process.env.PORT || 3000;

const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

app.use(express.urlencoded({ extended: false }));
app.use(express.json());


app.use(express.static('css'));
app.use(express.static('data'));

app.use(session({
    secret: config.secret,
    resave: false,
    saveUninitialized: false,
}));

app.use(upload());

const pool = new Pool({
    user: config.dbuser,
    host: config.dbhost,
    database: config.dbuser,
    password: config.dbpass,
    port: config.dbport
});

app.get('/', (req,res) => {
    console.log("od ovde " + req.session.userId);
    if(req.session.userId){
        makeQuery(req.session.username, req.session.userId, req.session.isVerified,req.session.profilePic, res, true, req.session.points);
    } else {
        res.render("home.ejs", {loggedOn : false, month: month, loginError: false})
    }
})
app.get('/verify-account',(req,res) => {
    console.log(req.query);
})

app.post('/', function(req, res){
    console.log(req.body.year);
    console.log(req.body.usernameLogin);
    console.log(req.body.userImage);

    if(req.body.year) {
        pool.query('SELECT * FROM users WHERE username=$1', [req.body.usernameRegister], (err, response) => {
            if (err) {
                console.log(err)
            } else {
                if (response.rows[0] == undefined) {
                    let dob = `${req.body.year}-${month.indexOf(req.body.month) + 1}-${req.body.day}`;
                    hash.update(req.body.password1);
                    let text = 'INSERT INTO users(username,firstname,lastname,email,pw,dob,gender) VALUES($1, $2, $3, $4, $5, $6, $7)';
                    let values = [req.body.usernameRegister, req.body.firstname, req.body.lastname, req.body.email, hash.digest('hex'), dob, req.body.gender];
                    
                        
                    var transporter = nodemailer.createTransport({
                        service: 'yahoo',
                        auth: {
                          user: 'hackathon2020@yahoo.com',
                          pass: 'kijodjzcwupsptmi'
                        }
                    });
                    
                    const url = `http://localhost:3000/verify-account?token=${randomstring.generate()}`;
                    
                    var mailOptions = {
                        from: 'hackathon2020@yahoo.com',
                        to: req.body.email,
                        subject : "Please confirm your Email account",
                        html : "Hello "+ req.body.firstname+", <br> Please Click on the link to verify your email.<br><a href="+url+">Click here to verify</a>"
                    };
                    transporter.sendMail(mailOptions, function (error, info) {
                        if (error) {
                          console.log(error);
                        } else {
                          console.log('Email sent: ' + info.response);
                        }
                    });
                    

                    hash.reset();
                    pool.query(text, values, (err, response) => {
                        if (err) {
                            console.log(err)
                        } else {
                            console.log(response)
                        }
                    });
                    res.render("congratulations.ejs")
                } else {
                    res.render("error.ejs", {error: "User already exists!"});
                }
            }
        });
    }

    else if(req.body.usernameLogin){
        let text = `SELECT * FROM users WHERE username = $1`;
        let values = [req.body.usernameLogin];

        pool.query(text, values, (err, response) => {
            if (err) {
                console.log(err)
            } else {
                hash.update(req.body.passwordLogin);
              if ( response.rows[0] == undefined){
                    res.render('home.ejs',{month: month, loginError: true, loggedOn: false});
              } else if(hash.digest('hex') != response.rows[0].pw){
                    res.render('home.ejs',{month: month, loginError: true, loggedOn: false});
                  hash.reset();
              } else {
                    hash.reset();
                    console.log(response.rows[0])
                    req.session.userId = response.rows[0].id;
                    req.session.username = response.rows[0].username;
                    req.session.isVerified = response.rows[0].verified;
                    req.session.profilePic = response.rows[0].profilepicture;
                    req.session.points = response.rows[0].points;
                    req.session.loggedOn = true;

                    makeQuery(req.session.username, req.session.userId, req.session.isVerified,req.session.profilePic, res, req.session.loggedOn);
              }
            }
        });
    }

    else if(req.files) {
        let text = 'INSERT INTO posts(username,description,photoName,dateUploaded) VALUES($1,$2,$3,$4)';
        let description = req.body.userDescription || "";
        let file = req.files.userImage;
        let filename = file.name;
        let values = [req.session.username,description,filename,'NOW()'];

        pool.query(text, values, (err, response) => {
            if (err) {
                console.log(err)
            } else {console.log("Upload done")  }
        });

        file.mv("./data/posts/" + filename, (err) => {
            if(err) {
                console.log(err);
            } else {
                makeQuery(req.session.username, req.session.userId, req.session.isVerified,req.session.profilePic, res, true);
            }
        });
    }
     else{
        res.render("error.ejs", {error: "A fatal error has occurred"});
    }
});

app.get('/check', (req, res) => {
    let text = `SELECT username FROM users WHERE username = $1`;
    let values = [req.query.username];
    pool.query(text, values, (err, response) => {
        if (err) {
            console.log(err)
        } else {
            if (response.rows[0]) {
                res.send(response.rows[0]);
            } else {
                res.send({ username: false });
            }
        }
    });
});

app.get('/*',(req,res) => {
    let username = req.path.split('/')[1];
    pool.query('SELECT * FROM users WHERE username=$1',[username], (err, response) => {
        if(err) console.log(err);
        else {
            if(response.rows[0]) {
                if(req.session.loggedOn == undefined) res.render("home.ejs", {loggedOn : false, month: month, loginError: false});
                else {
                    res.render('profile.ejs',{
                        loggedOn: true,
                        user:{
                            username: req.session.username,
                            id: req.session.userId,
                            isVerified: req.session.isVerified,
                            profilePic: req.session.profilePic,
                            points: req.session.points
                        },
                        profile: {
                            username: response.rows[0].username,
                            profilePic: response.rows[0].profilepicture
                        },
                        activeNow: 'photos'
                    })
                }
               
            } else {
                    res.render("error.ejs", {error:"Page Doesn't Exist!"});
            }
        }
    })
});

app.listen(PORT, _ => {
    console.log(`Server has started on port ${PORT}`);
});

function makeQuery(userName,userId,verification,profilePic, res, loggedOn,points) {
    pool.query('SELECT * FROM posts ORDER BY postid DESC LIMIT 5', (err, response) => {
        if (err) {
          console.log(err)
        } else { 
            res.render('home.ejs',{
                loggedOn: loggedOn,
                month: month,
                posts: response.rows, 
                user:{
                    username: userName,
                    id: userId,
                    isVerified: verification,
                    profilePic: profilePic,
                    points:points

                },
                loginError: false
            })
         };
    });
} 