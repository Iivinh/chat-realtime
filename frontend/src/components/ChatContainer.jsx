import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import Logout from "./Logout";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";

export default function ChatContainer({ currentChat, socket }) {
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef();
  const [arrivalMessage, setArrivalMessage] = useState(null);

  // ----------------------------------------------------
  // 1. Lấy tin nhắn cũ khi chat thay đổi (Đã sửa lỗi async)
  // ----------------------------------------------------
  useEffect(() => {
    const fetchMessages = async () => {
      const storedData = localStorage.getItem(import.meta.env.VITE_LOCALHOST_KEY);

      if (currentChat && storedData) {
        const data = await JSON.parse(storedData);

        const response = await axios.post(recieveMessageRoute, {
          from: data._id,
          to: currentChat._id,
        });
        setMessages(response.data);
      }
    };

    fetchMessages();

    // Cleanup không cần thiết ở đây
  }, [currentChat]);

  // ----------------------------------------------------
  // 2. Xử lý Logic Gửi Tin nhắn (Tối ưu Functional Update)
  // ----------------------------------------------------
  const handleSendMsg = async (msg) => {
    const storedData = localStorage.getItem(import.meta.env.VITE_LOCALHOST_KEY);

    if (!storedData) return; // Bảo vệ khỏi lỗi nếu không có user

    const data = await JSON.parse(storedData);

    // Gửi qua Socket.IO
    socket.current.emit("send-msg", {
      to: currentChat._id,
      from: data._id,
      msg,
    });

    // Lưu vào Database (Backend API)
    await axios.post(sendMessageRoute, {
      from: data._id,
      to: currentChat._id,
      message: msg,
    });

    // Cập nhật State cục bộ (Functional Update)
    const sentMsg = { fromSelf: true, message: msg };
    setMessages((prevMsgs) => [...prevMsgs, sentMsg]);
  };

  // ----------------------------------------------------
  // 3. Xử lý Tin nhắn Đến (Sửa lỗi Dependency và Cleanup)
  // ----------------------------------------------------
  // ----------------------------------------------------
  // 3. Xử lý Tin nhắn Đến (Tối ưu Cleanup và Dependency)
  // ----------------------------------------------------
  useEffect(() => {
    const currentSocket = socket.current; // TẠO BẢN SAO CỦA GIÁ TRỊ REF

    if (currentSocket) {
      const handleRecieve = (msg) => {
        setArrivalMessage({ fromSelf: false, message: msg });
      };

      currentSocket.on("msg-recieve", handleRecieve);

      return () => {
        // SỬ DỤNG BẢN SAO TRONG CLEANUP
        currentSocket.off("msg-recieve", handleRecieve);
      };
    }
    // Dependency array trống là đúng trong trường hợp này.
  }, [socket]);
  // ----------------------------------------------------
  // 4. Thêm Tin nhắn Đến vào Mảng Tin nhắn
  // ----------------------------------------------------
  useEffect(() => {
    // Chỉ chạy khi arrivalMessage có giá trị
    arrivalMessage && setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage]);

  // ----------------------------------------------------
  // 5. Auto Scroll
  // ----------------------------------------------------
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          <div className="avatar">
            <img
              src={`data:image/svg+xml;base64,${currentChat.avatarImage}`}
              alt=""
            />
          </div>
          <div className="username">
            <h3>{currentChat.username}</h3>
          </div>
        </div>
        <Logout />
      </div>
      <div className="chat-messages">
        {messages.map((message) => {
          return (
            <div key={uuidv4()}> {/* key ở đây là đủ */}
              <div
                className={`message ${message.fromSelf ? "sended" : "recieved"
                  }`}
              >
                <div className="content ">
                  <p>{message.message}</p>
                </div>
              </div>
            </div>
          );
        })}
        {/* Đặt scrollRef ở đây là đủ */}
        <div ref={scrollRef} />
      </div>
      <ChatInput handleSendMsg={handleSendMsg} />
    </Container>
  );
}


const COOL_ACCENT = '#A7C5F8';
const STATE_ACCENT = '#C2D4F6';
const PRIMARY_TEXT_COLOR = '#204683';
const BACKGROUND_COLOR = '#292A2D';
const FORM_COLOR = '#00000076';

const Container = styled.div`
  background: #1d1f20ff;
  display: grid;
  grid-template-rows: 10% 80% 10%;
  gap: 0.1rem;
  overflow: visible;
  @media screen and (min-width: 720px) and (max-width: 1080px) {
    grid-template-rows: 15% 70% 15%;
  }
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    .user-details {
      display: flex;
      align-items: center;
      gap: 1rem;
      .avatar {
        img {
          height: 3rem;
        }
      }
      .username {
        h3 {
          color: white;
        }
      }
    }
  }
  .chat-messages {
    padding: 1rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: auto;
    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: ${STATE_ACCENT};
        width: 0.1rem;
        border-radius: 1rem;
      }
    }
    .message {
      display: flex;
      align-items: center;
      .content {
        max-width: 40%;
        overflow-wrap: break-word;
        padding: 1rem;
        font-size: 1.1rem;
        border-radius: 1rem;
        color: #d1d1d1;
        @media screen and (min-width: 720px) and (max-width: 1080px) {
          max-width: 70%;
        }
      }
    }
    .sended {
      justify-content: flex-end;
      .content {
        background-color: ${PRIMARY_TEXT_COLOR};
        color: white;
      }
    }
    .recieved {
      justify-content: flex-start;
      .content {
        background-color: #4C4C4C;
        color: white;
      }
    }
  }
`;
