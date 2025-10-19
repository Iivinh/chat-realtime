const router = require('express').Router();
const messageController = require('../controllers/messageController');

router.post('/addmsg/', messageController.addMessage);
router.post('/getmsg/', messageController.getMessages);

module.exports = router;
