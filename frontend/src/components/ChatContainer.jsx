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
  const currentChatRef = useRef(currentChat);
  const isMountedRef = useRef(true);

  // ✅ Update refs
  useEffect(() => {
    currentChatRef.current = currentChat;
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, [currentChat]);

  // ✅ Fetch messages when chat changes
  useEffect(() => {
    const fetchMessages = async () => {
      const storedData = localStorage.getItem(import.meta.env.VITE_LOCALHOST_KEY);

      if (currentChat && storedData) {
        try {
          const data = JSON.parse(storedData);

          const response = await axios.post(recieveMessageRoute, {
            from: data._id,
            to: currentChat._id,
          });
          
          if (isMountedRef.current) {
            setMessages(response.data);
          }
        } catch (error) {
          console.error("[FETCH MESSAGES] Error:", error);
          if (isMountedRef.current) {
            setMessages([]);
          }
        }
      }
    };
    
    // ✅ Reset messages khi chuyển chat
    setMessages([]);
    setArrivalMessage(null);
    
    fetchMessages();
  }, [currentChat]);

  // ✅ SINGLE useEffect để lắng nghe tin nhắn mới
  useEffect(() => {
    if (!socket.current || !currentChat) {
      console.log("[SOCKET LISTENER] Not ready - socket:", !!socket.current, "chat:", !!currentChat);
      return;
    }

    console.log("[SOCKET LISTENER] Setting up for chat:", currentChat.username);

    const handleMessage = (data) => {
      console.log("[MSG-RECEIVE] Raw data:", data);
      console.log("[MSG-RECEIVE] Current chat:", currentChatRef.current?.username);
      
      // ✅ Xử lý cả object và string
      const messageText = data.message || data.msg || (typeof data === 'string' ? data : '');
      const senderId = data.from;
      
      console.log("[MSG-RECEIVE] Message:", messageText, "From:", senderId);
      
      // ✅ CHỈ NHẬN TIN NHẮN TỪ NGƯỜI ĐANG CHAT
      if (senderId && currentChatRef.current && senderId === currentChatRef.current._id) {
        console.log("[MSG-RECEIVE] ✅ Adding message to current chat");
        
        if (isMountedRef.current) {
          setArrivalMessage({ 
            fromSelf: false, 
            message: messageText 
          });
        }
      } else {
        console.log(`[MSG-RECEIVE] ❌ Ignored - from ${senderId}, current chat is ${currentChatRef.current?._id}`);
      }
    };

    const handleError = (error) => {
      console.error("[SOCKET] Error:", error);
    };

    const handleDisconnect = (reason) => {
      console.warn("[SOCKET] Disconnected:", reason);
    };

    const handleConnect = () => {
      console.log("[SOCKET] Connected");
    };
    
    socket.current.on("msg-recieve", handleMessage);
    socket.current.on("error", handleError);
    socket.current.on("disconnect", handleDisconnect);
    socket.current.on("connect", handleConnect);
    
    return () => {
      console.log("[SOCKET LISTENER] Cleaning up for chat:", currentChat.username);
      if (socket.current) {
        socket.current.off("msg-recieve", handleMessage);
        socket.current.off("error", handleError);
        socket.current.off("disconnect", handleDisconnect);
        socket.current.off("connect", handleConnect);
      }
    };
  }, [socket, currentChat]);

  // ✅ Append arrival message to messages list
  useEffect(() => {
    if (arrivalMessage && isMountedRef.current) {
      console.log("[ARRIVAL MESSAGE] Adding to list:", arrivalMessage.message);
      setMessages((prev) => [...prev, arrivalMessage]);
      setArrivalMessage(null);
    }
  }, [arrivalMessage]);

  // ✅ Auto scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMsg = async (msg) => {
    try {
      const data = JSON.parse(
        localStorage.getItem(import.meta.env.VITE_LOCALHOST_KEY)
      );
      
      console.log("[SEND MSG] Sending to:", currentChat.username);
      
      // ✅ Emit socket event
      if (socket.current && socket.current.connected) {
        socket.current.emit("send-msg", {
          to: currentChat._id,
          from: data._id,
          msg,
        });
        console.log("[SEND MSG] Socket emitted");
      } else {
        console.error("[SEND MSG] Socket not connected!");
      }
      
      // ✅ Save to database
      await axios.post(sendMessageRoute, {
        from: data._id,
        to: currentChat._id,
        message: msg,
      });
      console.log("[SEND MSG] Saved to database");

      // ✅ Notify parent component
      if (onMessageSent) {
        onMessageSent();
      }
      
      // ✅ Add message to local state
      if (isMountedRef.current) {
        setMessages((prev) => [...prev, { fromSelf: true, message: msg }]);
      }
      
    } catch (error) {
      console.error("[SEND MSG] Error:", error);
    }
  };

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
        {messages.map((message, index) => {
          return (
            <div ref={scrollRef} key={`msg-${currentChat._id}-${index}`}>
              <div
                className={`message ${message.fromSelf ? "sended" : "recieved"}`}
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
          line-height: 1.2;
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