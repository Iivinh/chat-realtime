const router = require('express').Router();
const userController = require('../controllers/userController');

router.post('/login', userController.login);
router.post('/register', userController.register);
router.get('/allUsers/:id', userController.getAllUsers);
router.get('/allConversationalUsers/:id', userController.getConversationalUsers);
router.get('/searchUser/', userController.searchUsers);
router.post("/setAvatar/:id", userController.setAvatar);
router.get("/logout/:id", userController.logout);

module.exports = router;
