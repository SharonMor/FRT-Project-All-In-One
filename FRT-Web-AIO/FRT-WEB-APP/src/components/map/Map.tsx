import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, LoadScriptNext } from '@react-google-maps/api';
import CustomMarker from './customMarker/CustomMarker';
import MarkerModal from './markerModal/MarkerModal';
import {  getOrCreateMap, handleMapChange, Marker, Location, Size } from '../../api/maps';
// import dotenv from 'dotenv'
import { IconKey } from './customMarker/CustomMarker';
import { User } from '../../auth/Authenticator';
import { useLanguage } from '../../LanguageContext';

// dotenv.config()
const getContainerStyle = (): React.CSSProperties => ({
  width: '100%',
  height: '90vh',
  margin: '20px 0 0 0',
  // minHeight: '800px',
  maxHeight: '100%',
});

const getMapStyles = (config: { showPOI: boolean }): google.maps.MapTypeStyle[] => [
  {
    featureType: 'poi',
    stylers: [{ visibility: config.showPOI ? 'on' : 'off' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
];


const ContextMenu: React.FC<{ x: number, y: number, onSetInitialLocation: () => void, onClose: () => void }> = ({ x, y, onSetInitialLocation, onClose }) => {
  const handleRightClick = (event: React.MouseEvent) => {
    event.preventDefault(); // Prevent the default context menu
  };
  const { t } = useLanguage();  // Use the translation context


  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 1,
        backgroundColor: 'white',
        border: '1px solid black',
        borderRadius: '5px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        transform: 'translate(-190%, -130%)',
        width: '200px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
      onContextMenu={handleRightClick} // Attach the event handler to prevent default right-click behavior
    >
      <ul style={{ listStyleType: 'none', margin: 0, padding: '8px' }}>
        <li
          style={{
            cursor: 'pointer',
            padding: '5px 10px',
            borderBottom: '1px solid #ccc',
            marginBottom: '2px',
            transition: 'background-color 0.3s',
          }}
          onClick={onSetInitialLocation}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'white')}
        >
          {t["set-initial-location"]}
        </li>
        <li
          style={{
            cursor: 'pointer',
            padding: '5px 10px',
            transition: 'background-color 0.3s',
          }}
          onClick={onClose}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'white')}
        >
          {t["close"]}
        </li>
      </ul>
    </div>
  );
};

