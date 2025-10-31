//Import thư viện và các thành phần cần thiết from React
import React from "react";
import { useNavigate } from "react-router-dom";
import { BiPowerOff } from "react-icons/bi";
//Import styled-components để tạo kiểu cho button
import styled from "styled-components";
import axios from "axios";
import { logoutRoute } from "../utils/APIRoutes";

// Định nghĩa component Logout
export default function Logout() {
  // Sử dụng hook useNavigate để điều hướng trang
  const navigate = useNavigate();
  // Hàm xử lý khi người dùng click nút logout
  const handleClick = async () => {
    const id = await JSON.parse(
      localStorage.getItem(import.meta.env.VITE_LOCALHOST_KEY)
    )._id;
    const data = await axios.get(`${logoutRoute}/${id}`);
    if (data.status === 200) {
      localStorage.clear();
      navigate("/login");
    }
  };
  return (
    <Button onClick={handleClick}>
      <BiPowerOff />
    </Button>
  );
}

const COOL_ACCENT = '#A7C5F8';
const PRIMARY_TEXT_COLOR = '#204683';

const Button = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background-color: ${COOL_ACCENT};
  border: none;
  cursor: pointer;
  svg {
    font-size: 1.3rem;
    color: ${PRIMARY_TEXT_COLOR};
  }
`;
