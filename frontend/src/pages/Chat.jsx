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

  const [refreshFlag, setRefreshFlag] = useState(false); // Kích hoạt tải lại Contacts
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  // 1. KHẮC PHỤC LỖI ASYNC: Kiểm tra Đăng nhập/Lấy User
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
  }, [navigate]); // Thêm navigate vào dependency để linter không cảnh báo

  // 2. KHỞI TẠO SOCKET (Logic này đã đúng)
  useEffect(() => {
    if (currentUser) {
      socket.current = io(host);
      socket.current.emit("add-user", currentUser._id);
    }
  }, [currentUser]);

  // 3. KHẮC PHỤC LỖI ASYNC: Lấy Danh bạ
  useEffect(() => {
    const currentSocket = socket.current;
    const handleConversationUpdate = () => {
      console.log("Nhận tín hiệu cập nhật danh bạ Realtime!");
      setIsSearching(false);
      setSearchResults([]);
      setRefreshFlag(prev => !prev);
    };

    if (currentSocket) {
      currentSocket.on("update-conversations", handleConversationUpdate);

      // 🟢 SỬA LỖI CLEANUP: Cần truyền tên hàm handler vào off() 🟢
      return () => {
        // Chỉ hủy lắng nghe hàm handleConversationUpdate cụ thể
        currentSocket.off("update-conversations", handleConversationUpdate);
      };
    }
  }, [socket, setIsSearching, setSearchResults, setRefreshFlag]);

  useEffect(() => {
    const fetchConversations = async () => {
      if (currentUser.isAvatarImageSet) {
        try {
          // Sử dụng getConversationsRoute MỚI (đã sửa ở Back-end)
          const { data } = await axios.get(`${allConversationalUsersRoute}/${currentUser._id}`);
          setContacts(data);
        } catch (error) {
          console.error("Lỗi khi tải danh sách cuộc trò chuyện:", error);
        }
      } else {
        navigate("/setAvatar");
      }
    };

    if (currentUser) {
      fetchConversations();
    }
    // THÊM refreshFlag VÀO DEPENDENCY ĐỂ KÍCH HOẠT REALTIME RELOAD
  }, [currentUser, navigate, refreshFlag]);

  // TRONG Chat.jsx (Hàm handleSearchUser)

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
      console.error("Lỗi khi tìm kiếm người dùng:", error);
      setSearchResults([]);
    }
  };

  const handleChatChange = (chat) => {
    setCurrentChat(chat);
    setIsSearching(false);
    setSearchResults([]);
    setRefreshFlag(prev => !prev);
  };

  return (
    <>
      <Container>
        <div className="container">
          <Contacts
            contacts={contacts}
            changeChat={handleChatChange}
            handleSearch={handleSearchUser}
            isSearching={isSearching}
            searchResults={searchResults} />
          {currentChat === undefined ? (
            <Welcome />
          ) : (
            <ChatContainer currentChat={currentChat} socket={socket}
              onMessageSent={() => setRefreshFlag(prev => !prev)} />
          )}
        </div>
      </Container>
    </>
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
