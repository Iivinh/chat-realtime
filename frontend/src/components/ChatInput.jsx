import React, { useEffect, useMemo, useRef, useState } from "react";
import { BsEmojiSmileFill } from "react-icons/bs";
import { IoMdSend } from "react-icons/io";
import styled, { keyframes } from "styled-components";
import Picker from "emoji-picker-react"; // v4+ onEmojiClick signature: (emojiData, event)

/**
 * ChatInput — fixed & redesigned
 *
 * Improvements:
 * - Fixes emoji-picker onClick signature (v4+)
 * - Enter to send; Shift+Enter for newline
 * - Prevents empty/whitespace-only sends
 * - Click-outside to close emoji panel
 * - Accessible labels, aria, titles
 * - Mobile-friendly layout & larger touch targets
 * - Cleaner, modern visual style (glass + subtle glow)
 * - Optional props: placeholder, disabled, onTyping
 */
export default function ChatInput({
  handleSendMsg,
  placeholder = "Nhập tin nhắn...",
  disabled = false,
  onTyping,
}) {
  const [msg, setMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const trimmed = useMemo(() => msg.trim(), [msg]);
  const canSend = trimmed.length > 0 && !disabled;

  // Close picker when clicking outside
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

  // Notify parent that user is typing (optional)
  useEffect(() => {
    if (!onTyping) return;
    const id = setTimeout(() => onTyping(Boolean(msg)), 150);
    return () => clearTimeout(id);
  }, [msg, onTyping]);

  const handleEmojiToggle = () => setShowEmojiPicker((v) => !v);

  const handleEmojiClick = (emojiData /*, event */) => {
    setMsg((prev) => `${prev}${emojiData.emoji}`);
    inputRef.current?.focus();
  };

  const sendChat = (e) => {
    e?.preventDefault?.();
    if (!canSend) return;
    handleSendMsg(trimmed);
    setMsg("");
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

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
    --epr-search-input-bg-color: transparent;
    --epr-bg-color: #eeecf8ff;
    --epr-text-color: #c51111ff;
    border: none !important;
  }
  .EmojiPickerReact .epr-search-container input {
    color: var(--text);
    border: 1px solid var(--accent);
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
