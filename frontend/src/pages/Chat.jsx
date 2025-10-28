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
  
  const isPageVisible = useRef(true);
  const pollingInterval = useRef(null);
  const isRefreshing = useRef(false);
  const reconnectAttempts = useRef(0);

  // 1. Kiểm tra đăng nhập
  useEffect(() => {
    const checkUser = async () => {
      const storedData = localStorage.getItem(import.meta.env.VITE_LOCALHOST_KEY);
      
      if (!storedData) {
        navigate("/login");
        return;
      }
      
      try {
        const userData = JSON.parse(storedData);
        setCurrentUser(userData);
        console.log("[USER] Logged in as:", userData.username);
      } catch (error) {
        console.error("[USER] Parse error:", error);
        navigate("/login");
      }
    };
    
    checkUser();
  }, [navigate]);

  // 2. Khởi tạo Socket với reconnection handling
  useEffect(() => {
    if (!currentUser) return;

    console.log("[SOCKET] Initializing connection...");
    
    socket.current = io(host, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity, // ✅ Không giới hạn reconnect
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    // ✅ Connection event handlers
    socket.current.on("connect", () => {
      console.log("[SOCKET] ✅ Connected:", socket.current.id);
      reconnectAttempts.current = 0;
      
      // ✅ Re-register user khi reconnect
      socket.current.emit("add-user", currentUser._id);
      console.log("[SOCKET] User registered:", currentUser._id);
    });

    socket.current.on("connect_error", (error) => {
      console.error("[SOCKET] ❌ Connection error:", error.message);
      reconnectAttempts.current++;
    });

    socket.current.on("disconnect", (reason) => {
      console.warn("[SOCKET] ⚠️ Disconnected:", reason);
      
      // ✅ Auto reconnect cho một số trường hợp
      if (reason === "io server disconnect") {
        console.log("[SOCKET] Server disconnected, reconnecting...");
        socket.current.connect();
      }
    });

    socket.current.on("reconnect", (attemptNumber) => {
      console.log(`[SOCKET] 🔄 Reconnected after ${attemptNumber} attempts`);
      socket.current.emit("add-user", currentUser._id);
    });

    socket.current.on("reconnect_attempt", (attemptNumber) => {
      console.log(`[SOCKET] 🔄 Reconnecting... attempt ${attemptNumber}`);
    });

    socket.current.on("reconnect_failed", () => {
      console.error("[SOCKET] ❌ Reconnection failed");
    });

    // ✅ Emit add-user ngay lập tức
    socket.current.emit("add-user", currentUser._id);

    return () => {
      console.log("[SOCKET] Cleaning up connection");
      if (socket.current) {
        socket.current.removeAllListeners();
        socket.current.disconnect();
      }
    };
  }, [currentUser]);

  // ✅ 3. LẮNG NGHE CẬP NHẬT TỪ SOCKET
  useEffect(() => {
    if (!socket.current) return;

    const handleConversationUpdate = () => {
      console.log("[SOCKET] 📨 Conversation update signal received");
      
      if (!isRefreshing.current) {
        setIsSearching(false);
        setSearchResults([]);
        
        // ✅ Small delay để backend kịp process
        setTimeout(() => {
          setRefreshFlag(prev => !prev);
        }, 200);
      }
    };

    socket.current.on("update-conversations", handleConversationUpdate);

    return () => {
      if (socket.current) {
        socket.current.off("update-conversations", handleConversationUpdate);
      }
    };
  }, [socket]);

  // ✅ 4. THEO DÕI PAGE VISIBILITY
  useEffect(() => {
    const handleVisibilityChange = () => {
      const wasHidden = !isPageVisible.current;
      isPageVisible.current = !document.hidden;
      
      if (wasHidden && !document.hidden && currentUser && !isRefreshing.current) {
        console.log("[VISIBILITY] 👀 Page visible again, refreshing...");
        
        // ✅ Check socket connection khi quay lại
        if (socket.current && !socket.current.connected) {
          console.log("[VISIBILITY] Socket disconnected, reconnecting...");
          socket.current.connect();
        }
        
        setRefreshFlag(prev => !prev);
      }
    };

    const handleFocus = () => {
      if (currentUser && !isRefreshing.current) {
        console.log("[FOCUS] 🎯 Window focused, refreshing...");
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

  // ✅ 5. POLLING với thời gian hợp lý
  useEffect(() => {
    if (!currentUser || isSearching) return;

    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    pollingInterval.current = setInterval(() => {
      if (isPageVisible.current && !isSearching && !isRefreshing.current) {
        console.log("[POLLING] ⏰ Auto-refresh conversations...");
        setRefreshFlag(prev => !prev);
      }
    }, 5000); // 30 giây

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [currentUser, isSearching]);

  // ✅ 6. Lấy danh sách conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!currentUser || isRefreshing.current) return;

      if (!currentUser.isAvatarImageSet) {
        navigate("/setAvatar");
        return;
      }

      isRefreshing.current = true;
      console.log("[API] 🔄 Fetching conversations...");
      
      try {
        const { data } = await axios.get(
          `${allConversationalUsersRoute}/${currentUser._id}`,
          { timeout: 10000 } // ✅ Add timeout
        );
        
        setContacts(data);
        console.log("[API] ✅ Loaded", data.length, "conversations");
        
      } catch (error) {
        console.error("[API] ❌ Error:", error.message);
        
        // ✅ Retry logic
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          console.log("[API] Timeout, retrying in 2s...");
          setTimeout(() => {
            setRefreshFlag(prev => !prev);
          }, 2000);
        }
      } finally {
        setTimeout(() => {
          isRefreshing.current = false;
        }, 500);
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
    console.log("[SEARCH] 🔍 Searching for:", query);
    
    try {
      const { data } = await axios.get(
        `${searchUserRoute}?username=${query}&userId=${currentUser._id}`,
        { timeout: 5000 }
      );
      setSearchResults(data);
      console.log("[SEARCH] ✅ Found", data.length, "users");
    } catch (error) {
      console.error("[SEARCH] ❌ Error:", error.message);
      setSearchResults([]);
    }
  };

  // 8. Chuyển chat
  const handleChatChange = (chat) => {
    console.log("[CHAT] 💬 Switching to:", chat.username);
    setCurrentChat(chat);
  };

  // ✅ 9. Handler khi gửi tin nhắn
  const handleMessageSent = () => {
    console.log("[MESSAGE] ✉️ Message sent");
    
    setIsSearching(false);
    setSearchResults([]);
    
    if (!isRefreshing.current) {
      setTimeout(() => {
        setRefreshFlag(prev => !prev);
      }, 500);
    }
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