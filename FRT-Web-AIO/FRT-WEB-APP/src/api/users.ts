import axios from "axios";
import { UserCredential } from "firebase/auth";

// Assuming you have a type for User, define it or import it here
export interface FirebaseUser {
  uid: string;
}

export interface User {
  _id: string;
  displayName: string;
  email: string;
  team_ids: string[];
  telegram_user_id?: string; // Add this line
}

export interface UserResponse {
  success: boolean;
  data: User;
  // Include other properties if needed
}
// Function to add a new user to the database
export const addNewUserToDb = async (userCredential: UserCredential, displayName: string): Promise<void> => {
  const { uid, email } = userCredential.user;
  
  await axios.post(`/api/v1/users/${uid}`, {
    email,
    displayName  // Use the provided displayName
  });
};

// Function to get a single user by UID
export const getUser = async (uid: string): Promise<User> => {
  const response = await axios.get<UserResponse>(`/api/v1/users/${uid}`);
  if (response.data.success) {
    return response.data.data;
  } else {
    throw new Error('Failed to retrieve user');
  }
};

// Function to get a single user by UEMAIL
export const getUserByEmail = async (userEmail: string): Promise<User> => {
  const response = await axios.get<UserResponse>(`/api/v1/users/getUserByEmail/${userEmail}`);
  if (response.data.success) {
    return response.data.data;
  } else {
    throw new Error('Failed to retrieve user');
  }
};

export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
  try {
    const response = await axios.post(`/api/v1/users/getUsersByIds`, {
      userIds
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

export const updateUserDisplayName = async (uid: string, displayName: string): Promise<void> => {
  await axios.patch(`/api/v1/users/${uid}`, { displayName });
};
export const addTeamToUser = async (uid: string, teamId: string): Promise<void> => {
  try {
    const user = await getUser(uid);
    
    if (!user.team_ids) {
      user.team_ids = [];
    }

    if (!user.team_ids.includes(teamId)) {
      user.team_ids.push(teamId);

      const updatedUser = {
        ...user,
        team_ids: user.team_ids
      };

      const response = await axios.put(`/api/v1/users/${uid}`, updatedUser, {
        headers: {
          'api-key': 'badihi'
        }
      });

      if (response.status !== 200) {
        throw new Error('Failed to add team to user');
      }
    }
  } catch (error) {
    console.error('Error adding team to user:', error);
    throw error;
  }
};
export const updateUserTelegramId = async (uid: string, telegram_user_id: string): Promise<void> => {
  try {
    const user = await getUser(uid);

    if (user.telegram_user_id === telegram_user_id) {
      return;
    }

    const updatedUser = {
      ...user,
      telegram_user_id
    };

    const response = await axios.put(`/api/v1/users/${uid}`, updatedUser, {
      headers: {
        'api-key': 'badihi'
      }
    });

    if (response.status !== 200) {
      throw new Error('Failed to update user Telegram ID');
    }
  } catch (error) {
    console.error('Error updating user Telegram ID:', error);
    throw error;
  }
};



