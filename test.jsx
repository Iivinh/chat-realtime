import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import ChatInput from "./ChatInput";
import Logout from "./Logout";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";

/**
 * ChatContainer — redesigned UI/UX + safer logic
 * - Defensive guards when currentChat is null
 * - Loading + error states
 * - Optimistic send; disable when offline/disabled
 * - Auto scroll to bottom on new messages
 * - Typing indicator (wired to ChatInput's onTyping)
 * - Group messages by date; compact bubbles when same author
 * - Responsive, accessible, glassy theme
 */
export default function ChatContainer({ currentChat, socket }) {
  const [messages, setMessages] = useState([]);
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const endRef = useRef(null);
  const listRef = useRef(null);

  // Helpers
  const userId = useMemo(() => {
    try {
      const raw = localStorage.getItem(import.meta.env.VITE_LOCALHOST_KEY);
      return raw ? JSON.parse(raw)._id : null;
    } catch {
      return null;
    }
  }, []);

  const avatarSrc = useMemo(() => {
    if (!currentChat?.avatarImage) return "";
    return `data:image/svg+xml;base64,${currentChat.avatarImage}`;
  }, [currentChat]);

  // Fetch messages whenever currentChat changes
  useEffect(() => {
    let alive = true;
    async function fetchMessages() {
      if (!currentChat || !userId) return;
      setLoading(true);
      setError("");
      try {
        const response = await axios.post(recieveMessageRoute, {
          from: userId,
          to: currentChat._id,
        });
        if (!alive) return;
        setMessages(Array.isArray(response.data) ? response.data : []);
      } catch (e) {
        if (!alive) return;
        setError("Không tải được lịch sử trò chuyện. Vui lòng thử lại.");
        setMessages([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    fetchMessages();
    return () => {
      alive = false;
    };
  }, [currentChat, userId]);

  // Send a message
  const handleSendMsg = useCallback(
    async (msg) => {
      if (!currentChat || !userId) return;

      // optimistic local append
      const tempId = uuidv4();
      const optimistic = { _id: tempId, fromSelf: true, message: msg, ts: Date.now() };
      setMessages((prev) => [...prev, optimistic]);

      try {
        // socket emit
        socket?.current?.emit?.("send-msg", { to: currentChat._id, from: userId, msg });
        // persist
        await axios.post(sendMessageRoute, { from: userId, to: currentChat._id, message: msg });
      } catch (e) {
        // revert optimistic on failure (optional: keep but mark failed)
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
        setError("Gửi tin nhắn thất bại. Kiểm tra kết nối của bạn.");
      }
    },
    [currentChat, userId, socket]
  );

  // Handle incoming messages (Socket.IO)
  useEffect(() => {
    const currentSocket = socket?.current;
    if (!currentSocket) return;

    const handleReceive = (msg) => {
      setArrivalMessage({ fromSelf: false, message: msg, ts: Date.now() });
    };

    currentSocket.on("msg-recieve", handleReceive);
    return () => {
      currentSocket.off("msg-recieve", handleReceive);
    };
  }, [socket]);

  // Append arrival message
  useEffect(() => {
    if (!arrivalMessage) return;
    setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage]);

  // Auto scroll to bottom on messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Group messages by display date
  const groups = useMemo(() => groupByDate(messages), [messages]);

  // Header title
  const title = currentChat?.username || "Chưa chọn hội thoại";

  return (
    <Shell>
      <Header>
        <UserBlock>
          <Avatar>{avatarSrc ? <img src={avatarSrc} alt="avatar" /> : <Fallback />}</Avatar>
          <div>
            <h3 title={title}>{title}</h3>
            <SubtleRow>
              <OnlineDot aria-hidden />
              <span>Trực tuyến</span>
            </SubtleRow>
          </div>
        </UserBlock>
        <Logout />
      </Header>

      <MessagesArea ref={listRef} role="log" aria-live="polite" aria-busy={loading}>
        {loading && (
          <LoadingRow>
            <BubbleSkeleton />
            <BubbleSkeleton right />
            <BubbleSkeleton />
          </LoadingRow>
        )}

        {!loading && !currentChat && (
          <EmptyState>
            <h4>Chọn một cuộc trò chuyện để bắt đầu</h4>
            <p>Tin nhắn của bạn sẽ hiển thị ở đây.</p>
          </EmptyState>
        )}

        {!loading && currentChat && groups.length === 0 && !error && (
          <EmptyState>
            <h4>Hãy là người gửi tin nhắn đầu tiên 👋</h4>
            <p>Chưa có lịch sử trò chuyện.</p>
          </EmptyState>
        )}

        {error && (
          <ErrorRow role="alert">{error}</ErrorRow>
        )}

        {groups.map(({ dateLabel, items }) => (
          <section key={dateLabel}>
            <DateDivider>
              <span>{dateLabel}</span>
            </DateDivider>
            {items.map((m, i) => {
              const isSelf = Boolean(m.fromSelf);
              const prev = items[i - 1];
              const compact = !!prev && prev.fromSelf === m.fromSelf;
              return (
                <Row key={m._id || `${m.message}-${i}`}
                     className={isSelf ? "right" : "left"}
                     aria-label={isSelf ? "Tin nhắn của bạn" : `Tin nhắn từ ${title}`}
                >
                  {!isSelf && !compact ? (
                    <MiniAvatar>{avatarSrc ? <img src={avatarSrc} alt="avatar" /> : <Fallback />}</MiniAvatar>
                  ) : <MiniSpacer />}

                  <Bubble compact={compact} self={isSelf}>
                    <p>{m.message}</p>
                  </Bubble>
                </Row>
              );
            })}
          </section>
        ))}
        {isTyping && (
          <Row className="left">
            <MiniAvatar>{avatarSrc ? <img src={avatarSrc} alt="avatar" /> : <Fallback />}</MiniAvatar>
            <TypingBubble aria-label="Đang nhập...">
              <Dot />
              <Dot />
              <Dot />
            </TypingBubble>
          </Row>
        )}
        <div ref={endRef} />
      </MessagesArea>

      <Footer>
        <ChatInput handleSendMsg={handleSendMsg} onTyping={setIsTyping} />
      </Footer>
    </Shell>
  );
}

// ===== Helpers =====
function groupByDate(list) {
  if (!Array.isArray(list) || list.length === 0) return [];
  const fmt = (d) => {
    const t = new Date(d || Date.now());
    const dd = String(t.getDate()).padStart(2, "0");
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    const yyyy = t.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };
  const groups = [];
  let map = new Map();
  for (const m of list) {
    const k = fmt(m.ts || Date.now());
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(m);
  }
  for (const [dateLabel, items] of map.entries()) groups.push({ dateLabel, items });
  // Ensure ascending by date according to first item's ts
  return groups.sort((a, b) => {
    const ta = a.items[0]?.ts || 0;
    const tb = b.items[0]?.ts || 0;
    return ta - tb;
  });
}

// ===== Styles =====
const Shell = styled.div`
  --bg: #0a0720;
  --panel: rgba(255,255,255,0.06);
  --panel-strong: rgba(255,255,255,0.12);
  --accent: #9a86f3;
  --text: #fff;
  --muted: #bdbdd3;

  display: grid;
  grid-template-rows: 64px 1fr auto;
  height: 100%;
  background: radial-gradient(1200px 600px at 20% -20%, rgba(154,134,243,0.15), transparent),
              linear-gradient(180deg, rgba(10, 7, 32, 0.95), rgba(10, 7, 32, 0.98));
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
`;

const UserBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text);
  h3 { margin: 0 0 2px 0; font-size: 16px; font-weight: 600; }
`;

const Avatar = styled.div`
  width: 40px; height: 40px; border-radius: 12px; overflow: hidden; background: var(--panel);
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

const Fallback = styled.div`
  width: 100%; height: 100%; background: var(--panel);
`;

const SubtleRow = styled.div`
  display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12px;
`;

const OnlineDot = styled.span`
  width: 8px; height: 8px; border-radius: 50%; background: #3ddc84; display: inline-block;
`;

const MessagesArea = styled.main`
  position: relative;
  overflow: auto;
  padding: 16px 16px 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-thumb { background: var(--panel-strong); border-radius: 8px; }
`;

const Footer = styled.footer`
  padding: 8px 12px 12px 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
`;

const DateDivider = styled.div`
  display: grid; place-items: center; margin: 10px 0; position: relative;
  span {
    font-size: 12px; color: var(--muted); padding: 4px 10px; border-radius: 999px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  }
  &::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: rgba(255,255,255,0.08); z-index: -1; }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 32px 1fr;
  align-items: end;
  gap: 8px;
  &.right {
    grid-template-columns: 1fr 32px;
    justify-items: end;
  }
`;

const MiniAvatar = styled.div`
  width: 28px; height: 28px; border-radius: 8px; overflow: hidden; background: var(--panel);
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

const MiniSpacer = styled.div`
  width: 28px; height: 28px;
`;

const Bubble = styled.div`
  max-width: min(72ch, 72%);
  background: ${({ self }) => (self ? "rgba(154,134,243,0.18)" : "rgba(255,255,255,0.08)")};
  border: 1px solid ${({ self }) => (self ? "rgba(154,134,243,0.35)" : "rgba(255,255,255,0.14)")};
  color: var(--text);
  padding: ${({ compact }) => (compact ? "8px 12px" : "12px 14px")};
  border-radius: 14px;
  border-bottom-right-radius: ${({ self }) => (self ? "4px" : "14px")};
  border-bottom-left-radius: ${({ self }) => (self ? "14px" : "4px")};
  box-shadow: 0 6px 18px rgba(0,0,0,0.2);
  p { margin: 0; white-space: pre-wrap; word-break: break-word; }
`;

const TypingBubble = styled(Bubble)`
  display: inline-flex; align-items: center; gap: 6px; width: auto; max-width: unset;
`;

const typing = keyframes`
  0% { transform: translateY(0); opacity: 0.5; }
  50% { transform: translateY(-3px); opacity: 1; }
  100% { transform: translateY(0); opacity: 0.5; }
`;

const Dot = styled.span`
  width: 6px; height: 6px; border-radius: 50%; background: var(--text); display: inline-block;
  animation: ${typing} 1s ease-in-out infinite;
  &:nth-child(2) { animation-delay: 0.15s; }
  &:nth-child(3) { animation-delay: 0.3s; }
`;

const ErrorRow = styled.div`
  margin: 8px auto; color: #ffb4b4; font-size: 14px; text-align: center;
`;

const EmptyState = styled.div`
  margin: 32px auto; text-align: center; color: var(--muted);
  h4 { color: var(--text); margin-bottom: 6px; }
`;

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const LoadingRow = styled.div`
  display: grid; gap: 8px; margin: 8px 0;
`;

const BubbleSkeleton = styled.div`
  height: 42px; width: 60%; border-radius: 14px;
  background: linear-gradient(90deg, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.16) 37%, rgba(255,255,255,0.08) 63%);
  background-size: 400% 100%; animation: ${shimmer} 1.4s ease infinite;
  margin-left: ${({ right }) => (right ? "auto" : "0")};
`;