const MapComponent: React.FC<{ teamId: string, userId: string, findUserById: (id: string) => User | undefined  }> = ({ teamId, userId, findUserById }) => {
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [markerModalVisible, setMarkerModalVisible] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [editingMarkerIndex, setEditingMarkerIndex] = useState<number | null>(null);
  const [showPOI, setShowPOI] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showTitles, setShowTitles] = useState(false);
  const [defaultLocation, setDefaultLocation] = useState<google.maps.LatLngLiteral>({ lat: 32.87022137218026, lng: 35.69805662416262 });
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, latLng: google.maps.LatLngLiteral } | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_JS_API_KEY;
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useLanguage();  // Use the translation context    
  
  const isOnTeamsPage = useCallback(() => {
    return window.location.pathname === "/teams";
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!isOnTeamsPage()) return;
    
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL;
    if (wsUrl) {
      ws.current = new WebSocket(`${wsUrl}?teamId=${teamId}`);
      
      ws.current.onopen = () => {
        console.log('WebSocket connected in Map');
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
      
      ws.current.onmessage = (event) => {
        const parsedData = JSON.parse(event.data);
        if (parsedData.type !== 'mark') return;
        
        const newMarker: Marker = parsedData;
        setMarkers(prev => {
          const index = prev.findIndex(m => m.message_id === newMarker.message_id);
          if (index !== -1) {
            return newMarker.active
              ? prev.map((m, i) => i === index ? newMarker : m)
              : prev.filter(m => m.message_id !== newMarker.message_id);
          } else {
            return [...prev, newMarker];
          }
        });
      };
      
      ws.current.onclose = () => {
        console.log('WebSocket disconnected in Map');
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 6000);
      };
    } else {
      console.log('WebSocket URL is not defined. No connection will be made.');
    }
  }, [teamId, isOnTeamsPage]);

  const cleanup = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    initializeMap();
    connectWebSocket();

    return cleanup;
  }, [connectWebSocket, cleanup]);

  const getUserDisplayName = (id: string): string => {
    const user = findUserById(id);
    return (user && user.displayName) ? user.displayName : id;
  };

  const generateUniqueId = () => {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };
  const initializeMap = async () => {
    try {
      const mapData = await getOrCreateMap(teamId);
      console.log('mapdata', mapData);
      
      setDefaultLocation({
        lat: mapData?.initial_location.latitude || defaultLocation.lat,
        lng: mapData?.initial_location.longitude || defaultLocation.lng
      });
  
      const markers = mapData?.active_marks || [];
  
      // Remove duplicates based on messageId
      const uniqueMarkers = markers.reduce<Marker[]>((acc, current) => {
        const x = acc.find(item => item.message_id === current.message_id);
        if (!x) {
          return [...acc, current];
        } else {
          return acc;
        }
      }, []);
  
      setMarkers(uniqueMarkers);

    } catch (error) {
      console.error("Error initializing map:", error);
    }
  };


  const sendMarkerToWS = (marker: Marker): void => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'mark',
        user_id: userId,
        mark_type: marker.mark_type,
        map_id: teamId,
        message_id: marker.message_id,
        timestamp: new Date().getTime(),
        description: marker.description,
        active: true,
        location: {
          longitude: marker.location.longitude,
          latitude: marker.location.latitude
        },
        size: marker.size,
        title: marker.title,
        publishToTelegram: marker.publish_to_telegram,
      };
      ws.current.send(JSON.stringify(message));
    }
  };

  const handleMapRightClick = (event: google.maps.MapMouseEvent) => {
    event.domEvent.preventDefault();
    const mouseEvent = event.domEvent as MouseEvent;

    closeModalAndContextMenu(); // Close any open modals or context menus

    if (event.latLng) {
      setContextMenu({
        visible: true,
        x: mouseEvent.pageX,
        y: mouseEvent.pageY,
        latLng: { lat: event.latLng.lat(), lng: event.latLng.lng() },
      });
      // setTemporaryMarker({ lat: event.latLng.lat(), lng: event.latLng.lng() });
    }
  };

  const handleSetInitialLocation = async () => {
    if (contextMenu?.latLng) {
      setDefaultLocation(contextMenu.latLng);
      try {
        await handleMapChange(teamId, 15, {
          lat: contextMenu.latLng.lat,
          lng: contextMenu.latLng.lng
        });
        console.log("Map updated successfully");
      } catch (error) {
        console.error("Error updating map:", error);
        // Handle the error appropriately
      } finally {
        setContextMenu(null);
        // setTemporaryMarker(null);
      }
    }
  };

  const closeModalAndContextMenu = () => {
    setMarkerModalVisible(false);
    setContextMenu(null);
    // setTemporaryMarker(null);
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
    // setTemporaryMarker(null);
  };

  useEffect(() => {
    console.log(`Fetching data for team ID: ${teamId}`);
  }, [teamId]);

  const togglePOI = (): void => setShowPOI(!showPOI);

  const toggleMarkers = (): void => setShowMarkers(!showMarkers);

  const toggleTitles = (): void => setShowTitles(!showTitles);

  const recenterMap = (): void => {
    if (mapInstance) {
      mapInstance.setCenter(defaultLocation);
      mapInstance.setZoom(15);
    }
  };

  const handleMapClick = (event: google.maps.MapMouseEvent): void => {
    closeModalAndContextMenu(); // Close any open modals or context menus
    if (!event.latLng) return;
    setCurrentPosition({ lat: event.latLng.lat(), lng: event.latLng.lng() });
    setMarkerModalVisible(true);
    setEditingMarkerIndex(null);
  };

  const handleMarkerClick = (index: number): void => {
    const marker = markers[index];
    const googlePoistion : google.maps.LatLngLiteral = {
      lat: marker.location.latitude,
      lng: marker.location.longitude
    }
    setCurrentPosition(googlePoistion);
    setMarkerModalVisible(true);
    setEditingMarkerIndex(index);
  };

  const handleDeleteMarker = (): void => {
    if (editingMarkerIndex !== null) {
      const markerToDelete = markers[editingMarkerIndex];
      
      const deleteMessage = {
        type: 'mark',
        user_id: userId,
        mark_type: markerToDelete.mark_type,
        map_id: teamId,
        message_id: markerToDelete.message_id,
        timestamp: new Date().getTime(),
        description: markerToDelete.description,
        active: false,  // Set to false for deletion
        location: {
          longitude: markerToDelete.location.longitude,
          latitude: markerToDelete.location.latitude
        },
        size: markerToDelete.size,
        title: markerToDelete.title,
        publishToTelegram:false,
      };
      
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(deleteMessage));
      }
  
  
      setMarkerModalVisible(false);
      setCurrentPosition(null);
      setEditingMarkerIndex(null);
    }
  };


  const handleSaveMarker = (title: string, description: string, icon: IconKey | null, iconSize: Size, publish_to_telegram: boolean): void => {
    if (currentPosition) {
      const isEditing = editingMarkerIndex !== null;
      let message_id: string;
      let handlingUserId: string;
      // let lastModified: Date;
  
      if (isEditing && editingMarkerIndex !== null) {
        const existingMarker = markers[editingMarkerIndex];
        message_id = existingMarker.message_id;
        handlingUserId = existingMarker.user_id; // Preserve the original creator
        // lastModified = new Date(); // Update the last modified date
      } else {
        message_id = generateUniqueId();
        handlingUserId = userId; // New marker, set current user as creator
        // lastModified = new Date();
      }
      const location : Location = {
        latitude:currentPosition.lat,
        longitude:currentPosition.lng,
      }
      const newMarker: Marker = {
        mapId:teamId,
        publish_to_telegram,
        location,
        title,
        description,
        mark_type:icon || 0,
        size:iconSize,
        message_id,
        user_id: handlingUserId,
        timestamp:Number(new Date()),
        active:true,
      };
  
      
      sendMarkerToWS(newMarker);
  
      
      setMarkerModalVisible(false);
      setCurrentPosition(null);
      setEditingMarkerIndex(null);
    }
  };

  if (!apiKey) {
    return <div>Error: Google Maps API key is not set.</div>;
  }

  return (
    <LoadScriptNext googleMapsApiKey={apiKey} language="iw">
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <button onClick={togglePOI} style={{ position: 'absolute', top: '60px', right: '10px', zIndex: 1 }}>
          {showPOI ? t['hide-poi'] : t['show-poi']}
        </button>
        <button onClick={recenterMap} style={{ position: 'absolute', top: '110px', right: '10px', zIndex: 1 }}>
          {t['recenter-map']}
        </button>
        <button onClick={toggleMarkers} style={{ position: 'absolute', top: '160px', right: '10px', zIndex: 1 }}>
          {showMarkers ? t['hide-markers'] : t['show-markers']}
        </button>
        {showMarkers && <button onClick={toggleTitles} style={{ position: 'absolute', top: '210px', right: '10px', zIndex: 1 }}>
          {showTitles ? t['hide-titles'] : t['show-titles']}
        </button>}
        <GoogleMap
          mapContainerStyle={getContainerStyle()}
          center={defaultLocation}
          zoom={15}
          mapTypeId="roadmap"
          options={{ styles: getMapStyles({ showPOI }), mapTypeControl: false, streetViewControl: false }}
          onLoad={setMapInstance}
          onClick={handleMapClick}
          onRightClick={handleMapRightClick}
          clickableIcons={false}
        >
          {showMarkers &&
            markers.map((marker, index) => (
              <CustomMarker
                key={index}
                marker={marker}

                showTitle={showTitles}
                onClick={() => handleMarkerClick(index)}
                getUserDisplayName={getUserDisplayName}
              />
            ))}
        </GoogleMap>
        <MarkerModal
          visible={markerModalVisible}
          onClose={() => setMarkerModalVisible(false)}
          onSave={handleSaveMarker}
          onDelete={handleDeleteMarker}
          initialTitle={editingMarkerIndex !== null ? markers[editingMarkerIndex].title : ''}
          initialDescription={editingMarkerIndex !== null ? markers[editingMarkerIndex].description : ''}
          initialIcon={editingMarkerIndex !== null ? markers[editingMarkerIndex].mark_type : null}
          initialIconSize={editingMarkerIndex !== null ? markers[editingMarkerIndex].size : 2}
          initialCreatedBy={editingMarkerIndex !== null ? getUserDisplayName(markers[editingMarkerIndex].user_id) : getUserDisplayName(userId)}
          getUserDisplayName={getUserDisplayName}
          isEdit={editingMarkerIndex !== null}
        />
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onSetInitialLocation={handleSetInitialLocation}
            onClose={handleContextMenuClose}
          />
        )}
      </div>
    </LoadScriptNext>
  );
};

export default MapComponent;
