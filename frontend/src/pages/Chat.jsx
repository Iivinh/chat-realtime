import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import styled from "styled-components";
import { allUsersRoute, host } from "../utils/APIRoutes";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";

export default function Chat() {
  const navigate = useNavigate();
  const socket = useRef();
  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(undefined);

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
    const fetchContacts = async () => {
      if (currentUser.isAvatarImageSet) {
        const data = await axios.get(`${allUsersRoute}/${currentUser._id}`);
        setContacts(data.data);
      } else {
        navigate("/setAvatar");
      }
    };

    if (currentUser) { // Chỉ gọi khi currentUser đã được thiết lập
      fetchContacts();
    }
  }, [currentUser, navigate]); // Thêm navigate vào dependency

  const handleChatChange = (chat) => {
    setCurrentChat(chat);
  };

  return (
    <>
      <Container>
        <div className="container">
          <Contacts contacts={contacts} changeChat={handleChatChange} />
          {currentChat === undefined ? (
            <Welcome />
          ) : (
            <ChatContainer currentChat={currentChat} socket={socket} />
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
  flex-direction: flex-start;
  justify-content: flex-start;
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
