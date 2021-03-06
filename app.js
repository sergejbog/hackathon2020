const { Pool, Client } = require('pg');
const express = require('express');
const config = {
    "dbhost": "rogue.db.elephantsql.com",
    "dbuser": "mlgkgimi",
    "dbpass": "TUHNL0YIUcTmJEJ21LZwKv9URVRimFPy",
    "dbport": 5432,
    "secret": "LjLS=ULfCZ4F$5KtFWTF%fLwqBCr+gsP?5yg#9B9#N=??W2WX"
};
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

var transporter = nodemailer.createTransport({
    service: 'yahoo',
    auth: {
        user: 'hackathon2020@yahoo.com',
        pass: 'kijodjzcwupsptmi'
    }
});


app.get('/', (req,res) => {
    if(req.session.userId){
        makeQuery(req.session.username, req.session.userId, req.session.isVerified,req.session.profilePic, res, true, req.session.points);
    } else {
        res.render("home.ejs", {loggedOn : false, month: month, loginError: false})
    }
})



app.get('/reset-pass',(req,res) =>{
    if(req.body.us){
        pool.query("SELECT * FROM users WHERE username=$1",[req.body.us],(err,res) =>{
            if(err){
                console.log("GRESKA");
                console.log(err);
            }else{
                // if (res.rows[0] != undefined) {
                    console.log("PASS SE SMENA.");
                    pool.query("UPDATE users SET pw=$1 WHERE username=$2", [req.query.newpw1, req.body.us], (err, res) => {
                        if (err) { console.log(err) }
                        else { console.log(res) }
                    });
                    pool.query("DELETE FROM verification WHERE mailToken=$1", [req.query.token], (err,response) => {
                        if(err) {console.log(err)}
                        else {console.log(response)}
                    });
                    res.render('home.ejs', { month: month, loginError: false, posts: response.rows, loggedOn: false }); 
                // } else {
                //     res.send('This user does not exist.')
                // }
            }
        })

    }else{
        console.log(req.query.tokenpw);
        pool.query("SELECT * FROM resetpass WHERE passToken=$1", [req.query.tokenpw], (err, response) => {
            if (err) { console.log(err) }
            else {
                if (response.rows[0].username != undefined) {
                    res.render('resetpw.ejs');
                } else res.send("This user does not exist.")
            }
        });
    }

})

app.get('/verify-account', (req, res) => {
    console.log(req.query.token);
    pool.query("SELECT * FROM verification WHERE mailToken=$1", [req.query.token], (err, response) => {
        if (err) { console.log(err) }
        else {
            if (response.rows[0] != undefined) {
                pool.query("UPDATE users SET verified=$1 WHERE username=$2", [true, response.rows[0].username], (err, res) => {
                    if (err) { console.log(err) }
                    else { console.log(res) }
                });
                pool.query("DELETE FROM verification WHERE mailToken=$1", [req.query.token], (err,response) => {
                    if(err) {console.log(err)}
                    else {console.log(response)}
                });
                res.render('home.ejs', { month: month, loginError: false, posts: response.rows, loggedOn: false }); 
            } else {
                res.send('This user does not exist.')
            }
        }
    });
})

app.post('/', function(req, res){
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



                    let randomStringToken = randomstring.generate();

                    pool.query("INSERT INTO verification(username,mailToken) VALUES($1,$2)", [req.body.usernameRegister, randomStringToken], (err, response) => {
                        if (err) { console.log(err) }
                        else {
                            console.log(response);
                        }
                    });

                    const url = `http://localhost:3000/verify-account?token=${randomStringToken}`;


                    var mailOptions = {
                        from: 'hackathon2020@yahoo.com',
                        to: req.body.email,
                        subject: "Please confirm your Email account",
                        html: "Hello " + req.body.firstname + ", <br> Please Click on the link to verify your email.<br><a href=" + url + ">Click here to verify</a>"
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
                            console.log("2")
                            console.log(err)
                        } else {
                            res.send("Successful registration. Check your e-mail for verification.")
                        }
                    });
                    res.render("success.ejs")
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

    else if(req.body.resetpw){
        pool.query('SELECT * FROM users WHERE username=$1', [req.body.resetpw], (err, response) =>{
            if (err) {
                console.log(err)
            }else{
                if(response.rows[0]==undefined){
                    res.send("This user does not exist.");
                }else{
                    let resetToken = randomstring.generate();

                    const url = `http://localhost:3000/reset-pass?tokenpw=${resetToken}`;
                    

                    var mailOptions = {
                        from: 'hackathon2020@yahoo.com',
                        to: response.rows[0].email,
                        subject: "Change password",
                        html: "Hello " + response.rows[0].firstname + ", <br> Please Click on the link to change your password.<br><a href=" + url + ">Click here to change password</a>"
                    };
                    transporter.sendMail(mailOptions, function (error, info) {
                        if (error) {

                            console.log(error);
                        } else {
                            console.log('Email sent: ' + info.response);
                        }
                    });
                    pool.query("INSERT INTO resetpass(username,passtoken) VALUES($1,$2)", [req.body.resetpw, resetToken], (err, resp) => {
                        if (err) { console.log(err) }
                        else {
                            res.send("Check your email!")
                        }
                    });
                }
                

            }
        })

    }

    else{
        res.send("rip");
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
                    pool.query('Select * FROM posts WHERE username=$1',[username], (err,responsePosts) => {
                        if(err) console.log(err);
                        else {
                            let photoNames = [];
                            for(let i = 0; i < responsePosts.rows.length; i++) {
                                photoNames.push(responsePosts.rows[i].photoname);
                            }
                            console.log('hello');
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
                                    profilePic: response.rows[0].profilepicture,
                                    posts: photoNames,
                                    postRows: Math.ceil(photoNames.length / 3)
                                },
                                activeNow: 'photos'
                            });
                        }
                    });
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