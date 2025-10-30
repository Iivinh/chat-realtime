// ==================== IMPORTS ====================
var createError = require('http-errors');
var express = require('express');
const http = require('http');
const cors = require("cors");
const mongoose = require("mongoose");
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// Socket.IO và Redis Adapter
const { Server } = require('socket.io');
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');

// RabbitMQ client
const amqp = require('amqplib');

// Models và Routes
const Message = require('./models/messageModel');
var authRouter = require('./routes/auth');
var messagesRouter = require('./routes/messages');

// ==================== APP INITIALIZATION ====================
var app = express();
const socket = require("socket.io");

// Sử dụng Morgan để log HTTP requests (dev mode)
app.use(logger('dev'));

// ==================== CORS CONFIGURATION ====================
const allowedOrigins = ['http://localhost:3000'];

// Custom CORS middleware để xử lý preflight requests
app.use((req, res, next) => {

  const origin = req.headers.origin;

  // Chỉ cho phép origins trong whitelist
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');  // Cho phép gửi cookies
  }

  // Các HTTP methods được phép
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  // Các headers được phép
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Thêm CORS middleware chính thức
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true // Cho phép gửi cookies
}));

// ==================== MIDDLEWARE SETUP ====================
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== DATABASE CONNECTION ====================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("DB Connection Successful");
  })
  .catch((err) => {
    console.log(`DB Connection Failed. URI used: ${process.env.MONGO_URI}`);
    console.log(err.message);
  });

  // ==================== API ROUTES ====================
app.get("/ping", (_req, res) => {
  return res.json({ msg: "Ping Successful" });
});

// Authentication routes (login, register, logout, etc.)
app.use('/api/auth', authRouter);

// Message routes (addmsg, getmsg)
app.use('/api/messages', messagesRouter);

// ==================== SERVER SETUP ====================
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
  pingInterval: 10000,
  pingTimeout: 5000,
});

io.adapter(createAdapter(pubClient, subClient));

// TÍCH HỢP RABBITMQ (Giao tiếp Bất đồng bộ)
let rabbitmqChannel = null;


const connectRabbitMQ = async () => {
  try {
    // Kết nối tới RabbitMQ server
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    rabbitmqChannel = await connection.createChannel();
    console.log("RabbitMQ Connection Successfull");

    // Khai báo Queue cho việc ghi lịch sử chat bất đồng bộ
    await rabbitmqChannel.assertQueue('chat_history_queue', { durable: true });
    // BẮT ĐẦU LẮNG NGHE HÀNG ĐỢI (CONSUME LOGIC)
    rabbitmqChannel.consume('chat_history_queue', async (msg) => {
      if (msg !== null) {
        try {
          // 1. Parse message content (JSON string → object)
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

// ==================== GLOBAL VARIABLES ====================
global.chatSocket = io;
global.redisClient = redisClient;
// ==================== START SERVER ====================
server.listen(PORT, async () => {
  console.log(`Server started on ${PORT}`);
  await connectRabbitMQ(); // Khởi tạo RabbitMQ
});


// ==================== SOCKET.IO EVENT HANDLERS ====================
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("add-user", async (userId) => {
    await redisClient.hset('userSocketMap', userId, socket.id);
    await redisClient.hset('socketUserMap', socket.id, userId);
    console.log(`User ${userId} added with socket ${socket.id}`);
  });

  // XỬ LÍ GỬI TIN NHẮN -để emit đầy đủ và đồng bộ cho cả 2 phía
  socket.on("send-msg", async (data) => {
    const { to, from, msg } = data;
    console.log(`[SEND-MSG] From: ${from}, To: ${to}, Message: ${msg}`);
    
    // 1. Lấy socket ID của người nhận và người gửi
    const recipientSocketId = await redisClient.hget('userSocketMap', to);
    const senderSocketId = await redisClient.hget('userSocketMap', from);
    
    console.log(`[SOCKET-LOOKUP] Recipient ${to} -> ${recipientSocketId}, Sender ${from} -> ${senderSocketId}`);
    
    // 2.Gửi tin nhắn cho người nhận với ĐẦY ĐỦ THÔNG TIN
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("msg-recieve", {
        message: msg,
        msg: msg,  // Backward compatibility
        from: from,
        to: to
      });
      io.to(recipientSocketId).emit("update-conversations");
      console.log(`[EMIT] Message sent to recipient ${recipientSocketId} from ${from}`);
    } else {
      console.log(`[OFFLINE] User ${to} is offline`);
    }
    
    // 3. Gửi update cho người gửi
    if (senderSocketId) {
      io.to(senderSocketId).emit("update-conversations");
      console.log(`[EMIT] Update signal sent to sender ${senderSocketId}`);
    }
    
    // 4. Gửi task ghi lịch sử qua RabbitMQ
    if (rabbitmqChannel) {
      const message = Buffer.from(JSON.stringify(data));
      rabbitmqChannel.sendToQueue('chat_history_queue', message, { persistent: true });
      console.log(`[RABBITMQ] Task sent to queue`);
    }
  });

  socket.on("disconnect", async () => {
    const socketId = socket.id;

    // 1. Tìm userId từ socketId bằng Map Ngược
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
  });
});