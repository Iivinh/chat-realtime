// Định nghĩa component Register
import React, { useState, useEffect } from "react";
//Import axios để gọi API
import axios from "axios";
//Import styled-components để tạo CSS-in-JS
import styled from "styled-components";
//Import useNavigate
import { useNavigate, Link } from "react-router-dom";
//Import react-toastify
import Logo from "../assets/logo.svg";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { registerRoute } from "../utils/APIRoutes";

// Định nghĩa component Register
export default function Register() {
  // Sử dụng hook useNavigate để điều hướng trang
  const navigate = useNavigate();
  const toastOptions = {
    position: "bottom-right",
    autoClose: 8000,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
  };
  // State để lưu trữ giá trị form
  const [values, setValues] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  // Kiểm tra nếu đã đăng nhập thì chuyển hướng về trang chính
  useEffect(() => {
    if (localStorage.getItem(import.meta.env.REACT_APP_LOCALHOST_KEY)) {
      navigate("/");
    }
  }, []);
  // Xử lý thay đổi input
  const handleChange = (event) => {
    setValues({ ...values, [event.target.name]: event.target.value });
  };
  // Hàm xác thực form
  const handleValidation = () => {
    const { password, confirmPassword, username, email } = values;
    if (password !== confirmPassword) {
      toast.error(
        "Mật khẩu và Xác minh mật khẩu phải giống nhau.",
        toastOptions
      );
      return false;
    } else if (username.length < 3) {
      toast.error(
        "Tên đăng nhập nên có tối thiểu 3 kí tự.",
        toastOptions
      );
      return false;
    } else if (password.length < 8) {
      toast.error(
        "Mật khẩu nên có tối thiểu 8 kí tự.",
        toastOptions
      );
      return false;
    } else if (email === "") {
      toast.error("Vui lòng nhập địa chỉ email.", toastOptions);
      return false;
    }

    return true;
  };
  // Xử lý khi submit form
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (handleValidation()) {
      const { email, username, password } = values;
      const { data } = await axios.post(registerRoute, {
        username,
        email,
        password,
      });

      if (data.status === false) {
        toast.error(data.msg, toastOptions);
      }
      if (data.status === true) {
        localStorage.setItem(
          import.meta.env.REACT_APP_LOCALHOST_KEY,
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
            <h1>MESSAPP</h1>
          </div>
          <input
            type="text"
            placeholder="Tên đăng nhập"
            name="username"
            onChange={(e) => handleChange(e)}
          />
          <input
            type="email"
            placeholder="Email"
            name="email"
            onChange={(e) => handleChange(e)}
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            name="password"
            onChange={(e) => handleChange(e)}
          />
          <input
            type="password"
            placeholder="Xác minh mật khẩu"
            name="confirmPassword"
            onChange={(e) => handleChange(e)}
          />
          <button type="submit">Đăng ký</button>
          <span>
            Bạn đã có tài khoản? <Link to="/login">Đăng nhập.</Link>
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
    padding: 3rem 5rem;
  }
  input {
    background-color: transparent;
    padding: 1rem;
    border: 0.1rem solid white;
    border-radius: 0.4rem;
    color: white;
    width: 100%;
    font-size: 1rem;
    &:focus {
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
