import { apiFetch } from '../../utils/api';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  citedSources?: Array<{ type: string; name: string }>;
  ragEngine?: string;
  feedback?: 'like' | 'dislike' | null;
}

export interface ChatbotQueryResponse {
  success: boolean;
  answer: string;
  citedSources: Array<{ type: string; name: string }>;
  ragEngine: string;
  timestamp: string;
}

export async function askChatbot(
  prompt: string,
  courseId?: string,
  history: ChatMessage[] = []
): Promise<ChatbotQueryResponse> {
  const formattedHistory = history.map((msg) => ({
    sender: msg.sender,
    text: msg.text,
  }));

  const response = await apiFetch('/chatbot/query', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      courseId: courseId || null,
      conversationHistory: formattedHistory,
    }),
  });

  return response;
}

export async function getChatSuggestions(currentPath?: string): Promise<string[]> {
  try {
    const query = currentPath ? `?currentPath=${encodeURIComponent(currentPath)}` : '';
    const res = await apiFetch(`/chatbot/suggestions${query}`);
    return res.suggestions || [];
  } catch (error) {
    return [
      'What courses am I enrolled in?',
      'Do I have any pending assignments due soon?',
      'What is my overall attendance percentage?',
      'How do I prepare for upcoming tests?',
    ];
  }
}
