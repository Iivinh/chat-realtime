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
    echo -e "${YELLOW}[1/7] Checking Docker Swarm status...${NC}"
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
    echo -e "${YELLOW}[2/7] Setting up local Docker registry...${NC}"
    if docker ps | grep -q "registry:2"; then
        echo -e "${GREEN}✓ Local registry is already running${NC}"
    else
        echo -e "${YELLOW}! Starting local registry...${NC}"
        docker run -d -p 5000:5000 --name registry --restart=always registry:2
        echo -e "${GREEN}✓ Local registry started at localhost:5000${NC}"
    fi
    echo ""
}

# Hàm build và push images
build_and_push() {
    echo -e "${YELLOW}[3/7] Building and pushing Docker images...${NC}"
    
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
    echo -e "${YELLOW}[4/7] Creating overlay network...${NC}"
    if docker network ls | grep -q "chat_network"; then
        echo -e "${GREEN}✓ Network already exists${NC}"
    else
        docker network create --driver overlay --attachable chat_network
        echo -e "${GREEN}✓ Overlay network created${NC}"
    fi
    echo ""
}

# Hàm deploy stack
deploy_stack() {
    echo -e "${YELLOW}[5/7] Deploying stack to Swarm...${NC}"
    
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
    echo -e "${YELLOW}[6/7] Checking deployment status...${NC}"
    echo "Waiting for services to start..."
    sleep 10
    
    echo ""
    echo "Service Status:"
    docker stack services ${STACK_NAME}
    
    echo ""
    echo "Running Containers:"
    docker stack ps ${STACK_NAME} --filter "desired-state=running"
    echo ""
}

# Hàm hiển thị thông tin
show_info() {
    echo -e "${YELLOW}[7/7] Deployment Information${NC}"
    echo "=========================================="
    echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
    echo ""
    echo "Access URLs:"
    echo "  - Frontend:     http://localhost:3000"
    echo "  - Backend API:  http://localhost:5000"
    echo "  - RabbitMQ UI:  http://localhost:15672 (user_rabbitmq / password_rabbitmq_i7fK5ZEBUyr381F8)"
    echo "  - Visualizer:   http://localhost:8080"
    echo ""
    echo "Useful Commands:"
    echo "  - View services:       docker stack services ${STACK_NAME}"
    echo "  - View logs:           docker service logs ${STACK_NAME}_backend"
    echo "  - Scale service:       docker service scale ${STACK_NAME}_backend=5"
    echo "  - Update service:      docker service update ${STACK_NAME}_backend"
    echo "  - Remove stack:        docker stack rm ${STACK_NAME}"
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
    build_and_push
    create_network
    deploy_stack
    check_status
    show_info
}

# Chạy script
main