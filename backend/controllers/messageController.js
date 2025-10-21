const Messages = require("../models/messageModel");

const getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    const messages = await Messages.find({
      users: {
        $all: [from, to],
      },
    }).sort({ updatedAt: 1 });

    const projectedMessages = messages.map((msg) => {
      return {
        fromSelf: msg.sender.toString() === from,
        message: msg.message.text,
      };
    });
    res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};

const addMessage = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;
    const data = await Messages.create({
      message: { text: message },
      users: [from, to],
      sender: from,
    });
    
    if (data) {
      return res.json({ msg: "Tin nhắn đã được thêm thành công." });
    } else {
      return res.json({ msg: "Không thể thêm tin nhắn vào database." });
    }
  } catch (ex) {
    next(ex);
  }
};

module.exports = {
  getMessages,
  addMessage
}