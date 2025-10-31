// Import các hooks cần thiết từ React
import React, { useState, useEffect } from "react";
// Import styled-components và keyframes để tạo animation
import styled from "styled-components";

// Component Contacts nhận props từ Chat.jsx
export default function Contacts({ contacts, changeChat, handleSearch, isSearching, searchResults }) {
  // State lưu thông tin người dùng hiện tại
  const [currentUserId, setCurrentUserId] = useState(undefined);
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  // Lấy dữ liệu người dùng từ localStorage khi component mount
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
          setCurrentUserId(data._id);
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
  }, []); // Chạy một lần khi mount

  // Xử lý thay đổi input tìm kiếm
  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    handleSearch(query); // Gọi hàm tìm kiếm trong Chat.jsx
  };

  // Xử lý thay đổi cuộc trò chuyện hiện tại
  const changeCurrentChat = (index, contact) => {
    if (!isSearching) {
      setCurrentSelected(index);
    } else {
      setCurrentSelected(undefined);
    }
    changeChat(contact);
  };
  // Chọn danh sách hiển thị dựa trên trạng thái tìm kiếm
  const displayList = isSearching ? searchResults : contacts;
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
            <h3>MESSAPP</h3>
          </div>
          <SearchContainer>
            <input
              type="text"
              placeholder="Tìm username để bắt đầu chat..."
              value={searchQuery}
              onChange={handleInputChange}
            />
          </SearchContainer>
          <div className="contacts">
            {displayList.length > 0 ? (
              displayList.map((contact, index) => {
                const lastMsg = contact.lastMessage;
                let senderText = "";
                let isCurrentUserSender = false;

                if (lastMsg && currentUserId) {
                  isCurrentUserSender = lastMsg.sender === currentUserId;
                  senderText = isCurrentUserSender ? "Bạn: " : "";
                }

                // Chỉ highlight nếu không đang tìm kiếm
                const isSelected = !isSearching && index === currentSelected;

                return (
                  <div
                    key={contact._id}
                    className={`contact ${isSelected ? "selected" : ""}`}
                    onClick={() => changeCurrentChat(index, contact)}
                  >
                    <div className="avatar">
                      <img
                        src={`data:image/svg+xml;base64,${contact.avatarImage}`}
                        alt=""
                      />
                    </div>
                    <div className="details">
                      <div className="username">
                        <h3>{contact.username}</h3>
                      </div>
                      {/* ẨN TIN NHẮN CUỐI CÙNG KHI ĐANG TÌM KIẾM */}
                      {!isSearching && (
                        <div className="last-message">
                          <p className={isCurrentUserSender ? "self-sent" : ""}>
                            {lastMsg ? `${senderText}${lastMsg.message}` : "Bắt đầu trò chuyện"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <NoResults>
                {isSearching ? "Không tìm thấy người dùng." : "Chưa có cuộc trò chuyện nào."}
              </NoResults>
            )}
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
        </Container >
      )
      }
    </>
  );
}

const COOL_ACCENT = '#A7C5F8';
const STATE_ACCENT = '#C2D4F6';
const PRIMARY_TEXT_COLOR = '#204683';
const BACKGROUND_COLOR = '#292A2D';
const FORM_COLOR = '#00000076';

const SearchContainer = styled.div`
    padding: 1rem;
    input {
        width: 100%;
        padding: 0.5rem;
        border-radius: 0.5rem;
        border: 1px solid #4C4C4C;
        background-color: #202022;
        color: white;
        font-size: 1rem;
        outline: none;
    }
`;

const NoResults = styled.div`
    padding: 1rem;
    text-align: center;
    color: #A7C5F8;
    font-style: italic;
`;

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 10% 65% 15%; 
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