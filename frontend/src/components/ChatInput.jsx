// Import các hooks cần thiết từ React
import React, { useEffect, useMemo, useRef, useState } from "react";
// Import icon mặt cười và icon gửi từ react-icons
import { BsEmojiSmileFill } from "react-icons/bs";
import { IoMdSend } from "react-icons/io";
// Import styled-components và keyframes để tạo animation
import styled, { keyframes } from "styled-components";
// Import component emoji picker
import Picker from "emoji-picker-react"; 


export default function ChatInput({
  handleSendMsg,                          // Hàm callback khi gửi tin nhắn
  placeholder = "Nhập tin nhắn...",       // Placeholder mặc định cho ô nhập
  disabled = false,                       // Trạng thái disabled của input
  onTyping,                               // Callback khi người dùng đang gõ
}) {
  // State lưu nội dung tin nhắn đang soạn
  const [msg, setMsg] = useState("");
  // State điều khiển hiển thị/ẩn bảng emoji
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // Ref tham chiếu đến container chính
  const containerRef = useRef(null);
  // Ref tham chiếu đến textarea input
  const inputRef = useRef(null);
  // Tính toán giá trị msg đã loại bỏ khoảng trắng thừa
  const trimmed = useMemo(() => msg.trim(), [msg]);
  // Xác định xem có thể gửi tin nhắn hay không
  const canSend = trimmed.length > 0 && !disabled;

  // Đóng bảng emoji khi click ra ngoài
  useEffect(() => {
    function onDocClick(e) {
      if (!showEmojiPicker) return;
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showEmojiPicker]);

  // Gọi callback onTyping khi người dùng gõ
  useEffect(() => {
    if (!onTyping) return;
    const id = setTimeout(() => onTyping(Boolean(msg)), 150);
    return () => clearTimeout(id);
  }, [msg, onTyping]);

  // Hàm xử lý toggle bảng emoji
  const handleEmojiToggle = () => setShowEmojiPicker((v) => !v);
  // Hàm xử lý khi chọn emoji
  const handleEmojiClick = (emojiData /*, event */) => {
    setMsg((prev) => `${prev}${emojiData.emoji}`);
    inputRef.current?.focus();
  };
  // Hàm gửi tin nhắn
  const sendChat = (e) => {
    e?.preventDefault?.();
    if (!canSend) return;
    handleSendMsg(trimmed);
    setMsg("");
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };
  // Hàm xử lý phím Enter để gửi tin nhắn
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  };

  return (
    <Container ref={containerRef} aria-label="Chat input">
      <Toolbar>
        <IconButton
          type="button"
          onClick={handleEmojiToggle}
          title={showEmojiPicker ? "Đóng emoji" : "Chèn emoji"}
          aria-label="Chèn emoji"
          disabled={disabled}
        >
          <BsEmojiSmileFill />
        </IconButton>
        {showEmojiPicker && (
          <EmojiPanel>
            <Picker onEmojiClick={handleEmojiClick} autoFocusSearch={false} />
          </EmojiPanel>
        )}
      </Toolbar>

      <Form onSubmit={sendChat} role="form" aria-label="Gửi tin nhắn">
        <TextArea
          ref={inputRef}
          rows={1}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-disabled={disabled}
          aria-label="Soạn tin nhắn"
        />
        <SendButton
          type="submit"
          aria-label="Gửi"
          title={canSend ? "Gửi (Enter)" : disabled ? "Đang tắt" : "Nhập tin nhắn để gửi"}
          disabled={!canSend}
        >
          <IoMdSend />
        </SendButton>
      </Form>
    </Container>
  );
}

const STATE_ACCENT = '#C2D4F6';

// ============ Styles ============
const glow = keyframes`
  0% { box-shadow: 0 0 0px rgba(154, 134, 243, 0.0); }
  100% { box-shadow: 0 0 14px transparent }
`;

const Container = styled.div`
  --bg: #0a0720;
  --panel: rgba(255, 255, 255, 0.06);
  --panel-strong: rgba(255, 255, 255, 0.12);
  --accent: #ffff;
  --accent-weak: #b8aef7;
  --text: #ffffff;
  --muted: #c8c8d0;

  display: grid;
  grid-template-columns: 48px 1fr;
  align-items: end;
  gap: 12px;
  width: 100%;
  background: transparent;
  padding: 12px 16px;
  position: relative;
`;

