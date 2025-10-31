
                    HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY PROJECT
                        
MỤC LỤC
1. YÊU CẦU HỆ THỐNG
2. CÀI ĐẶT
3. CẤU HÌNH PROJECT
4. CHẠY PROJECT (3 PHƯƠNG PHÁP)
   - Phương pháp 1: Docker Compose (Khuyến nghị cho Development)
   - Phương pháp 2: Docker Swarm (Production)
   - Phương pháp 3: Chạy Local (Không dùng Docker)
5. KIỂM TRA VÀ TEST APPLICATION
6. CÁC LỆNH THƯỜNG DÙNG
7. TROUBLESHOOTING (XỬ LÝ LỖI)
8. LƯU Ý QUAN TRỌNG


1. YÊU CẦU HỆ THỐNG


Tối thiểu:
- Docker Desktop 20.10+ (Windows/Mac) hoặc Docker Engine 20.10+ (Linux)
- Docker Compose V2
- RAM: 4GB trở lên
- Dung lượng ổ cứng: 10GB trở lên
- Hệ điều hành: Windows 10/11, macOS 10.15+, hoặc Linux

Nếu chạy không dùng Docker:
- Node.js phiên bản 20 trở lên
- MongoDB 5.0+
- Redis 6.0+
- RabbitMQ 3.x

Kiểm tra phiên bản đã cài:
    docker --version
    docker compose version

2. CÀI ĐẶT
A. CÀI ĐẶT DOCKER

*** WINDOWS/MAC ***
1. Tải Docker Desktop: https://www.docker.com/products/docker-desktop
2. Cài đặt và khởi động Docker Desktop
3. Đảm bảo Docker Desktop đang chạy

B. TẢI PROJECT
Giải nén file project vào thư mục bất kỳ, ví dụ:
    C:\Projects\chat-realtime     (Windows)
    ~/Projects/chat-realtime      (Mac/Linux)

3. CẤU HÌNH PROJECT
CẤU HÌNH FRONTEND

File: frontend/.env

File này đã có sẵn với nội dung:

VITE_LOCALHOST_KEY='chat-realtime-current-user'
VITE_API_URL='http://localhost:5000'

LƯU Ý: Không cần sửa file này trong hầu hết trường hợp.

C. CẤU HÌNH RABBITMQ (Tùy chọn)
File gốc: .env

Credentials mặc định:
    RABBITMQ_USER=user_rabbitmq
    RABBITMQ_PASS=password_rabbitmq_i7fK5ZEBUyr381F8

QUAN TRỌNG: Đổi password này khi deploy production!

4. CHẠY PROJECT
PHƯƠNG PHÁP 1: DOCKER COMPOSE (KHUYẾN NGHỊ CHO DEVELOPMENT)

Đây là cách đơn giản nhất, phù hợp cho development và testing.

BƯỚC 1: Mở Terminal/Command Prompt
*** Windows: Win + R -> cmd -> Enter
*** Mac: Command + Space -> Terminal -> Enter
*** Linux: Ctrl + Alt + T

BƯỚC 2: Di chuyển vào thư mục project
    cd đường_dẫn_đến_project

Ví dụ:
    cd C:\Projects\chat-realtime          (Windows)
    cd ~/Projects/chat-realtime          (Mac/Linux)

BƯỚC 3: Khởi động tất cả services
    docker compose up -d

LƯU Ý: 
- Lần đầu chạy sẽ mất 5-10 phút để download images
- Flag "-d" nghĩa là chạy ở chế độ background (detached)

BƯỚC 4: Kiểm tra services đã chạy chưa
    docker compose ps

Kết quả mong đợi: Tất cả services có STATUS là "Up"

BƯỚC 5: Xem logs (nếu cần)
Xem logs tất cả services:
    docker compose logs -f

Xem logs của service cụ thể:
    docker compose logs -f backend
    docker compose logs -f front

Nhấn Ctrl+C để thoát xem logs

BƯỚC 6: Truy cập ứng dụng
- Frontend (Giao diện người dùng): http://localhost:3000
- Backend API: http://localhost:5000/ping
- RabbitMQ Management: http://localhost:15672
  + Username: user_rabbitmq
  + Password: password_rabbitmq_i7fK5ZEBUyr381F8

DỪNG VÀ XÓA CONTAINERS
Dừng services (giữ nguyên data):
    docker compose stop

Khởi động lại:
    docker compose start

Dừng và xóa containers (giữ nguyên data trong volumes):
    docker compose down

Dừng và xóa TẤT CẢ (bao gồm cả data):
    CẢNH BÁO: Lệnh này sẽ xóa hết data trong database!
    docker compose down -v

