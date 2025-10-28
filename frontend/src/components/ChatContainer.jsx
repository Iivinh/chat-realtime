import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import Logout from "./Logout";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";

export default function ChatContainer({ currentChat, socket, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef();
  const [arrivalMessage, setArrivalMessage] = useState(null);

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
  }, [currentChat]);

  // useEffect(() => {
  //   const getCurrentChat = async () => {
  //     if (currentChat) {
  //       await JSON.parse(
  //         localStorage.getItem(import.meta.env.VITE_LOCALHOST_KEY)
  //       )._id;
  //     }
  //   };
  //   getCurrentChat();
  // }, [currentChat]);
  useEffect(() => {
    if (socket.current && currentChat) {
      const handleMessage = async (msg) => {
        // ✅ Lấy currentUser
        const userData = await JSON.parse(
          localStorage.getItem(import.meta.env.VITE_LOCALHOST_KEY)
        );
        
        // ✅ Logic: Tin nhắn msg-recieve chỉ được gửi cho NGƯỜI NHẬN
        // Vậy người nhận tin = userData._id
        // Người gửi tin = currentChat._id (người đang chat với mình)
        // => Chỉ nhận tin khi đang mở chat với người đó
        setArrivalMessage({ fromSelf: false, message: msg });
      };
      
      socket.current.on("msg-recieve", handleMessage);
      
      return () => {
        socket.current.off("msg-recieve", handleMessage);
      };
    }
  }, [currentChat]);

  const handleSendMsg = async (msg) => {
    const data = await JSON.parse(
      localStorage.getItem(import.meta.env.VITE_LOCALHOST_KEY)
    );
    socket.current.emit("send-msg", {
      to: currentChat._id,
      from: data._id,
      msg,
    });
    await axios.post(sendMessageRoute, {
      from: data._id,
      to: currentChat._id,
      message: msg,
    });

    if (onMessageSent) {
      onMessageSent();
    }
    
    const msgs = [...messages];
    msgs.push({ fromSelf: true, message: msg });
    setMessages(msgs);
  };

  // useEffect(() => {
  //   if (socket.current) {
  //     socket.current.on("msg-recieve", (msg) => {
  //       setArrivalMessage({ fromSelf: false, message: msg });
  //     });
  //   }
  // }, []);
  useEffect(() => {
    if (socket.current && currentChat) {
      const handleMessage = (data) => {
        // ✅ Backend giờ gửi object {msg, from, to}
        const messageText = typeof data === 'string' ? data : data.msg;
        const senderId = typeof data === 'object' ? data.from : null;
        
        // ✅ CHỈ NHẬN NẾU TIN NHẮN TỪ NGƯỜI ĐANG CHAT
        if (!senderId || senderId === currentChat._id) {
          setArrivalMessage({ fromSelf: false, message: messageText });
        } else {
          console.log(`[FILTER] Ignored message from ${senderId}, current chat is ${currentChat._id}`);
        }
      };
      
      socket.current.on("msg-recieve", handleMessage);
      
      return () => {
        socket.current.off("msg-recieve", handleMessage);
      };
    }
  }, [currentChat]);

  useEffect(() => {
    arrivalMessage && setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage]);

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
            <div ref={scrollRef} key={uuidv4()}>
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
  overflow: hidden;
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
        align-items: center;
        justify-content: center;
        overflow-wrap: break-word;
        padding: 0.5rem 1rem;
        font-size: 1rem;
        border-radius: 1.5rem;
        color: #d1d1d1;
        @media screen and (min-width: 720px) and (max-width: 1080px) {
          max-width: 70%;
        }
        p {
          margin: 0; 
          line-height: 1.2; /* Tối ưu hóa khoảng cách dòng */
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
