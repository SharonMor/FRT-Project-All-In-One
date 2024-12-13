import axios from "axios";

export type telegramUser = {
    _id: string, // telegram id
    user_id: string, // firebase id
}

export interface TelegramUserResponse {
    success: boolean;
    data: telegramUser;
  }

export const addUserToTelegramUsers = async (uid: string, telegram_user_Id: string): Promise<void> => {
    
    await axios.post(`/api/v1/telegramUsers/${telegram_user_Id}`, {
        localUserId:uid
    });
  };

  export const getTelegramUser = async (tuid: string): Promise<telegramUser> => {
    const response = await axios.get<TelegramUserResponse>(`/api/v1/telegramUsers/${tuid}`);
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error('Failed to retrieve user');
    }
  };