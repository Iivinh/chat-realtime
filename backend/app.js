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
require("dotenv").config();

app.use(logger('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("DB Connetion Successfull");
  })
  .catch((err) => {
    console.log(err.message);
  });
app.get("/ping", (_req, res) => {
  return res.json({ msg: "Ping Successful" });
});

app.use('/api/auth', authRouter);
app.use('/api/messages', messagesRouter);

const server = app.listen(process.env.PORT, () =>
  console.log(`Server started on ${process.env.PORT}`)
);
const io = socket(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});
global.chatSocket = io;
global.onlineUsers = new Map();
io.on("connection", (socket) => {
  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  // TRONG app.js (Đoạn mới)

  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    // 1. Gửi tin nhắn và tín hiệu cập nhật cho người nhận
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", data.msg);
    }
  });
});

module.exports = app;