REBUILD SAU KHI SỬA CODE
Nếu bạn sửa code và muốn rebuild:
    docker compose down
    docker compose up -d --build

PHƯƠNG PHÁP 2: DOCKER SWARM (PRODUCTION DEPLOYMENT) 


Phương pháp này dùng cho production với khả năng scale và high availability.

BƯỚC 1: Chuẩn bị và chạy deployment script
*** Linux/Mac:
    chmod +x deploy.sh
    ./deploy.sh

*** Windows:
    # Cài Git Bash hoặc WSL để chạy script
    # Hoặc chạy từng lệnh manual (xem bên dưới)

Script sẽ tự động:
✓ Khởi tạo Docker Swarm
✓ Tạo local registry
✓ Build và push images
✓ Deploy stack

BƯỚC 2: Kiểm tra deployment
    docker stack services chat-realtime

Kết quả mong đợi:
- chat-realtime_backend: 3/3 replicas
- chat-realtime_frontend: 2/2 replicas
- chat-realtime_nginx: 1/1 replica
- chat-realtime_database: 1/1 replica
- chat-realtime_redis: 1/1 replica
- chat-realtime_rabbitmq: 1/1 replica

BƯỚC 3: Xem logs
    docker service logs -f chat-realtime_backend
    docker service logs -f chat-realtime_frontend

DEPLOYMENT MANUAL (nếu không dùng script)
1. Khởi tạo Swarm:
    docker swarm init

2. Tạo registry:
    docker run -d -p 5000:5000 --name registry --restart=always registry:2

3. Build images:
    docker build -t localhost:5000/chat-backend:latest ./backend
    docker build -t localhost:5000/chat-frontend:latest ./frontend

4. Push images:
    docker push localhost:5000/chat-backend:latest
    docker push localhost:5000/chat-frontend:latest

5. Tạo network:
    docker network create --driver overlay --attachable chat_network

6. Deploy stack:
    docker stack deploy -c docker-compose.swarm.yml chat-realtime

XÓA STACK
    docker stack rm chat-realtime

SCALE SERVICES
Tăng số backend instances lên 5:
    docker service scale chat-realtime_backend=5

Tăng frontend lên 3:
    docker service scale chat-realtime_frontend=3


PHƯƠNG PHÁP 3: CHẠY LOCAL (KHÔNG DÙNG DOCKER)

Chỉ dùng khi không có Docker hoặc cần debug code trực tiếp.

YÊU CẦU:
- MongoDB đang chạy ở localhost:27017
- Redis đang chạy ở localhost:6379
- RabbitMQ đang chạy ở localhost:5672

BƯỚC 1: Cài đặt dependencies cho Backend
    cd backend
    npm install

BƯỚC 2: Cấu hình Backend .env
Sửa file backend/.env:

MONGO_URI=mongodb://localhost:27017/chat_db
PORT=5000
RABBITMQ_URL=amqp://localhost:5672
REDIS_URL=redis://localhost:6379

BƯỚC 3: Chạy Backend
Trong thư mục backend:
    npm start

hoặc với nodemon (auto-reload khi sửa code):
    npm run dev

Backend sẽ chạy ở: http://localhost:5000

BƯỚC 4: Cài đặt dependencies cho Frontend
Mở terminal mới, chạy:
    cd frontend
    npm install

BƯỚC 5: Chạy Frontend
Trong thư mục frontend:
    npm run dev

Frontend sẽ chạy ở: http://localhost:3000

LƯU Ý: Giữ cả 2 terminal mở để backend và frontend chạy song song.

5. KIỂM TRA VÀ TEST APPLICATION


A. KIỂM TRA CƠ BẢN

1. Test Backend Health
   Mở browser hoặc dùng curl:
   
   Browser: http://localhost:5000/ping
   
   Curl:
   curl http://localhost:5000/ping
   
   Kết quả mong đợi:
   {"msg":"Ping Successful"}

2. Test Frontend
   Browser: http://localhost:3000
   
   Phải thấy trang login/register

3. Test MongoDB Connection
   docker exec -it chat_mongodb mongosh -u chatuser -p chatpassword --authenticationDatabase admin
   
   Trong mongosh:
   show dbs
   use chat_db
   show collections

4. Test Redis
   docker exec -it chat_redis redis-cli ping
   
   Kết quả: PONG

5. Test RabbitMQ Management UI
   Browser: http://localhost:15672
   Login: user_rabbitmq / password_rabbitmq_i7fK5ZEBUyr381F8

B. TEST CHỨC NĂNG ỨNG DỤNG
1. ĐĂNG KÝ TÀI KHOẢN MỚI
   a. Mở http://localhost:3000
   b. Click "Tạo mới" (hoặc "Register")
   c. Điền thông tin:
      - Username: test1
      - Email: test1@example.com
      - Password: password123
      - Confirm Password: password123
   d. Click "Đăng ký"
   e. Chọn avatar và click "Đặt làm hình đại diện"

