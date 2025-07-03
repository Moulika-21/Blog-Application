const express = require('express');
const session = require('express-session');
const path = require('path');
const userRoute = require('./routes/user');
const blogRoute = require('./routes/blog');
const mysql = require('mysql'); 
const methodOverride = require('method-override'); //to override post method as delete
const { error } = require('console');

const app = express();
const PORT = 8000;

const db =mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'blog_app',
    port : 4307
});

db.connect((err) => {
    if(err) console.log(err);
    console.log('MySql Connected');
});

app.use(session({
    secret : 'mykey',
    resave: false,
    saveUninitialized : false,
}));



app.use(methodOverride('_method'));
//Make db available in all routes
app.use((req,res,next) => {
    req.db = db;
    res.locals.user = req.session.user || null;
    next(); 
});

app.use((req, res, next) => {
  res.locals.success = req.session.success;
  delete req.session.success;
  next();
});

app.use(express.static('public'));
app.set('view engine','ejs');
app.set('views',path.resolve("./views"));

app.use(express.urlencoded({extended : false}));
app.use(express.json());
app.use(express.static(path.resolve("./public")));


app.use('/user',userRoute);
app.use('/blog',blogRoute);

app.get('/',(req,res) => {
    res.render('splash');
})

app.get('/home',(req,res) => {
    const db = req.db;
    db.query('select * from blogs order by createdAt DESC',(err,blogs) => {
        if(err) throw err;
        console.log("User in locals:", res.locals.user);
        res.render('home',{blogs,error: req.query.error || null});
    });
});

app.listen(PORT, () => console.log('Server Started'));