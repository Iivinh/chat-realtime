const User = require('../models/userModel');
const Message = require('../models/messageModel');
const bcrypt = require("bcrypt");

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user)
      return res.json({ msg: "Sai Tên đăng nhập hoặc Mật khẩu.", status: false });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.json({ msg: "Sai Tên đăng nhập hoặc Mật khẩu,", status: false });
    delete user.password;
    return res.json({ status: true, user });
  } catch (ex) {
    next(ex);
  }
};

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const usernameCheck = await User.findOne({ username });
    if (usernameCheck)
      return res.json({ msg: "Tên đăng nhập đã tồn tại trong hệ thống.", status: false });
    const emailCheck = await User.findOne({ email });
    if (emailCheck)
      return res.json({ msg: "Địa chỉ Email đã tồn tại trong hệ thống.", status: false });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
    });
    delete user.password;
    return res.json({ status: true, user });
  } catch (ex) {
    next(ex);
  }
};

const logout = (req, res, next) => {
  try {
    if (!req.params.id) return res.json({ msg: "Yêu cầu id người dùng." });
    onlineUsers.delete(req.params.id);
    return res.status(200).send();
  } catch (ex) {
    next(ex);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.params.id } }).select([
      "email",
      "username",
      "avatarImage",
      "_id",
    ]);
    return res.json(users);
  } catch (ex) {
    next(ex);
  }
};

const searchUsers = async (req, res, next) => {
  try {
    const { username, userId } = req.query;
    // 1. Kiểm tra username và userId
    if (!username || !userId) {
      return res.status(400).json({ msg: "Thiếu tham số username.", status: false });
    }

    // 2. Định nghĩa điều kiện tìm kiếm
    // Sử dụng $regex (Regular Expression) để tìm kiếm username có chứa từ khóa
    // Options 'i' (case-insensitive) giúp tìm kiếm không phân biệt chữ hoa/chữ thường.
    const searchCriteria = {
      username: { $regex: username, $options: 'i' },
      _id: { $ne: userId }
    };

    // 3. Thực hiện truy vấn database
    const users = await User.find(searchCriteria)
      .select([
        "email",
        "username",
        "avatarImage",
        "_id",
      ]);
    // .limit(10); // Giới hạn số lượng kết quả trả về

    return res.json(users);

  } catch (ex) {
    next(ex);
  }
};

const getConversationalUsers = async (req, res, next) => {
  try {
    const currentUserId = req.params.id;

    // 1. TÌM VÀ TRÍCH XUẤT CÁC USER ID KHÁC (Partner IDs)
    // (Bước này giữ nguyên để xác định đối tác đã từng chat)
    const messages = await Message.find({
      users: { $in: [currentUserId] },
    });

    const conversationalUserIds = new Set();
    messages.forEach((msg) => {
      msg.users.forEach((userId) => {
        if (userId.toString() !== currentUserId.toString()) {
          conversationalUserIds.add(userId);
        }
      });
    });

    const partnerIds = Array.from(conversationalUserIds);

    // 2. TRUY VẤN THÔNG TIN CHI TIẾT VÀ TIN NHẮN CUỐI CÙNG CHO TỪNG ĐỐI TÁC
    const usersWithLastMessage = await Promise.all(
      partnerIds.map(async (partnerId) => {
        // 2a. Lấy thông tin User
        const userDetails = await User.findById(partnerId).select([
          "email",
          "username",
          "avatarImage",
          "_id",
        ]).lean();

        // 2b. Lấy Tin nhắn Cuối cùng (chỉ lấy message, sender và updatedAt)
        const lastMessage = await Message.findOne({
          users: { $all: [currentUserId, partnerId] },
        })
          .sort({ updatedAt: -1 })
          .select("message sender updatedAt") // 🌟 ĐÃ TỐI GIẢN CHỈ LẤY CÁC TRƯỜNG CẦN THIẾT 🌟
          .lean();

        if (!userDetails) return null;

        // 2c. Hợp nhất kết quả
        return {
          ...userDetails,
          lastMessage: lastMessage ? {
            // Giả định nội dung tin nhắn là trường 'text'
            message: lastMessage.message.text,
            sender: lastMessage.sender.toString(), // ID của người gửi tin nhắn cuối
            timestamp: lastMessage.updatedAt,
          } : null,
        };
      })
    );

    // 3. Sắp xếp và trả về
    const finalUsers = usersWithLastMessage
      .filter(user => user !== null)
      .sort((a, b) => {
        const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
        const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
        return timeB - timeA;
      });

    return res.json(finalUsers);
  } catch (ex) {
    next(ex);
  }
};

const setAvatar = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const avatarImage = req.body.image;
    const userData = await User.findByIdAndUpdate(
      userId,
      {
        isAvatarImageSet: true,
        avatarImage,
      },
      { new: true }
    );
    return res.json({
      isSet: userData.isAvatarImageSet,
      image: userData.avatarImage,
    });
  } catch (ex) {
    next(ex);
  }
};

module.exports = {
  login,
  register,
  logout,
  getAllUsers,
  getConversationalUsers,
  searchUsers,
  setAvatar
}