2. ĐĂNG KÝ TÀI KHOẢN THỨ HAI (để test chat)
   a. Mở tab Incognito/Private browsing: http://localhost:3000
   b. Đăng ký với thông tin khác:
      - Username: test2
      - Email: test2@example.com
      - Password: password123
      - Confirm Password: password12
3. TEST TÌM KIẾM VÀ BẮT ĐẦU CHAT
   a. Ở tab đầu tiên (test1):
      - Gõ "test2" vào ô tìm kiếm
      - Click vào “test2” trong kết quả
   b. Gửi tin nhắn: "Chào từ test1!"
   
   c. Ở tab thứ hai (test2):
      - Sẽ thấy tin nhắn realtime (không cần refresh)
      - Danh sách conversations tự động update
      - Reply: "Chào test1, tôi là test2!"

4. TEST EMOJI VÀ FEATURES
   - Click icon emoji để chọn emoji
   - Gửi tin nhắn có emoji
   - Test Enter để gửi
   - Test Shift+Enter để xuống dòng

5. KIỂM TRA DATA PERSISTENCE
   a. Gửi vài tin nhắn
   b. Restart services:
      docker compose restart
   c. Login lại
   d. Kiểm tra: Tin nhắn cũ vẫn còn

C. TEST LOAD BALANCING (Chỉ với Docker Swarm)
Gửi nhiều requests và check distribution trên terminal:

1..20 | ForEach-Object { $response = Invoke-WebRequest -Uri "http://localhost:5000/ping" -Method Head -SessionVariable session Write-Host "Request $_: $($response.Headers['X-Upstream-Addr'])" }

Kết quả mong đợi: Requests được phân bổ đều qua các backend instances

6. CÁC LỆNH THƯỜNG DÙNG
DOCKER COMPOSE COMMANDS

Khởi động services:
    docker compose up -d

Dừng services:
    docker compose stop

Khởi động lại:
    docker compose restart

Xem logs:
    docker compose logs -f                    # Tất cả services
    docker compose logs -f backend            # Chỉ backend
    docker compose logs --tail 100 backend    # 100 dòng cuối

Xem status:
    docker compose ps

Xóa containers (giữ data):
    docker compose down

Xóa TẤT CẢ (cả data):
    docker compose down -v

Rebuild và restart:
    docker compose up -d --build

Chạy command trong container:
    docker compose exec backend sh            # Vào shell của backend
    docker compose exec database mongosh      # Vào MongoDB shell

Scale service:
    docker compose up -d --scale backend=5    # 5 backend instances


DOCKER SWARM COMMANDS


Xem services:
    docker stack services chat-realtime

Xem containers:
    docker stack ps chat-realtime

Xem logs:
    docker service logs -f chat-realtime_backend
    docker service logs --tail 100 chat-realtime_backend

Scale service:
    docker service scale chat-realtime_backend=5

Update service:
    docker service update \
      --image localhost:5000/chat-backend:v2 \
      chat-realtime_backend

Xóa stack:
    docker stack rm chat-realtime

Kiểm tra Swarm:
    docker node ls                            # Xem nodes
    docker service ls                         # Xem tất cả services


DEBUGGING COMMANDS


Vào container để debug:
    docker exec -it CONTAINER_NAME sh
    docker exec -it chat_mongodb mongosh

Xem resource usage:
    docker stats

Xem network:
    docker network ls
    docker network inspect chat_network

Xem volumes:
    docker volume ls
    docker volume inspect chat-realtime_mongo_data

Cleanup (xóa unused resources):
    docker system prune -a --volumes


7. TROUBLESHOOTING (XỬ LÝ LỖI)
 LỖI: Cannot connect to Docker daemon

TRIỆU CHỨNG:
    Error: Cannot connect to the Docker daemon...

GIẢI PHÁP:
1. Kiểm tra Docker đang chạy:
   - Windows/Mac: Kiểm tra Docker Desktop icon
   - Linux: sudo systemctl status docker

2. Khởi động Docker:
   - Windows/Mac: Mở Docker Desktop
   - Linux: sudo systemctl start docker

LỖI: Port already in use
TRIỆU CHỨNG:
    Error: Port 3000/5000/27017/... is already allocated

GIẢI PHÁP:
1. Tìm process đang dùng port:
   
   Windows:
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F

   Mac/Linux:
   sudo lsof -i :3000
   sudo kill -9 <PID>

2. Hoặc đổi port trong docker-compose.yml:
   Ví dụ: "3001:3000" thay vì "3000:3000"

