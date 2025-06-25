const {Router} = require("express");
const multer = require('multer');
const path = require('path');

const router = Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(`./public/uploads/`));
  },
  filename: function (req, file, cb) {
    const filename = `${Date.now()}-${file.originalname}`;
    cb(null, filename);
  }
})

const upload = multer({ storage: storage })

router.get('/add-new',(req,res) => {
    return res.render('addBlog',{
        user : req.session.user
    });
});

router.get('/:id',(req,res) => {
  const db = req.db;
  db.query("SELECT blogs.*, users.fullname, users.profileImageUrl FROM blogs JOIN users ON blogs.createdBy = users.id WHERE blogs.id = ?",[req.params.id],(err,result) => {
    if(err) throw err;
    const blog = result[0];
    db.query(`SELECT comments.*, users.fullname AS commenterName, users.profileImageUrl 
         AS commenterImage FROM comments 
         JOIN users ON comments.createdBy = users.id 
         WHERE comments.blogId = ? 
         ORDER BY comments.createdAt DESC`,[req.params.id],(err,commentResult) => {
         if(err) throw err;
         return res.render('blog',{blog,comments : commentResult});
    });
  });
});

router.post('/comment/:blogId' ,(req,res) => {
  const db = req.db;
  const comment = {content: req.body.content, blogId : req.params.blogId , createdBy : req.session.user.id};
  db.query("insert into comments set ?",comment,(err,result) => {
    if(err) throw err;
    return res.redirect(`/blog/${req.params.blogId}`);
  });
});

router.post('/',upload.single("coverImage"),(req,res) => {
    const { title,body } =req.body;
    const db = req.db;
    if(!title || !body || !req.file){
        return res.render("/",{error : 'All fields are required'});
    }
    const blog = {title : title, body :body , coverImageUrl : `/uploads/${req.file.filename}`, createdBy : req.session.user.id} ;
    db.query('insert into blogs set ?',blog ,(err,result) => {
        if(err) throw err;
        return res.redirect(`/blog/${result.InsertId}`);
    });
});

module.exports = router;