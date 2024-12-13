import axios from "axios";
import { MessageType } from "../types/messageType";

export enum Timeline {
  DELETE_MARK = 1,
  UPDATE_MARK = 2,
  ADD_MARK = 3,
  UPDATE_MAP = 4,
  CREATE_MISSION = 5,
  UPDATE_MISSION = 6,
  DELETE_MISSION = 7,
  START_NEW_CHAT = 550

}

export type FilterType = 'all' | 'chat' | 'timeline' | 'action';

export type TimelineMessage = {
  timeline: string;
  data: any;
  mission_id?: string;
  mission_data?: {
    _id: string;
    creator_id: string;
    assigned_id: string | null;
    name: string;
    description: string;
    start_time: number | null;
    end_time: number | null;
    deadline: number | null;
    mark_id: string | null;
    history_assignee: string[];
    mission_status: number;
    created_at: number;
    updated_at: number;
    team_id: string;
  };
};

export type PhotoMessage = {
  file_name: string;
  file_data: string;
};

export type ReplyMarkUp = {
  inline_keyboard: Array<Array<{
    text: string;
    callback_data: string;
  }>>;
}

export type ActionRequestMessage = {
  content: string;
  reply_markup: ReplyMarkUp;
};
export type ActionResponseMessage = {
  query_message_id: string,
  data: string,
}

export type MessageContent = string | TimelineMessage | PhotoMessage | ActionRequestMessage | ActionResponseMessage;

export interface Message {
  id: string;
  message: MessageContent;
  senderId: string;
  type: MessageType;
  typing?: boolean;
  timestamp?: string;
}

export type ChatInsights = {
  number_of_rows: number;
  number_of_columns: number;
  column_names: string[];
};

export type GetChatRequest = {
  chat_id: string;
  page: number;
  page_size: number;
};

export type GetChatResponse = Message[];

export type CallbackQueryResult = {
  message: ActionResponseMessage
  message_type: string;
  chat_id: string,
  message_id: string,
  timestamp: number,
  user_id: string,
};

export type GetCallbackQueryResultsResponse = CallbackQueryResult[];


export const getChatInsights = async (chatId: string): Promise<ChatInsights> => {
  try {
    const response = await axios.get<ChatInsights>(`/api/v1/messenger/getChatInsights/${chatId}`, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': 'badihi'
      }
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error("Error fetching chat insights:", error);
      console.error("Error response:", error.response);
      console.error("Error request:", error.request);
      console.error("Error config:", error.config);
      throw new Error(`Error fetching chat insights: ${error.response?.data?.detail || error.message || "Unknown error"}`);
    } else {
      console.error("Unknown error occurred:", error);
      throw new Error("An unexpected error occurred while fetching chat insights");
    }
  }
};

export const getChat = async (chatId: string, page: number = 0, pageSize: number = 30): Promise<GetChatResponse> => {
  try {
    const response = await axios.post<GetChatResponse>(`/api/v1/messenger/getChat`, {
      chat_id: chatId,
      page: page,
      page_size: pageSize
    }, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': 'badihi'
      }
    });
    console.log("Got chat messages, this is the response:", response);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error("Error fetching chat messages:", error.response?.data);
      throw new Error(`Error fetching chat messages: ${error.response?.data.detail || "Unknown error"}`);
    } else {
      console.error("Unknown error occurred:", error);
      throw new Error("An unexpected error occurred while fetching chat messages");
    }
  }
};

