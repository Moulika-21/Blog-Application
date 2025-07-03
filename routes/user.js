const {Router} = require("express");
const bcrypt = require('bcrypt');
const router = Router();
const saltRounds=10;

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

                req.session.user = {
                    id: result.insertId,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    profileImageUrl: user.profileImageUrl
                };
                return res.redirect('/home');
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
router.get('/blogify',isLoggedIn,(req,res)=>{
    const db = req.db;
    db.query('select * from blogs where createdBy= ?',[req.session.user.id],(err,blogs) => {
        if(err) throw err;
        console.log("User in locals:", res.locals.user);
        res.render('blogify',{blogs});
    });
})

module.exports = router;
