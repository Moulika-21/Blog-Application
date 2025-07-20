const {Router} = require("express");
const transporter = require('../views/mailer');
const bcrypt = require('bcrypt');
const router = Router();
const saltRounds=10;
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve('./public/uploads/'));
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

router.get("/signin", (req,res) => {
    return res.render("signin");
});

router.get("/signup", (req,res) => {
    return res.render("signup");
});

router.post('/signup',(req,res) => {
    const {fullName,email,password} = req.body;
    const db =req.db;
    const saltRounds=10;

    if(!fullName || !email || !password){
        return res.render("signup",{error :'All fields are required!'});
    }
    try{
        db.query('select * from users where email = ?',[email],async(err,result) => {
            if(err) throw err;

            if(result.length > 0){
                return res.render("signup",{error : 'Email already registered'});
            }

            const hashedPassword = await bcrypt.hash(password,saltRounds);

            const user = {fullName , email , password : hashedPassword, role: 'normal', profileImageurl : 'default.jpg'};

            db.query('insert into users set ?',[user],(err,result) => {
                if(err) throw err;

                const mailOptions ={
                    from : process.env.EMAIL_USER,
                    to: email,
                    subject : "Welcome to Moulika's Blog!",
                    text: `Hi ${fullName},\n\nThank you for registering on our blog platform. we're excited to have you onboard -Moulika`
                };
                
                console.log("Transporter:", transporter);
                transporter.sendMail(mailOptions,(error,info) => {
                    if(error) {
                        console.log("Email error:",error);
                    }
                    else{
                        console.log("Email Sent:",info.response);
                    }
                });

                req.session.user = {
                    id: result.insertId,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    profileImageUrl: user.profileImageUrl
                };
                return res.redirect('/signin');
            });
        });
    }
    catch(error){
        console.error(error);
        return res.send("Error in registration");
    }
});

router.post('/signin', (req,res) => {
    const {email,password} = req.body;
    const db = req.db;

    if (!email || !password) {
        return res.render("signin",{error: "All Fields are required"});
    }
        db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
            if (err) throw err;

            if (result.length === 0) {
                return res.render("signin",{error : "Incorrect Email or Password"});
            }
            const user = result[0];

            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.render("signin",{error : "Incorrect Email or Password"});
            }
            req.session.user = {
                id : user.id,
                fullname : user.fullname,
                email : user.email,
                role : user.role,
                profileImageUrl : user.profileImageUrl
            }
            res.redirect('/home');
        });
});

router.get('/logout',(req,res)=>{
    req.session.destroy(() => {
        res.redirect('/home');
    });
});

function isLoggedIn(req,res,next){
    if(req.session && req.session.user){
        res.locals.user=req.session.user;
        return next();
    }
    res.redirect('/user/signin');
}
router.get('/profile',isLoggedIn,(req,res)=>{
    const db = req.db;
    db.query('select fullname,email,profileImageUrl from users where id= ?',[req.session.user.id],(err,blogs) => {
        if(err) throw err;
        console.log("User in locals:", res.locals.user);
        const user=blogs[0];

        db.query('SELECT id, title, coverImageURL, createdAt FROM blogs WHERE createdBy = ? ORDER BY createdAt DESC', [req.session.user.id], (err, blogResults) => {
            if (err) throw err;
            res.render('profile',{user,blogs:blogResults});
        });
    });
});

router.get('/edit-profile', isLoggedIn, (req, res) => {
  const db = req.db;
  const userId = req.session.user.id;

  db.query('SELECT * FROM users WHERE id = ?', [userId], (err, result) => {
    if (err) throw err;
    const user = result[0];
    res.render('editProfile', { user });
  });
});

router.post('/edit-profile', isLoggedIn, upload.single('profileImage'), (req, res) => {
  const db = req.db;
  const userId = req.session.user.id;
  const { fullname, email } = req.body;

  const updateData = [fullname, email];
  let query = 'UPDATE users SET fullname = ?, email = ?';

  if (req.file) {
    const imagePath = `/uploads/${req.file.filename}`;
    query += ', profileImageUrl = ?';
    updateData.push(imagePath);
  }

  query += ' WHERE id = ?';
  updateData.push(userId);

  db.query(query, updateData, (err, result) => {
    if (err) throw err;
    req.session.user.fullname = fullname;
    req.session.user.email = email;
    if (req.file) req.session.user.profileImageUrl = `/uploads/${req.file.filename}`;

    res.redirect('/user/profile');
  });
});

router.get('/analytics',isLoggedIn,(req,res) => {
    const db = req.db;
    const userId = req.session.user.id;

    db.query(`select blogs.title, 
        COUNT(DISTINCT blog_views.id) as views,
        COUNT(DISTINCT likes.id) as likes,
        COUNT(DISTINCT comments.id) as comments
        from blogs 
        left join blog_views on blogs.id = blog_views.blog_id
        left join likes on blogs.id = likes.blog_id 
        left join comments on blogs.id = comments.blogId
        where blogs.createdBy = ? 
        group by blogs.id`,
        [userId],(err,result) => {
            if(err) throw err;
            res.render('analytics', { analyticsData : result});
        }
    );
});

module.exports = router;
