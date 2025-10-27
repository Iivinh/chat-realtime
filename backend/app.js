var createError = require('http-errors');
var express = require('express');
const cors = require("cors");
const mongoose = require("mongoose");
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var authRouter = require('./routes/auth');
var messagesRouter = require('./routes/messages');

var app = express();
const socket = require("socket.io");

app.use(logger('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("DB Connection Successful");
  })
  .catch((err) => {
    console.log(`DB Connection Failed. URI used: ${process.env.MONGO_URI}`);
    console.log(err.message);
  });

app.get("/ping", (_req, res) => {
  return res.json({ msg: "Ping Successful" });
});

app.use('/api/auth', authRouter);
app.use('/api/messages', messagesRouter);

const PORT = process.env.PORT || 5000;
const http = require('http');
const server = http.createServer(app);

// ✅ CẤU HÌNH SOCKET.IO VỚI REDIS ADAPTER (Để đồng bộ giữa nhiều instances)
const io = socket(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
  // Thêm config cho sticky session và adapter
  transports: ['websocket', 'polling'],
});

// ✅ SỬ DỤNG REDIS ADAPTER (Nếu có nhiều backend replicas)
// Uncomment khi cài đặt Redis
/*
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

const pubClient = createClient({ 
  host: process.env.REDIS_HOST || "redis",
  port: process.env.REDIS_PORT || 6379 
});
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  console.log("Redis adapter configured for Socket.IO");
});
*/

global.chatSocket = io;
global.onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} added with socket ${socket.id}`);
  });

  // ✅ XỬ LÍ GỬI TIN NHẮN - Đã sửa để emit đầy đủ
  socket.on("send-msg", (data) => {
    const { to, from, msg } = data;
    const recipientSocketId = onlineUsers.get(to);
    
    console.log(`Message from ${from} to ${to}: ${msg}`);
    console.log(`Recipient socket ID: ${recipientSocketId}`);

    if (recipientSocketId) {
      // ✅ 1. GỬI TIN NHẮN CHO NGƯỜI NHẬN
      socket.to(recipientSocketId).emit("msg-recieve", msg);
      
      // ✅ 2. BẮN TÍN HIỆU CẬP NHẬT DANH SÁCH CONVERSATION CHO NGƯỜI NHẬN
      socket.to(recipientSocketId).emit("update-conversations");
      
      console.log(`Message and update signal sent to ${recipientSocketId}`);
    } else {
      console.log(`User ${to} is offline`);
    }

    // ✅ 3. BẮN TÍN HIỆU CẬP NHẬT CHO NGƯỜI GỬI (để cập nhật lastMessage)
    socket.emit("update-conversations");
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    // Xóa user khỏi map khi disconnect
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`Removed user ${userId} from online users`);
        break;
      }
    }
  });
});

server.listen(PORT, () =>
  console.log(`Server started on ${PORT}`)
);