const Toolbar = styled.div`
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const IconButton = styled.button`
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #ffff56;
  transition: transform 0.12s ease, background 0.12s ease, opacity 0.2s;
  cursor: pointer;

  svg { font-size: 22px; }

  &:hover { background: var(--panel-strong); transform: translateY(-1px); }
  &:active { transform: translateY(0); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const EmojiPanel = styled.div`
  position: absolute;
  bottom: 56px;
  left: 0;
  z-index: 50;
  background: transparent;
  border: 1px solid var(--accent);
  border-radius: 14px;
  overflow: hidden;
  animation: ${glow} 180ms ease-out forwards;

  /* Tweak third-party classes lightly */
  .EmojiPickerReact {
    --epr-emoji-size: 24px;
    --epr-category-navigation-button-size: 28px;
<<<<<<< HEAD
    --epr-search-input-bg-color: transparent;
    --epr-bg-color: var(--bg);
    --epr-text-color: var(--text);
    border: none !important;
  }
  .EmojiPickerReact .epr-emoji-category-label {
    color: var(--text);
    background-color: var(--bg);
  }
  .EmojiPickerReact .epr-search-container input {
    color: var(--text);
    background-color: var(--bg);
    border: 1px solid var(--accent);
=======
    --epr-bg-color: #14131bff !important;  /* Màu nền tối */
    --epr-category-label-bg-color: #0a0720 !important;  /* Màu nền category */
    --epr-search-input-bg-color: rgba(255, 255, 255, 0.08) !important;  /* Màu nền search */
    --epr-text-color: #ffffff !important;  /* Màu chữ trắng */
    --epr-highlight-color: #9a86f3 !important;  /* Màu highlight */
    --epr-hover-bg-color: rgba(255, 255, 255, 0.1) !important;  /* Màu hover */
    --epr-picker-border-color: transparent !important;
    border: none !important;
  }
  
  .EmojiPickerReact .epr-category-nav {
    display: flex !important;
    flex-wrap: nowrap !important;
    gap: 4px !important;
    padding: 8px !important;
    background-color: #0a0720 !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
  }
    .EmojiPickerReact .epr-category-nav button {
    flex-shrink: 0 !important;
    width: 32px !important;
    height: 32px !important;
    min-width: 32px !important;
    padding: 4px !important;
    margin: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .EmojiPickerReact .epr-category-nav svg {
    width: 20px !important;
    height: 20px !important;
  }

  .EmojiPickerReact .epr-search-container input {
    color: #ffffff !important;
    background-color: rgba(255, 255, 255, 0.08) !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    border-radius: 8px;
  }
  
  .EmojiPickerReact .epr-search-container input::placeholder {
    color: #bdbdd3 !important;
  }
  
  .EmojiPickerReact .epr-emoji-category-label {
    color: #ffffff !important;
    background-color: #525159ff !important;
  }
  
  .EmojiPickerReact button:hover {
    background-color: rgba(255, 255, 255, 0.1) !important;
>>>>>>> 21ed47e5b089a9cdd30113490aa6b1ae235058fc
  }
`;

const Form = styled.form`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 50px;
  width: 100%;
  padding: 8px;
  border-radius: 16px;
  background: var(--panel);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const TextArea = styled.textarea`
  flex: 1;
  resize: none;
  max-height: 100px;
  min-height: 44px;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 16px;
  line-height: 1.35;
  padding: 10px 12px;
  outline: none;

  &::placeholder { color: #bdbdd3; }
  &:focus { outline: none; }
`;

const SendButton = styled.button`
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  border: none;
  background: transparent;
  color: ${STATE_ACCENT};
  cursor: pointer;
  transition: transform 0.12s ease, filter 0.2s, opacity 0.2s;

  svg { font-size: 22px; }

  &:hover { filter: brightness(1.05); transform: translateY(-1px); }
  &:active { transform: translateY(0); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
