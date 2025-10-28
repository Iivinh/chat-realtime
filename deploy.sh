#!/bin/bash

# Script để deploy ứng dụng Chat lên Docker Swarm
# Level 3 - Container Orchestration Demo

set -e

echo "=========================================="
echo "DOCKER SWARM DEPLOYMENT SCRIPT"
echo "Chat Application - Level 3"
echo "=========================================="
echo ""

# Màu sắc cho output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Biến môi trường
DOCKER_REGISTRY="localhost:5000"
STACK_NAME="chat-app"

# Hàm kiểm tra Docker Swarm
check_swarm() {
    echo -e "${YELLOW}[1/8] Checking Docker Swarm status...${NC}"
    if docker info | grep -q "Swarm: active"; then
        echo -e "${GREEN}✓ Docker Swarm is already initialized${NC}"
    else
        echo -e "${YELLOW}! Initializing Docker Swarm...${NC}"
        docker swarm init
        echo -e "${GREEN}✓ Docker Swarm initialized successfully${NC}"
    fi
    echo ""
}

# Hàm tạo local registry
create_registry() {
    echo -e "${YELLOW}[2/8] Setting up local Docker registry...${NC}"
    if docker ps | grep -q "registry:2"; then
        echo -e "${GREEN}✓ Local registry is already running${NC}"
    else
        echo -e "${YELLOW}! Starting local registry...${NC}"
        docker run -d -p 5000:5000 --name registry --restart=always registry:2
        echo -e "${GREEN}✓ Local registry started at localhost:5000${NC}"
    fi
    echo ""
}

# ✅ HÀM MỚI: Dọn dẹp volumes cũ (tùy chọn)
cleanup_volumes() {
    echo -e "${YELLOW}[3/8] Checking existing volumes...${NC}"
    
    if docker volume ls | grep -q "chat-app_mongo_data"; then
        echo -e "${YELLOW}! Found existing mongo volume${NC}"
        read -p "Do you want to keep existing data? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}! Removing old volumes...${NC}"
            docker stack rm ${STACK_NAME} 2>/dev/null || true
            sleep 10
            docker volume rm chat-app_mongo_data 2>/dev/null || true
            docker volume rm chat-app_redis_data 2>/dev/null || true
            echo -e "${GREEN}✓ Old volumes removed${NC}"
        else
            echo -e "${GREEN}✓ Keeping existing data${NC}"
        fi
    else
        echo -e "${GREEN}✓ No existing volumes found${NC}"
    fi
    echo ""
}

# Hàm build và push images
build_and_push() {
    echo -e "${YELLOW}[4/8] Building and pushing Docker images...${NC}"
    
    # Build backend image
    echo "Building backend image..."
    docker build -t ${DOCKER_REGISTRY}/chat-backend:latest ./backend
    docker push ${DOCKER_REGISTRY}/chat-backend:latest
    echo -e "${GREEN}✓ Backend image pushed${NC}"
    
    # Build frontend image
    echo "Building frontend image..."
    docker build -t ${DOCKER_REGISTRY}/chat-frontend:latest ./frontend
    docker push ${DOCKER_REGISTRY}/chat-frontend:latest
    echo -e "${GREEN}✓ Frontend image pushed${NC}"
    echo ""
}

# Hàm tạo network
create_network() {
    echo -e "${YELLOW}[5/8] Creating overlay network...${NC}"
    if docker network ls | grep -q "chat_network"; then
        echo -e "${GREEN}✓ Network already exists${NC}"
    else
        docker network create --driver overlay --attachable chat_network
        echo -e "${GREEN}✓ Overlay network created${NC}"
    fi
    echo ""
}

# ✅ HÀM MỚI: Tạo volumes trước
create_volumes() {
    echo -e "${YELLOW}[6/8] Creating volumes...${NC}"
    
    if ! docker volume ls | grep -q "chat-app_mongo_data"; then
        docker volume create chat-app_mongo_data
        echo -e "${GREEN}✓ MongoDB volume created${NC}"
    else
        echo -e "${GREEN}✓ MongoDB volume already exists${NC}"
    fi
    
    if ! docker volume ls | grep -q "chat-app_redis_data"; then
        docker volume create chat-app_redis_data
        echo -e "${GREEN}✓ Redis volume created${NC}"
    else
        echo -e "${GREEN}✓ Redis volume already exists${NC}"
    fi
    echo ""
}

# Hàm deploy stack
deploy_stack() {
    echo -e "${YELLOW}[7/8] Deploying stack to Swarm...${NC}"
    
    # Export biến môi trường
    export DOCKER_REGISTRY=${DOCKER_REGISTRY}
    export RABBITMQ_USER=user_rabbitmq
    export RABBITMQ_PASS=password_rabbitmq_i7fK5ZEBUyr381F8
    
    # Deploy stack
    docker stack deploy -c docker-compose.swarm.yml ${STACK_NAME}
    echo -e "${GREEN}✓ Stack deployed successfully${NC}"
    echo ""
}

# Hàm kiểm tra trạng thái
check_status() {
    echo -e "${YELLOW}[8/8] Checking deployment status...${NC}"
    echo "Waiting for services to start..."
    sleep 15
    
    echo ""
    echo "Service Status:"
    docker stack services ${STACK_NAME}
    
    echo ""
    echo "Running Containers:"
    docker stack ps ${STACK_NAME} --filter "desired-state=running"
    
    echo ""
    echo "Volumes:"
    docker volume ls | grep chat-app
    echo ""
}

# Hàm hiển thị thông tin
show_info() {
    echo -e "${YELLOW}Deployment Information${NC}"
    echo "=========================================="
    echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
    echo ""
    echo "Access URLs:"
    echo "  - Frontend:     http://localhost:3000"
    echo "  - Backend API:  http://localhost:5000"
    echo "  - RabbitMQ UI:  http://localhost:15672 (user_rabbitmq / password_rabbitmq_i7fK5ZEBUyr381F8)"
    echo ""
    echo "Data Persistence:"
    echo "  - MongoDB data: chat-app_mongo_data volume"
    echo "  - Redis data:   chat-app_redis_data volume"
    echo ""
    echo "Useful Commands:"
    echo "  - View services:       docker stack services ${STACK_NAME}"
    echo "  - View logs:           docker service logs ${STACK_NAME}_backend -f"
    echo "  - Scale service:       docker service scale ${STACK_NAME}_backend=5"
    echo "  - Update service:      docker service update ${STACK_NAME}_backend"
    echo "  - Remove stack:        docker stack rm ${STACK_NAME}"
    echo "  - List volumes:        docker volume ls"
    echo "  - Inspect volume:      docker volume inspect chat-app_mongo_data"
    echo ""
    echo "Backup Commands:"
    echo "  - Backup MongoDB:      docker run --rm -v chat-app_mongo_data:/data -v \$(pwd):/backup alpine tar czf /backup/mongo-backup.tar.gz /data"
    echo "  - Restore MongoDB:     docker run --rm -v chat-app_mongo_data:/data -v \$(pwd):/backup alpine tar xzf /backup/mongo-backup.tar.gz -C /"
    echo ""
    echo "Swarm Information:"
    echo "  - View nodes:          docker node ls"
    echo "  - View stack:          docker stack ls"
    echo "  - View network:        docker network ls"
    echo "=========================================="
}

# Main execution
main() {
    check_swarm
    create_registry
    cleanup_volumes     # ✅ Mới
    build_and_push
    create_network
    create_volumes      # ✅ Mới
    deploy_stack
    check_status
    show_info
}

# Chạy script
main