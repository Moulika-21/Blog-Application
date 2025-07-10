require("dotenv").config()
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
     const query = `
        SELECT blogs.*, categories.name AS categoryName 
        FROM blogs 
        LEFT JOIN categories ON blogs.category_id = categories.id 
        ORDER BY categories.name, blogs.createdAt DESC`;

    db.query(query,(err,results ) => {
        if(err) throw err;
        console.log("User in locals:", res.locals.user);

        const groupedBlogs = results.reduce((acc, blog) => { //.reduce() is used to transform an array into a single value — in this case,
        //  into an object grouped by category and acc means accumulator which is similar to results.forEach().
        
            const category = blog.categoryName || 'Uncategorized';
            if (!acc[category]) acc[category] = [];
            acc[category].push(blog);
            return acc;
        }, {});
        

        res.render('home',{groupedBlogs,error: req.query.error || null});
    });
});

app.get('/search',(req,res) => {
    const searchTerm = `%${req.query.term}%`;
    console.log('search term:',searchTerm);

    const query =` SELECT blogs.*, categories.name AS categoryName 
        FROM blogs 
        LEFT JOIN categories ON blogs.category_id = categories.id 
        WHERE blogs.title LIKE ? OR blogs.body LIKE ? OR categories.name LIKE ?
        ORDER BY categories.name, blogs.createdAt DESC`;

    db.query(query,[searchTerm, searchTerm, searchTerm],(err,results) => {
        if(err) throw err;

        const groupedBlogs = {};
        results.forEach(blog => {
            const category = blog.categoryName || 'Uncategorized';
            if (!groupedBlogs[category]) {
                groupedBlogs[category] = [];
            }
            groupedBlogs[category].push(blog);
        });

        console.log("Grouped Blogs:", groupedBlogs);
        res.render('home',{groupedBlogs});
    });
});

app.listen(PORT, () => console.log('Server Started'));
