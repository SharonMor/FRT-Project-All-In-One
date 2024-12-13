import axios from "axios";

export enum MarkType {
  NONE = 0,
  BARRIER = 1,
  FIRE = 2,
  DANGER = 3,
  QUESTION = 4,
  CAR_CRASH = 5,
  ROCKET = 6,
  TELEGRAM_USER = 7,
  SOS = 8
}

export type Size = 1 | 2 | 3

export interface Location {
  longitude: number;
  latitude: number;
}


export interface Marker {
  user_id: string;
  mark_type: MarkType;
  mapId: string;
  message_id: string;
  timestamp: number;
  active: boolean;
  location: {
    "longitude": number,
    "latitude": number
}
  description: string;
  size: Size;
  title: string;
  publish_to_telegram: boolean;
}


// Define types for map-related data
export interface MapData {
  map_id: string;
  scale: number;
  initial_location: {
    latitude: number;
    longitude: number;
  };
  active_marks: Marker[],
}

export interface CreateMapRequest {
  scale: number;
  initial_location: {
    latitude: number;
    longitude: number;
  };
  map_id: string;
}

export interface UpdateMapRequest {
  scale?: number;
  initial_location?: {
    latitude: number;
    longitude: number;
  };
}

const API_KEY = 'badihi'; // Replace with your actual API key or fetch from environment variables

// Function to get a map
export const getMap = async (mapId: string): Promise<MapData> => {
  try {
    const response = await axios.get<MapData>(`/api/v1/maps/getMap/${mapId}`, {
      headers: {
        'api-key': API_KEY
      }
    });
    console.log("Map fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error fetching map:", error.response?.data);
      throw new Error(`Error fetching map: ${error.response?.data.message || "Unknown error"}`);
    } else {
      console.error("Unknown error occurred:", error);
      throw new Error("An unexpected error occurred while fetching the map");
    }
  }
};

// Function to create a map
export const createMap = async (createMapRequest: CreateMapRequest): Promise<MapData> => {
  try {
    const response = await axios.post<MapData>("/api/v1/maps/createMap", createMapRequest, {
      headers: {
        'api-key': API_KEY
      }
    });
    console.log("Map created successfully:", response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error creating map:", error.response?.data);
      throw new Error(`Error creating map: ${error.response?.data.message || "Unknown error"}`);
    } else {
      console.error("Unknown error occurred:", error);
      throw new Error("An unexpected error occurred while creating the map");
    }
  }
};

export const updateMap = async (mapId: string, updateMapRequest: UpdateMapRequest): Promise<MapData> => {
  try {
    const response = await axios.post<MapData>(`/api/v1/maps/updateMap`, 
      { 
        ...updateMapRequest, 
        map_id: mapId 
      }, 
      {
        headers: {
          'api-key': API_KEY
        }
      }
    );
    console.log("Map updated successfully:", response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error updating map:", error.response?.data);
      throw new Error(`Error updating map: ${error.response?.data.message || "Unknown error"}`);
    } else {
      console.error("Unknown error occurred:", error);
      throw new Error("An unexpected error occurred while updating the map");
    }
  }
};

// Function to get or create a map
// export const getOrCreateMap = async (teamId: string, defaultLocation: { latitude: number; longitude: number }): Promise<MapData> => {
export const getOrCreateMap = async (teamId: string): Promise<MapData | null> => {

  try {
    const mapData = await getMap(teamId);
    console.log("Existing map found:", mapData);
    return mapData;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Error fetching map")) {
      console.log("Map not found, creating a new one.");
      return null
    //   return createNewMap(teamId, defaultLocation);
    } else {
      console.error("Unexpected error:", error);
      throw error;
    }
  }
};

// Function to create a new map
export const createNewMap = async (teamId: string, defaultLocation: { latitude: number; longitude: number }): Promise<MapData> => {
  try {
    const newMapData = await createMap({
      scale: 15, // Default zoom level
      initial_location: defaultLocation,
      map_id: teamId
    });
    console.log("New map created:", newMapData);
    return newMapData;
  } catch (error) {
    console.error("Error creating new map:", error);
    throw error;
  }
};

// Function to handle map change (update)
export const handleMapChange = async (teamId: string, zoom: number, center: { lat: number; lng: number }): Promise<MapData> => {
  try {
    const updatedMapData = await updateMap(teamId, {
      scale: zoom,
      initial_location: {
        latitude: center.lat,
        longitude: center.lng
      }
    });
    console.log("Map updated:", updatedMapData);
    return updatedMapData;
  } catch (error) {
    console.error("Error updating map:", error);
    throw error;
  }
};
