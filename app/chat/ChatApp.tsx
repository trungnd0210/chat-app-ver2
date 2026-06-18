"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/actions";
import { useNotifications } from "@/lib/hooks/useNotifications";
import Avatar from "@/components/Avatar";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import NewChatModal from "@/components/NewChatModal";
import ProfileModal from "@/components/ProfileModal";
import type {
  Conversation,
  ConversationRow,
  Message,
  Profile,
} from "@/lib/types";

export default function ChatApp({ me: initialMe }: { me: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const { permission, requestPermission, notify } = useNotifications();

  const [me, setMe] = useState<Profile>(initialMe);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);

  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Refs để callback realtime luôn đọc được giá trị mới nhất (tránh stale closure).
  const activeConvRef = useRef<string | null>(null);
  const profileMap = useRef<Record<string, Profile>>({});
  const onIncomingRef = useRef<(m: Message) => void>(() => {});
  const loadConvTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Tải dữ liệu -------------------------------------------------------
  const mapRow = (row: ConversationRow): Conversation => ({
    id: row.conversation_id,
    last_message: row.last_message,
    last_message_at: row.last_message_at,
    unread: Number(row.unread) || 0,
    other: {
      id: row.other_id,
      full_name: row.other_full_name,
      avatar_url: row.other_avatar_url,
      email: row.other_email,
      last_seen: row.other_last_seen,
    },
  });

  const loadConversations = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_my_conversations");
    if (error) {
      console.error("Failed to load conversations:", error.message);
      setLoadingConvs(false);
      return;
    }
    const convs = (data as ConversationRow[]).map(mapRow);
    const activeId = activeConvRef.current;

    convs.forEach((c) => (profileMap.current[c.other.id] = c.other));
    // Hội thoại đang mở thì luôn coi như đã đọc.
    setConversations(
      convs.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c))
    );

    // Cập nhật thông tin người đối diện (trạng thái online, tin cuối) cho khung đang mở.
    if (activeId) {
      const found = convs.find((c) => c.id === activeId);
      if (found) {
        setActiveConv((prev) =>
          prev ? { ...prev, other: found.other } : prev
        );
      }
    }
    setLoadingConvs(false);
  }, [supabase]);

  const scheduleLoadConversations = useCallback(() => {
    if (loadConvTimer.current) clearTimeout(loadConvTimer.current);
    loadConvTimer.current = setTimeout(() => loadConversations(), 250);
  }, [loadConversations]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, last_seen")
      .neq("id", me.id)
      .order("full_name", { ascending: true });
    if (!error && data) {
      setUsers(data as Profile[]);
      (data as Profile[]).forEach((u) => (profileMap.current[u.id] = u));
    }
    setLoadingUsers(false);
  }, [supabase, me.id]);

  const loadMessages = useCallback(
    async (convId: string) => {
      setLoadingMsgs(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (!error && data) setMessages(data as Message[]);
      setLoadingMsgs(false);
    },
    [supabase]
  );

  // ---- Đánh dấu đã đọc ---------------------------------------------------
  const markAsRead = useCallback(
    async (convId: string) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread: 0 } : c))
      );
      await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", convId)
        .eq("user_id", me.id);
    },
    [supabase, me.id]
  );

  // ---- Chọn / mở hội thoại ----------------------------------------------
  const selectConversation = useCallback(
    (conv: Conversation) => {
      setActiveConv(conv);
      activeConvRef.current = conv.id;
      setMobileView("chat");
      loadMessages(conv.id);
      markAsRead(conv.id);
    },
    [loadMessages, markAsRead]
  );

  const startChatWithUser = useCallback(
    async (user: Profile) => {
      setNewChatOpen(false);
      const { data, error } = await supabase.rpc("get_or_create_conversation", {
        other_user_id: user.id,
      });
      if (error) {
        console.error("Failed to create conversation:", error.message);
        return;
      }
      const convId = data as string;
      const existing = conversations.find((c) => c.id === convId);
      selectConversation(
        existing ?? {
          id: convId,
          last_message: null,
          last_message_at: new Date().toISOString(),
          unread: 0,
          other: user,
        }
      );
      loadConversations();
    },
    [supabase, conversations, selectConversation, loadConversations]
  );

  // ---- Gửi tin (optimistic để cảm giác tức thì) -------------------------
  const handleSend = useCallback(
    async (text: string) => {
      const convId = activeConvRef.current;
      if (!convId) return;

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimistic: Message = {
        id: tempId,
        conversation_id: convId,
        sender_id: me.id,
        content: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: convId, sender_id: me.id, content: text })
        .select()
        .single();

      if (error) {
        console.error("Failed to send message:", error.message);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }
      if (data) {
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          return withoutTemp.some((m) => m.id === (data as Message).id)
            ? withoutTemp
            : [...withoutTemp, data as Message];
        });
        scheduleLoadConversations();
      }
    },
    [supabase, me.id, scheduleLoadConversations]
  );

  // ---- Xử lý tin đến qua realtime ---------------------------------------
  onIncomingRef.current = (m: Message) => {
    if (m.conversation_id === activeConvRef.current) {
      setMessages((prev) =>
        prev.some((x) => x.id === m.id) ? prev : [...prev, m]
      );
      if (m.sender_id !== me.id) markAsRead(m.conversation_id);
    } else if (m.sender_id !== me.id) {
      const sender = profileMap.current[m.sender_id];
      const name = sender?.full_name || sender?.email || "New message";
      notify(name, m.content, {
        icon: sender?.avatar_url || undefined,
        tag: m.conversation_id,
      });
    }
    scheduleLoadConversations();
  };

  // ---- Khởi tạo: tải dữ liệu, heartbeat online, đăng ký realtime --------
  useEffect(() => {
    loadConversations();
    loadUsers();

    const updateLastSeen = () => {
      supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", me.id)
        .then(() => {});
    };
    updateLastSeen();
    const heartbeat = setInterval(updateLastSeen, 30_000);

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => onIncomingRef.current(payload.new as Message)
      )
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        updateLastSeen();
        if (activeConvRef.current) markAsRead(activeConvRef.current);
        loadConversations();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-zalo-bg">
      {/* Thanh điều hướng dọc (chỉ desktop) */}
      <nav className="hidden w-16 flex-col items-center justify-between bg-zalo-blue py-5 md:flex">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
          <MessageCircle size={24} />
        </div>
        <div className="flex flex-col items-center gap-4">
          <button onClick={() => setProfileOpen(true)} title="Edit profile">
            <Avatar src={me.avatar_url} name={me.full_name} size={40} />
          </button>
          <form action={signOut}>
            <button
              type="submit"
              title="Sign out"
              className="rounded-lg p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <LogOut size={20} />
            </button>
          </form>
        </div>
      </nav>

      {/* Danh sách hội thoại */}
      <div
        className={`${
          mobileView === "chat" ? "hidden md:flex" : "flex"
        } h-full w-full md:w-auto md:flex-shrink-0`}
      >
        <Sidebar
          me={me}
          conversations={conversations}
          activeId={activeConv?.id ?? null}
          loading={loadingConvs}
          notifPermission={permission}
          onEnableNotifications={requestPermission}
          onSelect={selectConversation}
          onNewChat={() => setNewChatOpen(true)}
          onSignOut={() => signOut()}
          onOpenProfile={() => setProfileOpen(true)}
        />
      </div>

      {/* Khung chat */}
      <div
        className={`${
          mobileView === "list" ? "hidden md:flex" : "flex"
        } h-full flex-1`}
      >
        <ChatWindow
          me={me}
          conversation={activeConv}
          messages={messages}
          loading={loadingMsgs}
          sending={false}
          onSend={handleSend}
          onBack={() => setMobileView("list")}
        />
      </div>

      <NewChatModal
        open={newChatOpen}
        users={users}
        loading={loadingUsers}
        onClose={() => setNewChatOpen(false)}
        onSelectUser={startChatWithUser}
      />

      <ProfileModal
        open={profileOpen}
        me={me}
        onClose={() => setProfileOpen(false)}
        onSaved={(updated) => {
          setMe(updated);
          profileMap.current[updated.id] = updated;
        }}
      />
    </div>
  );
}
