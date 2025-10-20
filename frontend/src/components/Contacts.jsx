import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Logo from "../assets/logo.svg";

// Import axios (nếu cần thiết cho việc lấy dữ liệu khác)

export default function Contacts({ contacts, changeChat }) {
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);

  // Khắc phục lỗi: Tách logic async ra khỏi hàm chính của useEffect
  useEffect(() => {
    const fetchUserData = async () => {
      // Đảm bảo dữ liệu được lấy ra
      const storedData = localStorage.getItem(
        import.meta.env.VITE_LOCALHOST_KEY
      );

      if (storedData) {
        // Dùng try...catch để xử lý lỗi parse nếu dữ liệu không phải JSON
        try {
          const data = await JSON.parse(storedData);
          setCurrentUserName(data.username);
          setCurrentUserImage(data.avatarImage);
        } catch (error) {
          console.error("Error parsing user data from localStorage:", error);
          // Có thể chuyển hướng về trang đăng nhập nếu dữ liệu lỗi
        }
      }
      // Nếu không có storedData, currentUserImage và Name vẫn là undefined, 
      // kích hoạt Loading State.
    };

    fetchUserData();
  }, []); // ✅ Array trống là đúng, vì bạn chỉ cần chạy nó một lần khi mount

  const changeCurrentChat = (index, contact) => {
    setCurrentSelected(index);
    changeChat(contact);
  };

  return (
    <>
      {/* Sử dụng điều kiện để kiểm tra nếu dữ liệu user đã tải xong.
        Hiển thị trạng thái tải nếu chưa có cả avatar và username.
      */}
      {!currentUserImage || !currentUserName ? (
        <LoadingContainer>
          <h3>Đang tải dữ liệu người dùng...</h3>
        </LoadingContainer>
      ) : (
        <Container>
          <div className="brand">
            {/* <img src={Logo} alt="logo" /> */}
            <h3>snappy</h3>
          </div>
          <div className="contacts">
            {contacts.map((contact, index) => {
              return (
                <div
                  key={contact._id}
                  className={`contact ${index === currentSelected ? "selected" : ""
                    }`}
                  onClick={() => changeCurrentChat(index, contact)}
                >
                  <div className="avatar">
                    <img
                      src={`data:image/svg+xml;base64,${contact.avatarImage}`}
                      alt=""
                    />
                  </div>
                  <div className="username">
                    <h3>{contact.username}</h3>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="current-user">
            <div className="avatar">
              <img
                src={`data:image/svg+xml;base64,${currentUserImage}`}
                alt="avatar"
              />
            </div>
            <div className="username">
              <h2>{currentUserName}</h2>
            </div>
          </div>
        </Container>
      )}
    </>
  );
}

const COOL_ACCENT = '#A7C5F8';
const STATE_ACCENT = '#C2D4F6';
const PRIMARY_TEXT_COLOR = '#204683';
const BACKGROUND_COLOR = '#292A2D';
const FORM_COLOR = '#00000076';

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 75% 15%;
  overflow: hidden;
  background-color: ${FORM_COLOR};
  .brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    img {
      height: 2rem;
    }
    h3 {
      color: white;
      text-transform: uppercase;
    }
  }
  .contacts {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: auto;
    gap: 0.8rem;
    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: #ffffff39;
        width: 0.1rem;
        border-radius: 1rem;
      }
    }
    .contact {
      background-color: #ffffff34;
      min-height: 5rem;
      cursor: pointer;
      width: 90%;
      border-radius: 0.2rem;
      padding: 0.4rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      transition: 0.5s ease-in-out;
      .avatar {
        img {
          height: 3rem;
        }
      }
      .username {
        h3 {
          color: white;
        }
      }
    }
    .selected {
      background-color: ${COOL_ACCENT};
      .username h3 {
            color: ${PRIMARY_TEXT_COLOR}; /* #204683 (Dùng màu chữ tối trên nền sáng) */
        }
    }
  }

  .current-user {
    background-color: #101018;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    .avatar {
      img {
        height: 4rem;
        max-inline-size: 100%;
      }
    }
    .username {
      h2 {
        color: white;
      }
    }
    @media screen and (min-width: 720px) and (max-width: 1080px) {
      gap: 0.5rem;
      .username {
        h2 {
          font-size: 1rem;
        }
      }
    }
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  background-color: #080420; // Hoặc bất kỳ màu nền nào bạn muốn
  h3 {
    color: white;
  }
`;