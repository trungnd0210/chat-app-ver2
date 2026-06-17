// Các kiểu dữ liệu dùng chung trong toàn ứng dụng

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  last_seen: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

// Một cuộc trò chuyện 1-1 đã được "làm phẳng" để hiển thị ở sidebar:
// kèm theo thông tin người đối diện, tin nhắn cuối và số tin chưa đọc.
export type Conversation = {
  id: string;
  last_message: string | null;
  last_message_at: string | null;
  other: Profile;
  unread: number;
};

// Dạng dữ liệu thô trả về từ RPC get_my_conversations()
export type ConversationRow = {
  conversation_id: string;
  last_message: string | null;
  last_message_at: string | null;
  other_id: string;
  other_full_name: string | null;
  other_avatar_url: string | null;
  other_email: string | null;
  other_last_seen: string | null;
  unread: number;
};
