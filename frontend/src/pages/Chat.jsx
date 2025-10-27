import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import styled from "styled-components";
import { allConversationalUsersRoute, searchUserRoute, host } from "../utils/APIRoutes";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";

export default function Chat() {
  const navigate = useNavigate();
  const socket = useRef();
  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  
  // ✅ Thêm ref để track visibility
  const isPageVisible = useRef(true);
  const pollingInterval = useRef(null);

  // 1. Kiểm tra đăng nhập
  useEffect(() => {
    const checkUser = async () => {
      if (!localStorage.getItem(import.meta.env.VITE_LOCALHOST_KEY)) {
        navigate("/login");
      } else {
        const storedData = localStorage.getItem(import.meta.env.VITE_LOCALHOST_KEY);
        if (storedData) {
          setCurrentUser(await JSON.parse(storedData));
        } else {
          navigate("/login");
        }
      }
    };
    checkUser();
  }, [navigate]);

  // 2. Khởi tạo Socket
  useEffect(() => {
    if (currentUser) {
      socket.current = io(host, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      
      socket.current.emit("add-user", currentUser._id);
      console.log("Socket connected and user added:", currentUser._id);

      return () => {
        if (socket.current) {
          socket.current.disconnect();
        }
      };
    }
  }, [currentUser]);

  // ✅ 3. LẮNG NGHE CẬP NHẬT TỪ SOCKET (Khi đang mở app)
  useEffect(() => {
    if (!socket.current) return;

    const handleMessageReceive = (msg) => {
      console.log("New message received:", msg);
      setRefreshFlag(prev => !prev);
    };

    const handleConversationUpdate = () => {
      console.log("Conversation update signal received");
      setIsSearching(false);
      setSearchResults([]);
      setRefreshFlag(prev => !prev);
    };

    socket.current.on("msg-recieve", handleMessageReceive);
    socket.current.on("update-conversations", handleConversationUpdate);

    return () => {
      if (socket.current) {
        socket.current.off("msg-recieve", handleMessageReceive);
        socket.current.off("update-conversations", handleConversationUpdate);
      }
    };
  }, [socket]);

  // ✅ 4. THEO DÕI PAGE VISIBILITY (Phát hiện khi user quay lại tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisible.current = !document.hidden;
      
      if (!document.hidden && currentUser) {
        // ✅ Khi user quay lại tab → Refresh ngay lập tức
        console.log("Page visible again, refreshing conversations...");
        setRefreshFlag(prev => !prev);
      }
    };

    const handleFocus = () => {
      if (currentUser) {
        console.log("Window focused, refreshing conversations...");
        setRefreshFlag(prev => !prev);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [currentUser]);

  // ✅ 5. POLLING - TỰ ĐỘNG KIỂM TRA MỖI 10 GIÂY (Backup cho socket)
  useEffect(() => {
    if (!currentUser || isSearching) return;

    // Clear interval cũ nếu có
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    // ✅ Chỉ polling khi page đang visible
    pollingInterval.current = setInterval(() => {
      if (isPageVisible.current && !isSearching) {
        console.log("Auto-refresh conversations (polling)...");
        setRefreshFlag(prev => !prev);
      }
    }, 1000); // 10 giây

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [currentUser, isSearching]);

  // 6. Lấy danh sách conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!currentUser) return;

      if (currentUser.isAvatarImageSet) {
        try {
          const { data } = await axios.get(`${allConversationalUsersRoute}/${currentUser._id}`);
          setContacts(data);
          console.log("Conversations loaded:", data.length);
        } catch (error) {
          console.error("Error loading conversations:", error);
        }
      } else {
        navigate("/setAvatar");
      }
    };

    fetchConversations();
  }, [currentUser, navigate, refreshFlag]);

  // 7. Tìm kiếm user
  const handleSearchUser = async (query) => {
    if (!currentUser || query.trim() === "") {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data } = await axios.get(`${searchUserRoute}?username=${query}&userId=${currentUser._id}`);
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    }
  };

  // 8. Chuyển chat
  const handleChatChange = (chat) => {
    setCurrentChat(chat);
    setIsSearching(false);
    setSearchResults([]);
  };

  // 9. Handler khi gửi tin nhắn thành công
  const handleMessageSent = () => {
    console.log("Message sent, triggering refresh");
    setRefreshFlag(prev => !prev);
  };

  return (
    <Container>
      <div className="container">
        <Contacts
          contacts={contacts}
          changeChat={handleChatChange}
          handleSearch={handleSearchUser}
          isSearching={isSearching}
          searchResults={searchResults}
        />
        {currentChat === undefined ? (
          <Welcome />
        ) : (
          <ChatContainer
            currentChat={currentChat}
            socket={socket}
            onMessageSent={handleMessageSent}
          />
        )}
      </div>
    </Container>
  );
}

const COOL_ACCENT = '#A7C5F8';
const STATE_ACCENT = '#C2D4F6';
const PRIMARY_TEXT_COLOR = '#204683';
const BACKGROUND_COLOR = '#292A2D';
const FORM_COLOR = '#00000076';

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: stretch;
  padding: 0;
  margin: 0;
  background-color: ${BACKGROUND_COLOR};
  .container {
    height: 100%;
    width: 100%;
    background-color: ${BACKGROUND_COLOR};
    display: grid;
    grid-template-columns: 25% 75%;
    @media screen and (min-width: 720px) and (max-width: 1080px) {
      grid-template-columns: 35% 65%;
    }
  }
`;