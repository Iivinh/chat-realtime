import React, { useState, useEffect } from "react";
import Logout from "./Logout";
import styled from "styled-components";
import Robot from "../assets/robot.gif";

export default function Welcome() {
  const [userName, setUserName] = useState("");

  // Khắc phục lỗi: Tách logic bất đồng bộ vào hàm riêng
  useEffect(() => {
    const fetchUserName = async () => {
      const storedData = localStorage.getItem(
        import.meta.env.VITE_LOCALHOST_KEY
      );

      if (storedData) {
        // BƯỚC 1: Parse dữ liệu
        const data = await JSON.parse(storedData);

        // BƯỚC 2: Kiểm tra và SET state
        if (data && data.username) {
          setUserName(data.username);
        }
      }
    };

    fetchUserName();

  }, []); // ✅ Dependency array trống là đúng

  return (
    <Container>
      <LogoutButtonWrapper>
        <Logout />
      </LogoutButtonWrapper>
      <img src={Robot} alt="" />
      <h2>
        Xin chào, <span>{userName || "Guest"}!</span> {/* Sử dụng || "Guest" để tránh hiển thị trống khi đang tải */}
      </h2>
      <h4>Vui lòng chọn một cuộc trò chuyện để bắt đầu gửi tin nhắn.</h4>
    </Container>
  );
}

const PRIMARY_TEXT_COLOR = '#A7C5F8';
const LogoutButtonWrapper = styled.div`
    position: absolute;
    top: 1rem;
    right: 1rem;
`;
const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  flex-direction: column;
  img {
    height: 20rem;
  }
  span {
    color: ${PRIMARY_TEXT_COLOR};
  }
`;
