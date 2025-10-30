//import React from "react";
import React, { useState, useEffect } from "react";
//Import axios để gọi API
import axios from "axios";
//Import styled-components để tạo CSS-in-JS
import styled from "styled-components";
//Import useNavigate
import { useNavigate, Link } from "react-router-dom";
//Import react-toastify
import Logo from "../assets/logo.svg";
//Import toastify và css
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { loginRoute } from "../utils/APIRoutes";
import 'bootstrap/dist/css/bootstrap.min.css';

// Định nghĩa component Login
export default function Login() {
  // Sử dụng hook useNavigate để điều hướng trang
  const navigate = useNavigate();
  const [values, setValues] = useState({ username: "", password: "" });
  // Cấu hình toastify
  const toastOptions = {
    position: "bottom-right",
    autoClose: 8000,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
  };
  // Kiểm tra nếu đã đăng nhập thì chuyển hướng về trang chính
  useEffect(() => {
    if (localStorage.getItem(import.meta.env.VITE_LOCALHOST_KEY)) {
      navigate("/");
    }
  }, []);
  // Xử lý thay đổi input
  const handleChange = (event) => {
    setValues({ ...values, [event.target.name]: event.target.value });
  };
  // Hàm xác thực form
  const validateForm = () => {
    // Lấy giá trị từ state
    const { username, password } = values;
    // Kiểm tra các điều kiện
    if (username === "") {
      toast.error("Vui lòng nhập Tên đăng nhập và Mật khẩu.", toastOptions);
      return false;
    } else if (password === "") {
      toast.error("Vui lòng nhập Tên đăng nhập và Mật khẩu.", toastOptions);
      return false;
    }
    return true;
  };
  // Xử lý khi submit form
  const handleSubmit = async (event) => {
    // Ngăn người dùng gửi form
    event.preventDefault();
    if (validateForm()) {
      const { username, password } = values;
      const { data } = await axios.post(loginRoute, {
        username,
        password,
      });
      if (data.status === false) {
        toast.error(data.msg, toastOptions);
      }
      if (data.status === true) {
        localStorage.setItem(
          import.meta.env.VITE_LOCALHOST_KEY,
          JSON.stringify(data.user)
        );

        navigate("/");
      }
    }
  };

  return (
    <>
      <FormContainer>
        <form action="" onSubmit={(event) => handleSubmit(event)}>
          <div className="brand">
            <img src={Logo} alt="logo" />
            <h1>snappy</h1>
          </div>
          <input
            type="text"
            placeholder="Username"
            name="username"
            onChange={(e) => handleChange(e)}
            min="3"
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            name="password"
            onChange={(e) => handleChange(e)}
          />
          <button type="submit">Đăng nhập</button>
          <span>
            Bạn chưa có tài khoản? <Link to="/register">Tạo mới.</Link>
          </span>
        </form>
      </FormContainer>
      <ToastContainer />
    </>
  );
}

const COOL_ACCENT = '#A7C5F8';
const STATE_ACCENT = '#C2D4F6';
const PRIMARY_TEXT_COLOR = '#204683';
const BACKGROUND_COLOR = '#292A2D';
const FORM_COLOR = '#00000076';

const FormContainer = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  align-items: center;
  background-color: ${BACKGROUND_COLOR};
  .brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    img {
      height: 5rem;
    }
    h1 {
      color: white;
      text-transform: uppercase;
    }
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    background-color: ${FORM_COLOR};
    border-radius: 2rem;
    padding: 5rem;
  }

  input {
    background-color: transparent;
    padding: 1rem;
    border: 0.1rem solid #8E918F;
    border-radius: 0.4rem;
    color: white;
    width: 100%;
    font-size: 1rem;
    &:focus {
      color: white;
      border: 0.1rem solid ${COOL_ACCENT};
      outline: none;
    }
  }

  button {
    background-color: ${COOL_ACCENT};
    color: ${PRIMARY_TEXT_COLOR};
    padding: 1rem 2rem;
    border: none;
    font-weight: bold;
    cursor: pointer;
    border-radius: 0.4rem;
    font-size: 1rem;
    text-transform: uppercase;
    &:hover {
      background-color: ${STATE_ACCENT};
    }
  }
  span {
    color: white;
    text-transform: uppercase;
    a {
      color: ${COOL_ACCENT};
      text-decoration: none;
      font-weight: bold;
      transition: all 0.2s ease-in-out;

      &:hover {
        color: ${STATE_ACCENT};
        text-decoration: underline;
      }
    }
  }
`;