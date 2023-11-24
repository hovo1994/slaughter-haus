export const chatDb: Array<ChatMessage> = [];

export interface ChatMessage {
  msg_type: "chat_message";
  user_id: string;
  uset_name: string;
  message?: string;
}
