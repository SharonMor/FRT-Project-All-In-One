import React, { useState, useEffect, useRef } from "react";
import CreateMissionModal from "./CreateMissionModal";
import EditMissionModal from "./EditMissionModal";
import { createMission, getUserMissions, updateMission, deleteMission, CreateMissionRequest, UpdateMissionRequest, Mission } from "../../api/missions";
import "./MissionManager.css";
import { User } from "../../auth/Authenticator";
import { Calendar, ClipboardList, RefreshCw, X } from "lucide-react";
import { formatTimestamp } from "../../utils/utils";
import { useLanguage } from '../../LanguageContext'; // Import useLanguage hook

interface MissionManagerProps {
  teamId: string;
  userId: string;
  memberDetails: User[];
}

const MissionManager: React.FC<MissionManagerProps> = ({ teamId, userId, memberDetails }) => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [filteredMissions, setFilteredMissions] = useState<Mission[]>([]);
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentMission, setCurrentMission] = useState<Mission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [missionToDelete, setMissionToDelete] = useState<Mission | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { t } = useLanguage(); // Use the language hook

  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL;
    if (wsUrl) {
      ws.current = new WebSocket(`${wsUrl}?teamId=${teamId}`);
      ws.current.onopen = () => console.log('WebSocket connected in MissionManager');
      ws.current.onclose = () => console.log('WebSocket disconnected in MissionManager');
    }

    fetchMissions();
  }, [teamId]);

  useEffect(() => {
    filterMissions();
  }, [missions, statusFilter]);

  const fetchMissions = async () => {
    setIsLoading(true);

    try {
      const fetchedMissions = await getUserMissions(teamId);
      setMissions(fetchedMissions);
    } catch (error) {
      console.error("Failed to fetch missions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterMissions = () => {
    if (statusFilter === null) {
      setFilteredMissions(missions);
    } else {
      setFilteredMissions(missions.filter(mission => mission.mission_status === statusFilter));
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMissions();
    setIsRefreshing(false);
  };


  const addMission = async (mission: {
    name: string;
    description: string;
    is_attendance?: boolean;
    publish_to_telegram: boolean;
  }) => {
    const createMissionRequest: CreateMissionRequest = {
      creator_id: userId,
      team_id: teamId,
      name: mission.name,
      description: mission.description,
      is_attendance: mission.is_attendance ?? false,
      publish_to_telegram: mission.publish_to_telegram,
    };

    try {
      const response = await createMission(createMissionRequest);
      setMissions(prevMissions => [...prevMissions, response]);

    } catch (error) {
      console.error("Failed to create mission:", error);
    }

    setIsCreateModalOpen(false);
  };

  const editMission = (mission: Mission) => {
    setCurrentMission(mission);
    setIsEditModalOpen(true);
  };

  const saveMission = async (mission: Mission) => {
    const updateMissionRequest: UpdateMissionRequest = {
      mission_id: mission._id,
      name: mission.name,
      description: mission.description,
      mission_status: mission.mission_status,
      mark_id: mission.mark_id,
      deadline: mission.deadline,
      assigned_id: mission.assigned_id,
      sender_id: userId,
      publish_to_telegram: mission.publish_to_telegram,
    };

    try {
      const response = await updateMission(updateMissionRequest);
      setMissions(prevMissions => prevMissions.map(m => m._id === response._id ? response : m));


    } catch (error) {
      console.error("Failed to update mission:", error);
    }

    setIsEditModalOpen(false);
    setCurrentMission(null);
  };

  const handleDeleteMission = (mission: Mission) => {
    setMissionToDelete(mission);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteMission = async () => {
    if (missionToDelete) {
      try {
        await deleteMission({ mission_id: missionToDelete._id, name: missionToDelete.name, sender_id: userId });
        setMissions(prevMissions => prevMissions.filter(m => m._id !== missionToDelete._id));
      } catch (error) {
        console.error("Failed to delete mission:", error);
      } finally {
        setMissionToDelete(null);
        setShowDeleteConfirmation(false);
      }
    }
  };

  const cancelDeleteMission = () => {
    setMissionToDelete(null);
    setShowDeleteConfirmation(false);
  };


  const updateMissionStatus = async (mission: Mission, newStatus: number) => {
    const updatedMission = { ...mission, mission_status: newStatus };
    await saveMission(updatedMission);
  };

  const SkeletonLoader = () => (
    <>
      {[...Array(5)].map((_, index) => (
        <li key={index} className="mission-card skeleton">
          <div className="mission-card-content">
            <div className="mission-name">
              <div className="status-dot skeleton-dot"></div>
              <div className="skeleton-text"></div>
            </div>
            <div className="skeleton-text"></div>
          </div>
          <div className="mission-controls">
            <div className="skeleton-select"></div>
            <div className="skeleton-button"></div>
          </div>
        </li>
      ))}
    </>
  );

  const NoMissions = () => (
    <div className="no-missions">
      <ClipboardList size={48} />
      <h3>{t['no-missions-found']}</h3>
      <p>
        {statusFilter === null
          ? t['no-missions-yet']
          : t['no-missions-match-filter']}
      </p>
    </div>
  );

  return (
    <div className="mission-manager" >
      <div className="mission-manager__header">
        <h2>{t['missions']}</h2>
        <div className='mission-menu-buttons'>
          <button
            className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={20} />
            {isRefreshing ? t['refreshing'] : t['refresh']}
          </button>
          <div className="mission-filter">
            <select
              value={statusFilter === null ? "" : statusFilter}
              onChange={(e) => setStatusFilter(e.target.value === "" ? null : Number(e.target.value))}
            >
              <option value="">{t['all-statuses']}</option>
              <option value={1}>{t['open']}</option>
              <option value={2}>{t['active']}</option>
              <option value={3}>{t['completed']}</option>
              <option value={4}>{t['resolved']}</option>
              <option value={5}>{t['cancelled']}</option>
            </select>
          </div>

        </div>
      </div>
      <div className="mission-list-container">
        {isLoading ? (
          <SkeletonLoader />
        ) : filteredMissions.length > 0 ? (
          <ul className="mission-list">
            {filteredMissions.map((mission) => (
              <li key={mission._id} className={`mission-card ${mission.is_attendance ? 'attendance-mission' : ''}`}>
                <div onClick={() => editMission(mission)} className="mission-card-content">
                  <div className="mission-name">
                    <div className={`status-dot status-${mission.mission_status}`}></div>
                    <strong>{mission.name}</strong>
                    {mission.is_attendance && <Calendar size={16} className="attendance-icon" />}
                  </div>
                  <div className="mission-timestamp">{formatTimestamp(mission.created_at)}</div>
                  <p className="mission-description">{mission.description}</p>
                </div>
                <div className="mission-controls" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={mission.mission_status}
                    onChange={(e) => updateMissionStatus(mission, Number(e.target.value))}
                  >
                    <option value={1}>{t['open']}</option>
                    <option value={2}>{t['active']}</option>
                    <option value={3}>{t['completed']}</option>
                    <option value={4}>{t['resolved']}</option>
                    <option value={5}>{t['cancelled']}</option>
                  </select>
                  <button className="delete-mission-btn" onClick={() => handleDeleteMission(mission)}>{t['delete']}</button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <NoMissions />
        )}
      </div>
      <button className="add-mission-btn" onClick={() => setIsCreateModalOpen(true)}>+</button>
      <CreateMissionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={addMission}
      />
      {currentMission && (
        <EditMissionModal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setCurrentMission(null); }}
          onSave={saveMission}
          mission={currentMission}
          teamId={teamId}
          memberDetails={memberDetails}
        />
      )}
      {showDeleteConfirmation && (
        <div className="delete-confirmation-overlay">
          <div className="delete-confirmation-dialog">
            <button className="close-btn" onClick={cancelDeleteMission}>
              <X size={24} />
            </button>
            <h3>{t['delete-mission']}</h3>
            <p>{t['delete-mission-confirmation'].replace('{missionName}', missionToDelete?.name || '')}</p>
            <div className="delete-confirmation-actions">
              <button className="cancel-btn" onClick={cancelDeleteMission}>{t['cancel']}</button>
              <button className="confirm-btn" onClick={confirmDeleteMission}>{t['delete']}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionManager;