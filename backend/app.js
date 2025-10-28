var createError = require('http-errors');
var express = require('express');
const http = require('http');
const cors = require("cors");
const mongoose = require("mongoose");
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const { Server } = require('socket.io');
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');
const amqp = require('amqplib');
const Message = require('./models/messageModel');
var authRouter = require('./routes/auth');
var messagesRouter = require('./routes/messages');

var app = express();
const socket = require("socket.io");

app.use(logger('dev'));

const allowedOrigins = ['http://localhost:3000'];

app.use((req, res, next) => {

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {

    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {

    return res.status(200).end();

  }
  next();
});

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true // Bắt buộc nếu bạn dùng cookie/session
}));
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
const server = http.createServer(app);

// TÍCH HỢP REDIS (Adapter & Quản lý Online Status)
const redisClient = new Redis(process.env.REDIS_URL);
const pubClient = redisClient;
const subClient = redisClient.duplicate();

// CẤU HÌNH SOCKET.IO VỚI REDIS ADAPTER (Để đồng bộ giữa nhiều instances)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
  // Thêm config cho sticky session và adapter
  transports: ['websocket', 'polling'],
  pingInterval: 10000, // Tăng lên 10 giây (mặc định 25s)
  pingTimeout: 5000,
});

io.adapter(createAdapter(pubClient, subClient));

// TÍCH HỢP RABBITMQ (Giao tiếp Bất đồng bộ)
let rabbitmqChannel = null;

const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    rabbitmqChannel = await connection.createChannel();
    console.log("RabbitMQ Connection Successfull");

    // Khai báo Queue cho việc ghi lịch sử chat bất đồng bộ
    await rabbitmqChannel.assertQueue('chat_history_queue', { durable: true });
    // 💡 BẮT ĐẦU LẮNG NGHE HÀNG ĐỢI (CONSUME LOGIC)
    rabbitmqChannel.consume('chat_history_queue', async (msg) => {
      if (msg !== null) {
        try {
          // 1. Phân tích cú pháp tin nhắn
          const data = JSON.parse(msg.content.toString());
          const { from, to, msg: messageContent } = data; // Lấy dữ liệu từ object tin nhắn gửi đi

          // 2. GHI LỊCH SỬ TIN NHẮN VÀO MONGODB BẤT ĐỒNG BỘ
          await Message.create({
            message: { text: messageContent },
            sender: from,
            users: [from, to]
          });

          console.log(`[RabbitMQ Worker] Saved message from ${from} to MongoDB.`);

          // 3. Xác nhận đã xử lý xong tin nhắn (RẤT QUAN TRỌNG!)
          rabbitmqChannel.ack(msg);

        } catch (error) {
          console.error("[RabbitMQ Worker] Error processing message:", error.message);
          // Nếu ghi vào DB lỗi, bạn có thể nack(msg) để tin nhắn quay lại hàng đợi
        }
      }
    }, { noAck: false });
  } catch (error) {
    console.error("RabbitMQ Connection Failed:", error.message);
    setTimeout(connectRabbitMQ, 5000);
  }
};

global.chatSocket = io;
global.redisClient = redisClient;

server.listen(PORT, async () => {
  console.log(`Server started on ${PORT}`);
  await connectRabbitMQ(); // Khởi tạo RabbitMQ
});

// global.onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("add-user", async (userId) => {
    // onlineUsers.set(userId, socket.id);
    // console.log(`User ${userId} added with socket ${socket.id}`);
    await redisClient.hset('userSocketMap', userId, socket.id);
    await redisClient.hset('socketUserMap', socket.id, userId);
    console.log(`User ${userId} added with socket ${socket.id}`);
  });

  // ✅ XỬ LÍ GỬI TIN NHẮN - Đã sửa để emit đầy đủ
  socket.on("send-msg", async (data) => {
    // 1. Gửi tin nhắn real-time (ĐỒNG BỘ) - Xử lý bởi Redis Adapter
    const { to, from, msg } = data;
    console.log(`Attempting to send message to user ID: ${to}`);
    const recipientSocketId = await redisClient.hget('userSocketMap', to);
    console.log(`Lookup result for ${to}: Socket ID is ${recipientSocketId}`);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("msg-recieve", msg);
      io.to(recipientSocketId).emit("update-conversations");
      console.log(`Message and update signal sent to ${recipientSocketId}`);
    } else {
      console.log(`User ${to} is offline`);
    }
    // 2. 🔵 Gửi tác vụ ghi lịch sử BẤT ĐỒNG BỘ - Qua RabbitMQ
    if (rabbitmqChannel) {
      const message = Buffer.from(JSON.stringify(data));
      // persistent: true đảm bảo tin nhắn không bị mất (RESILIENCE)
      rabbitmqChannel.sendToQueue('chat_history_queue', message, { persistent: true });
      console.log(`Task sent to RabbitMQ for user ${from}`);
    }
    socket.emit("update-conversations");
  });

  // const { to, from, msg } = data;
  // const recipientSocketId = onlineUsers.get(to);

  // console.log(`Message from ${from} to ${to}: ${msg}`);
  // console.log(`Recipient socket ID: ${recipientSocketId}`);

  // if (recipientSocketId) {
  //   // ✅ 1. GỬI TIN NHẮN CHO NGƯỜI NHẬN
  //   socket.to(recipientSocketId).emit("msg-recieve", msg);

  //   // ✅ 2. BẮN TÍN HIỆU CẬP NHẬT DANH SÁCH CONVERSATION CHO NGƯỜI NHẬN
  //   socket.to(recipientSocketId).emit("update-conversations");

  //   console.log(`Message and update signal sent to ${recipientSocketId}`);
  // } else {
  //   console.log(`User ${to} is offline`);
  // }

  // // ✅ 3. BẮN TÍN HIỆU CẬP NHẬT CHO NGƯỜI GỬI (để cập nhật lastMessage)
  // socket.emit("update-conversations");

  socket.on("disconnect", async () => {
    const socketId = socket.id;

    // 1. 💡 Tìm userId từ socketId bằng Map Ngược
    const userId = await redisClient.hget('socketUserMap', socketId);
    if (userId) {
      // 2. Xóa socketId khỏi Map Ngược
      await redisClient.hdel('socketUserMap', socketId);

      // 3. Xóa userId khỏi Map Chính
      await redisClient.hdel('userSocketMap', userId);

      console.log(`User ${userId} (Socket ${socketId}) removed from online users.`);
    } else {
      console.log(`Disconnected socket ${socketId} was not associated with a user.`);
    }
    // console.log(`User disconnected: ${socket.id}`);
    // // Xóa user khỏi map khi disconnect
    // for (let [userId, socketId] of onlineUsers.entries()) {
    //   if (socketId === socket.id) {
    //     onlineUsers.delete(userId);
    //     console.log(`Removed user ${userId} from online users`);
    //     break;
    //   }
    // }
  });
});

// server.listen(PORT, () =>
//   console.log(`Server started on ${PORT}`)
// );