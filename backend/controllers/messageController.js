const Messages = require("../models/messageModel");


//Hàm lấy tất cả tin nhắn giữa 2 người dùng
const getMessages = async (req, res, next) => {
  try {
    // Lấy ID của người gửi (from) và người nhận (to) từ request body
    const { from, to } = req.body;

    // Tìm tất cả tin nhắn có cả 2 user ID trong mảng users
    const messages = await Messages.find({
      users: {
        $all: [from, to],
      },
    }).sort({ updatedAt: 1 }); // Sắp xếp theo thời gian cập nhật tăng dần (tin nhắn cũ trước)

    // Chuyển đổi dữ liệu tin nhắn để trả về đúng định dạng
    const projectedMessages = messages.map((msg) => {
      return {
        // Kiểm tra xem tin nhắn có phải do người dùng hiện tại gửi không
        fromSelf: msg.sender.toString() === from,
        // Lấy nội dung text của tin nhắn
        message: msg.message.text,
      };
    });
    res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};

//Hàm thêm tin nhắn mới vào database
const addMessage = async (req, res, next) => {
  try {
    // Lấy thông tin từ request body
    const { from, to, message } = req.body;

    // Tạo tin nhắn mới trong database
    const data = await Messages.create({
      message: { text: message },
      users: [from, to],
      sender: from,
    });

    // Kiểm tra xem tin nhắn có được thêm thành công hay không
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