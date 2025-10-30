//import thư viện và các thành phần cần thiết từ React
import React, { useEffect, useState } from "react";
//Import styled-components để tạo CSS-in-JS
import styled from "styled-components";
//Import axios để gọi API
import axios from "axios";
//Import loader.gif
import loader from "../assets/loader.gif";
//Import react-toastify
import { ToastContainer, toast } from "react-toastify";
//Import toastify css
import "react-toastify/dist/ReactToastify.css";
//Import useNavigate
import { useNavigate } from "react-router-dom";
//Import route API
import { setAvatarRoute } from "../utils/APIRoutes";
//Import multiavatar để tạo avatar ngẫu nhiên
import multiavatar from "@multiavatar/multiavatar/esm";

// Định nghĩa component SetAvatar
export default function SetAvatar() {
  // Sử dụng hook useNavigate để điều hướng trang
  const navigate = useNavigate();
  const [avatars, setAvatars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState(undefined);
  // Cấu hình toastify
  const toastOptions = {
    position: "bottom-right",
    autoClose: 8000,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
  };
  // Kiểm tra đăng nhập
  useEffect(() => {
    const user = localStorage.getItem(import.meta.env.VITE_LOCALHOST_KEY);
    if (!user) navigate("/login");
  }, [navigate]);
  // Hàm tạo tên ngẫu nhiên cho avatar
  const generateRandomName = () => Math.random().toString(36).substring(2, 10);
  // Tạo 4 avatar ngẫu nhiên khi component mount
  useEffect(() => {
    const generateAvatars = () => {
      const data = [];
      for (let i = 0; i < 4; i++) {
        const randomName = generateRandomName();
        const svgCode = multiavatar(randomName);
        const encoded = btoa(unescape(encodeURIComponent(svgCode)));
        data.push(encoded);
      }
      setAvatars(data);
      setIsLoading(false);
    };

    generateAvatars();
  }, []);
  // Hàm đặt hình đại diện
  const setProfilePicture = async () => {
    // Kiểm tra xem người dùng đã chọn avatar chưa
    if (selectedAvatar === undefined) {
      toast.error("Please select an avatar", toastOptions);
      return;
    }
    // Lấy thông tin người dùng từ localStorage
    const user = await JSON.parse(
      localStorage.getItem(import.meta.env.VITE_LOCALHOST_KEY)
    );
    // Gọi API để đặt avatar
    const { data } = await axios.post(`${setAvatarRoute}/${user._id}`, {
      image: avatars[selectedAvatar],
    });
    // Xử lý phản hồi từ API
    if (data.isSet) {
      user.isAvatarImageSet = true;
      user.avatarImage = data.image;
      localStorage.setItem(
        import.meta.env.VITE_LOCALHOST_KEY,
        JSON.stringify(user)
      );
      navigate("/");
    } else {
      toast.error("Error setting avatar. Please try again.", toastOptions);
    }
  };

  return (
    <>
      {isLoading ? (
        <Container>
          <img src={loader} alt="loader" className="loader" />
        </Container>
      ) : (
        <Container>
          <div className="title-container">
            <h1>Chọn một hình đại diện cho tài khoản của bạn</h1>
          </div>
          <div className="avatars">
            {avatars.map((avatar, index) => (
              <div
                key={index}
                className={`avatar ${
                  selectedAvatar === index ? "selected" : ""
                }`}
                onClick={() => setSelectedAvatar(index)}
              >
                <img
                  src={`data:image/svg+xml;base64,${avatar}`}
                  alt={`avatar-${index}`}
                />
              </div>
            ))}
          </div>
          <button onClick={setProfilePicture} className="submit-btn">
            Đặt làm hình đại diện
          </button>
          <ToastContainer />
        </Container>
      )}
    </>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 3rem;
  background-color: #131324;
  height: 100vh;
  width: 100vw;

  .loader {
    max-inline-size: 100%;
  }

  .title-container {
    h1 {
      color: white;
    }
  }

  .avatars {
    display: flex;
    gap: 2rem;

    .avatar {
      border: 0.4rem solid transparent;
      padding: 0.4rem;
      border-radius: 5rem;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: 0.5s ease-in-out;

      img {
        height: 6rem;
        transition: 0.5s ease-in-out;
      }

      &:hover {
        cursor: pointer;
        transform: scale(1.1);
      }
    }

    .selected {
      border: 0.4rem solid #4e0eff;
    }
  }

  .submit-btn {
    background-color: #4e0eff;
    color: white;
    padding: 1rem 2rem;
    border: none;
    font-weight: bold;
    cursor: pointer;
    border-radius: 0.4rem;
    font-size: 1rem;
    text-transform: uppercase;

    &:hover {
      background-color: #3c0edc;
    }
  }
`;
