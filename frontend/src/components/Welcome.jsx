import React, { useState, useEffect } from "react";
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
      <img src={Robot} alt="" />
      <h1>
        Welcome, <span>{userName || "Guest"}!</span> {/* Sử dụng || "Guest" để tránh hiển thị trống khi đang tải */}
      </h1>
      <h3>Please select a chat to Start messaging.</h3>
    </Container>
  );
}

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
    color: #4e0eff;
  }
`;
