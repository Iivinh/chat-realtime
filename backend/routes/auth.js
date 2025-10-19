const router = require('express').Router();
const userController = require('../controllers/userController');

router.post('/login', userController.login);
router.post('/register', userController.register);
// router.get("/allusers/:id", getAllUsers);
// router.post("/setavatar/:id", setAvatar);
// router.get("/logout/:id", logOut);

module.exports = router;
