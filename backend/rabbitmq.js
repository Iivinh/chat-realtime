const amqp = require('amqplib');

const USER = process.env.RABBITMQ_USER; 
const PASS = process.env.RABBITMQ_PASS;

// Xây dựng URI kết nối
const RABBITMQ_URI = `amqp://${USER}:${PASS}@rabbitmq:5672`;
const EXCHANGE_NAME = 'chat_exchange'; 

let channel;

/**
 * Thiết lập kết nối và Channel đến RabbitMQ. Thử lại nếu lỗi.
 */
async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(RABBITMQ_URI); 
        channel = await connection.createChannel();
        
        // Assert Exchange: Tạo một 'fanout' exchange để broadcast tin nhắn
        await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: false });

        console.log('✅ RabbitMQ Connected successfully.');
        return channel;

    } catch (error) {
        console.error('❌ RabbitMQ Connection Error:', error.message);
        // Thử lại sau 5 giây nếu kết nối thất bại
        await new Promise(resolve => setTimeout(resolve, 5000));
        return connectRabbitMQ(); 
    }
}

/**
 * Gửi tin nhắn vào RabbitMQ Exchange (Producer)
 */
function publishMessage(data) {
    if (!channel) {
        console.error('RabbitMQ channel not available. Message dropped.');
        return;
    }
    
    const message = JSON.stringify(data);
    // Gửi buffer
    channel.publish(EXCHANGE_NAME, '', Buffer.from(message));
    console.log(`[RabbitMQ] Published message: ${message}`);
}

module.exports = {
    connectRabbitMQ,
    publishMessage,
    EXCHANGE_NAME 
};