LỖI: Services không start
TRIỆU CHỨNG:
    Service exits ngay sau khi start

GIẢI PHÁP:
1. Xem logs để biết lỗi cụ thể:
   docker compose logs backend
   docker compose logs database

2. Kiểm tra .env files đã đúng chưa

3. Xóa và tạo lại:
   docker compose down -v
   docker compose up -d

 LỖI: Frontend không kết nối được Backend


TRIỆU CHỨNG:
    Network Error, CORS Error, hoặc API calls fail

GIẢI PHÁP:
1. Kiểm tra backend đang chạy:
   curl http://localhost:5000/ping

2. Kiểm tra VITE_API_URL trong frontend/.env:
   Phải là: http://localhost:5000

3. Clear browser cache và refresh (Ctrl+Shift+R)

4. Kiểm tra CORS settings trong backend/app.js:
   allowedOrigins phải bao gồm http://localhost:3000


 LỖI: MongoDB connection failed


TRIỆU CHỨNG:
    DB Connection Failed

GIẢI PHÁP:
1. Kiểm tra MongoDB container:
   docker ps | grep mongo

2. Kiểm tra logs:
   docker compose logs database

3. Test connection:
   docker exec -it chat_mongodb mongosh -u chatuser -p chatpassword

4. Nếu vẫn lỗi, xóa volume và tạo lại:
   docker compose down -v
   docker compose up -d


 LỖI: Socket.IO disconnects liên tục

TRIỆU CHỨNG:
    Console log: Socket disconnected, reconnecting...

GIẢI PHÁP:
1. Kiểm tra Redis:
   docker exec -it chat_redis redis-cli ping

2. Kiểm tra backend logs:
   docker compose logs -f backend | grep -i socket

3. Kiểm tra network:
   docker network inspect chat_network

4. Restart services:
   docker compose restart

LỖI: Out of disk space 

GIẢI PHÁP:
1. Xem disk usage:
   docker system df

2. Cleanup unused resources:
   docker system prune -a --volumes

3. Xóa old images:
   docker image prune -a

8. LƯU Ý QUAN TRỌNG

BẢO MẬT
1. ĐỔI MẬT KHẨU MẶC ĐỊNH khi deploy production:
   - MongoDB: chatuser/chatpassword
   - RabbitMQ: user_rabbitmq/password_rabbitmq_i7fK5ZEBUyr381F8

2. KHÔNG COMMIT file .env vào Git

3. SỬ DỤNG HTTPS cho production (thêm SSL certificate)

4. CẤU HÌNH FIREWALL chỉ mở ports cần thiết

PERFORMANCE

1. Lần đầu chạy sẽ chậm (download images)

2. Với máy yếu, giảm số backend replicas:
   - Docker Compose: Xóa dòng "replicas: 2" trong backend service
   - Docker Swarm: docker service scale chat-realtime_backend=2

3. Tăng Docker resources nếu lag:
   Docker Desktop -> Settings -> Resources
   - CPU: 4 cores
   - Memory: 4GB

DATA PERSISTENCE
1. Data được lưu trong Docker volumes:
   - chat-realtime_mongo_data: MongoDB data
   - chat-realtime_redis_data: Redis data

2. Để XÓA HẾT DATA:
   docker compose down -v
   (Cẩn thận: Không thể khôi phục!)

3. Để BACKUP DATA:
   docker run --rm \
     -v chat-realtime_mongo_data:/data \
     -v $(pwd):/backup \
     alpine tar czf /backup/mongo-backup.tar.gz /data

UPDATE CODE
Sau khi sửa code, cần rebuild:

Docker Compose:
    docker compose down
    docker compose up -d --build

Docker Swarm:
    docker build -t localhost:5000/chat-backend:latest ./backend
    docker push localhost:5000/chat-backend:latest
    docker service update --image localhost:5000/chat-backend:latest chat-realtime_backend

PORTS SỬ DỤNG
- 3000: Frontend
- 5000: Backend API (qua Nginx)
- 6379: Redis
- 15672: RabbitMQ Management UI
- 27017: MongoDB

Đảm bảo các ports này không bị conflict với ứng dụng khác.

LOGS
Logs được lưu trong containers, xem bằng:
    docker compose logs -f

Để export logs ra file:
    docker compose logs > logs.txt

DEVELOPMENT TIPS
1. Sử dụng nodemon cho auto-reload:
   - Backend: npm run dev
   - Frontend: npm run dev (đã có sẵn)

2. Debug với VSCode:
   - Attach to container
   - Hoặc chạy local (phương pháp 3)

3. Hot reload không work?
   - Docker Compose: Mount volume đúng
   - Local: Restart dev server
