import axios from "axios";
import { Team } from "../types/teams";
import { addTeamToUser } from "./users";
export type Permission = {
    set_permissions: boolean;
    add_member: boolean;
    update_team: boolean;
  };
  
  export type PermissionsMap = {
    [userId: string]: Permission;
  };
  
 
  export const getTeam = async (teamId: string): Promise<Team> => {
    const response = await axios.get<Team>(`/api/v1/teams/getTeam/${teamId}`, {
        headers: {
            'api-key': 'badihi'  // Consider managing API keys securely
        }
    });
    console.log("Got team request, this is the response:", response);
    return response.data;
};

export type CreateTeamRequest = {
    user_id: string;
    team_name: string;
  };
  
  export type CreateTeamResponse = {
    message: string;
    team_id: string;
  };
  
export const createTeam = async (userId: string, teamName: string): Promise<CreateTeamResponse> => {
    try {
      const response = await axios.post<CreateTeamResponse>("/api/v1/teams/createTeam", {
        user_id: userId,
        team_name: teamName
      }, {
        headers: {
          'api-key': 'badihi'
        }
      });
      console.log("Team created successfully:", response.data);
      return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            console.error("Error creating team:", error.response?.data);
            throw new Error(`Error creating team: ${error.response?.data.message || "Unknown error"}`);
        } else {
            console.error("Unknown error occurred:", error);
            throw new Error("An unexpected error occurred");
        }
    }
  };

export const inviteUserToTeam = async (userId: string, teamId: string, newMemberId: string): Promise<void> => {
  try {
      const response = await axios.post(`/api/v1/teams/addMember/${teamId}`, {
          user_id: userId,
          new_member_id: newMemberId
      }, {
          headers: {
              'api-key': 'badihi'
          }
      });
      try {
        await addTeamToUser(newMemberId, teamId);
        console.log('Team added to user successfully');
      } catch (error) {
        console.error('Failed to add team to user:', error);
      }
      console.log("User invited successfully:", response.data);
  } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
          console.error("Error inviting user:", error.response?.data);
          throw new Error(`Error inviting user: ${error.response?.data.message || "Unknown error"}`);
      } else {
          console.error("Unknown error occurred during user invitation:", error);
          throw new Error("An unexpected error occurred during user invitation");
      }
  }
};

  // Define a type for the request and response
export type GetTeamsRequest = {
    teamIds: string[];
};

export type GetTeamsResponse = Team[];  // Array of Teams

/**
 * Fetches multiple teams based on an array of team IDs.
 * @param teamIds Array of team IDs.
 * @returns Promise that resolves to an array of Team objects.
 */
export const getTeams = async (teamIds: string[] = []): Promise<Team[]> => {
    try {
        const response = await axios.post<GetTeamsResponse>("/api/v1/teams/getTeams", {
            team_ids: teamIds
        }, {
            headers: {
                'api-key': 'badihi'  // Ensure secure handling of API keys
            }
        });
        console.log("Teams fetched successfully:", response.data);
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            console.error("Error fetching teams:", error.response?.data);
            throw new Error(`Error fetching teams: ${error.response?.data.message || "Unknown error"}`);
        } else {
            console.error("Unknown error occurred during fetching teams:", error);
            throw new Error("An unexpected error occurred during fetching teams");
        }
    }
};

export const leaveTeam = async (userId: string, teamId: string): Promise<string> => {
  try {
      const response = await axios.post<{ message: string }>("/api/v1/teams/leaveTeam", {
          user_id: userId,
          team_id: teamId
      }, {
          headers: {
              'api-key': 'badihi'
          }
      });
      console.log("User left team successfully:", response.data);
      return response.data.message;
  } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
          console.error("Error leaving team:", error.response?.data);
          if (error.response?.status === 403) {
              throw new Error("OWNER_LEAVING");
          }
          throw new Error(`Error leaving team: ${error.response?.data.detail || "Unknown error"}`);
      } else {
          console.error("Unknown error occurred while leaving team:", error);
          throw new Error("An unexpected error occurred while leaving team");
      }
  }
};

export const deleteTeam = async (userId: string, teamId: string): Promise<string> => {
  try {
      const response = await axios.post<{ message: string }>(`/api/v1/teams/deleteMember/${teamId}`, {
          user_id: userId,
          delete_member_id: userId  // The owner is deleting themselves, which deletes the team
      }, {
          headers: {
              'api-key': 'badihi'
          }
      });
      console.log("Team deleted successfully:", response.data);
      return response.data.message;
  } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
          console.error("Error deleting team:", error.response?.data);
          throw new Error(`Error deleting team: ${error.response?.data.detail || "Unknown error"}`);
      } else {
          console.error("Unknown error occurred while deleting team:", error);
          throw new Error("An unexpected error occurred while deleting team");
      }
  }
};

// New function to delete a member from a team
export const deleteMember = async (userId: string, teamId: string, deleteMemberId: string): Promise<string> => {
    try {
        const response = await axios.post<{ message: string }>(`/api/v1/teams/deleteMember/${teamId}`, {
            user_id: userId,
            delete_member_id: deleteMemberId
        }, {
            headers: {
                'api-key': 'badihi'
            }
        });
        console.log("Member deleted successfully:", response.data);
        return response.data.message;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            console.error("Error deleting member:", error.response?.data);
            throw new Error(`Error deleting member: ${error.response?.data.detail || "Unknown error"}`);
        } else {
            console.error("Unknown error occurred while deleting member:", error);
            throw new Error("An unexpected error occurred while deleting member");
        }
    }
};