//missions.ts - api file
import axios from "axios";

export interface Mission {
  _id: string;
  mission_id: string;
  creator_id: string;
  team_id: string;
  name: string;
  description: string;
  mission_status: number;
  mark_id?: string;
  deadline?: number;
  start_time?: number;
  end_time?: number;
  assigned_id?: string;
  history_assignee?: string[];
  created_at: number;
  updated_at: number;
  publish_to_telegram?: boolean;
  is_attendance: boolean;
}

export interface CreateMissionRequest {
  creator_id: string;
  team_id: string;
  name: string;
  description: string;
  is_attendance: boolean;
  publish_to_telegram: boolean;
  mark_id?: string;
  deadline?: number;
}

export interface UpdateMissionRequest {
  mission_id: string;
  publish_to_telegram?: boolean;
  name?: string;
  description?: string;
  mission_status?: number;
  mark_id?: string;
  deadline?: number;
  assigned_id?: string;
  sender_id: string;
}

export interface deleteMissionRequest {
  mission_id: string,
  name: string,
  sender_id: string,
}

const API_KEY = 'badihi';

// Function to create a mission
export const createMission = async (createMissionRequest: CreateMissionRequest): Promise<Mission> => {
  try {
    const response = await axios.post<Mission>("/api/v1/missions/createMission", createMissionRequest, {
      headers: {
        'api-key': API_KEY
      }
    });
    console.log("Mission created successfully:", response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error creating mission:", error.response?.data);
      throw new Error(`Error creating mission: ${error.response?.data.message || "Unknown error"}`);
    } else {
      console.error("Unknown error occurred:", error);
      throw new Error("An unexpected error occurred while creating the mission");
    }
  }
};

// Function to get user/team missions
export const getUserMissions = async (teamId: string): Promise<Mission[]> => {
  try {
    const response = await axios.get<Mission[]>(`/api/v1/missions/getUserMissions/${teamId}`, {
      headers: {
        'api-key': API_KEY
      }
    });
    console.log("Missions retrieved successfully:", response.data);
    return response.data.map(mission => ({
      ...mission,
      mission_id: mission._id
    }));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error retrieving missions:", error.response?.data);
      throw new Error(`Error retrieving missions: ${error.response?.data.message || "Unknown error"}`);
    } else {
      console.error("Unknown error occurred:", error);
      throw new Error("An unexpected error occurred while retrieving missions");
    }
  }
};

// Function to update mission details
export const updateMission = async (updateMissionRequest: UpdateMissionRequest): Promise<Mission> => {
  try {
    const response = await axios.post<Mission>("/api/v1/missions/updateMission", updateMissionRequest, {
      headers: {
        'api-key': API_KEY
      }
    });
    console.log("Mission updated successfully:", response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error updating mission:", error.response?.data);
      throw new Error(`Error updating mission: ${error.response?.data.message || "Unknown error"}`);
    } else {
      console.error("Unknown error occurred:", error);
      throw new Error("An unexpected error occurred while updating the mission");
    }
  }
};



export const deleteMission = async (deleteMissionRequest: deleteMissionRequest): Promise<void> => {
  try {
    await axios.delete(`/api/v1/missions/deleteMission`, {
      headers: {
        'api-key': API_KEY
      },
      data: deleteMissionRequest 
    });
    console.log("Mission deleted successfully");
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error deleting mission:", error.response?.data);
      throw new Error(`Error deleting mission: ${error.response?.data.message || "Unknown error"}`);
    } else {
      console.error("Unknown error occurred:", error);
      throw new Error("An unexpected error occurred while deleting the mission");
    }
  }
};