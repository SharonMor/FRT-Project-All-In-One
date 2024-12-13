import { User } from "../auth/Authenticator";

export type teamMember = {
    _id: string;
    team_ids: string[]
  };
  
  // Define and export the Permission type
  export type Permission = {
    set_permissions: boolean;
    add_member: boolean;
    update_team: boolean;
  };
  
  export type PermissionsMap = {
    [userId: string]: Permission;
  };
  
  // Define and export the TeamResponse type to represent the whole response
  export type getTeamResponse = {
    _id: string;
    team_name: string;
    team_owner: teamMember;
    members: teamMember[];
    permissions: PermissionsMap;
  };
  
  export interface TeamPermissions {
    set_permissions: boolean;
    add_member: boolean;
    update_team: boolean;
  }
  
  export interface Team {
    _id: string;
    team_name: string;
    team_owner: teamMember;
    members: User[];
    permissions: { [key: string]: TeamPermissions };
  } 