export const getCallbackQueryResults = async (chatId: string, callbackQueryMessageId: string): Promise<GetCallbackQueryResultsResponse> => {
  try {
    const response = await axios.get<GetCallbackQueryResultsResponse>(
      `/api/v1/messenger/getCallbackQueryResults/${chatId}/${callbackQueryMessageId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': 'badihi'
        }
      }
    );
    console.log("Got callback query results, this is the response:", response);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error("Error fetching callback query results:", error.response?.data);
      throw new Error(`Error fetching callback query results: ${error.response?.data?.detail || error.message || "Unknown error"}`);
    } else {
      console.error("Unknown error occurred:", error);
      throw new Error("An unexpected error occurred while fetching callback query results");
    }
  }
};

// Helper function to parse complex JSON strings
export function parseComplexJsonString(input: any): any {
  if (typeof input === 'object' && input !== null) {
    return input; // If it's already an object, return it as is
  }

  if (typeof input !== 'string') {
    console.error('Expected string input for parsing, received:', typeof input);
    return null;
  }

  try {
    // First, try to parse it as-is
    return JSON.parse(input);
  } catch (error) {
    // If that fails, replace single quotes with double quotes and try again
    try {
      return JSON.parse(input.replace(/'/g, '"'));
    } catch (innerError) {
      // If that also fails, try to extract content
      const contentMatch = input.match(/'content':\s*'(.*?)'/);
      if (contentMatch && contentMatch[1]) {
        try {
          return JSON.parse(contentMatch[1]);
        } catch (contentError) {
          console.error('Failed to parse content match:', contentError);
        }
      }
      console.error('Failed to parse the JSON string:', innerError);
      return null;
    }
  }
}

// Helper function to parse inline keyboard data
export function parseInlineKeyboardData(input: any, msg: any): ActionRequestMessage | null {
  if (!input) {
    console.error('Null or undefined input for inline keyboard data');
    return null;
  }

  // If input is a string, try to parse it
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input.replace(/'/g, '"'));
    } catch (error) {
      console.error('Failed to parse inline keyboard data string:', error);
      return null;
    }
  }

  // Now input should be an object
  if (typeof input !== 'object') {
    console.error('Unexpected type for inline keyboard data:', typeof input);
    return null;
  }
  console.log('the message inside formatter:', msg);

  // Check if the input has the inline_keyboard property
  if (input.inline_keyboard && Array.isArray(input.inline_keyboard)) {
    return {
      content: msg.message || '',
      reply_markup: {
        inline_keyboard: input.inline_keyboard
      }
    };
  }

  // If the input itself is the reply_markup object
  if (input.reply_markup && input.reply_markup.inline_keyboard) {
    return {
      content: input.content || '',
      reply_markup: input.reply_markup
    };
  }

  console.error('Unexpected format for inline keyboard data:', input);
  return null;
}

// Updated formatMessages function
export const formatMessages = (rawMessages: any[]): Message[] => {
  return rawMessages.map((msg: any) => {
    let formattedMessage: string | TimelineMessage | PhotoMessage | ActionRequestMessage | ActionResponseMessage = msg.message;
    let messageType = msg.message_type || msg.type as MessageType;

    if (msg.message_type === "callback_data") {
      messageType = MessageType.ActionResponse
      formattedMessage = parseComplexJsonString(msg.message)
    }
    else if (msg.reply_markup) {
      messageType = MessageType.ActionRequest;
      const parsedActionRequest = parseInlineKeyboardData(msg.reply_markup, msg);
      if (parsedActionRequest) {
        // formattedMessage = {...msg, reply_markup:parsedActionRequest}
        formattedMessage = parsedActionRequest;
      } else {
        console.error('Failed to parse action request:', msg.reply_markup);
        formattedMessage = { content: 'Failed to parse action request', reply_markup: { inline_keyboard: [] } };
      }
    } else if (messageType === MessageType.Timeline) {
      formattedMessage = parseComplexJsonString(msg.message) || { timeline: '0', data: {} };
    } else if (messageType === MessageType.Photo) {
      formattedMessage = parseComplexJsonString(msg.message) || { file_name: 'Error', file_data: '' };
    }

    return {
      id: msg.message_id || `${msg.user_id}${msg.id}${msg.chat_id}${msg.timestamp}`,
      message: formattedMessage,
      senderId: msg.user_id || msg.senderId,
      type: messageType,
      timestamp: msg.timestamp
    };
  });
};


export type GetChatTimelineExcelRequest = {
  chat_id: string;
  start_time?: number;
  end_time?: number;
};

export type TimelineExcelItem = {
  Timestamp: string;
  'User Name': string;
  Timeline: string;
};

export type GetChatTimelineExcelResponse = TimelineExcelItem[];

export const getChatTimelineExcel = async (request: GetChatTimelineExcelRequest): Promise<GetChatTimelineExcelResponse> => {
  try {
    const response = await axios.post<GetChatTimelineExcelResponse>(
      `/api/v1/messenger/getChatTimelineExcel`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': 'badihi'
        }
      }
    );
    console.log("Got chat timeline excel data, this is the response:", response);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error("Error fetching chat timeline excel data:", error.response?.data);
      throw new Error(`Error fetching chat timeline excel data: ${error.response?.data?.detail || error.message || "Unknown error"}`);
    } else {
      console.error("Unknown error occurred:", error);
      throw new Error("An unexpected error occurred while fetching chat timeline excel data");
    }
  }
};