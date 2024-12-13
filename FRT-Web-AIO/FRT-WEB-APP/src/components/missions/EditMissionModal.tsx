import React, { useState, useEffect, useCallback, useMemo } from "react";
import Modal from "react-modal";
import { Mission } from "../../api/missions";
import "./MissionModal.css";
import "./EditMissionModal.css";
import { getCallbackQueryResults, GetCallbackQueryResultsResponse } from "../../api/chats";
import { User } from "../../auth/Authenticator";
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { RefreshCw, Search, X } from 'lucide-react';
import ClipLoader from "react-spinners/ClipLoader";
import { formatTimestamp } from "../../utils/utils";
import { useLanguage } from '../../LanguageContext'; // Import useLanguage hook

interface EditMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mission: Mission) => void;
  mission: Mission;
  teamId: string;
  memberDetails: User[];
}

interface EditFormProps {
  mission: Mission;
  onSave: (mission: Mission) => void;
  isLoading: boolean;
}

const EditForm: React.FC<EditFormProps> = React.memo(({ mission, onSave, isLoading }) => {
  const [name, setName] = useState(mission.name);
  const [description, setDescription] = useState(mission.description);
  const [status, setStatus] = useState<number>(mission.mission_status);
  const [publishToTelegram, setPublishToTelegram] = useState(mission.publish_to_telegram || false);
  const { t, isRTL } = useLanguage(); // Use the language hook

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedMission: Mission = {
      ...mission,
      name,
      description,
      mission_status: status,
      publish_to_telegram: publishToTelegram,
      updated_at: Date.now(),
    };
    onSave(updatedMission);
  };

  return (
    <form onSubmit={handleSubmit} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <div>
      <label htmlFor="name">{t['name']}</label>
      <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
      <label htmlFor="description">{t['description']}</label>
      <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        ></textarea>
      </div>
      <div>
      <label htmlFor="status">{t['status']}</label>
      <select
          id="status"
          value={status}
          onChange={(e) => setStatus(Number(e.target.value))}
        >
          <option value={1}>{t['open']}</option>
          <option value={2}>{t['active']}</option>
          <option value={3}>{t['completed']}</option>
          <option value={4}>{t['resolved']}</option>
          <option value={5}>{t['cancelled']}</option>
        </select>
      </div>
      <div className="checkbox-group">
        <label className="checkbox-container">
        {t['publish-change-to-telegram']}
        <input
            type="checkbox"
            checked={publishToTelegram}
            onChange={(e) => setPublishToTelegram(e.target.checked)}
          />
          <span className="checkmark"></span>
        </label>
      </div>
      <button type="submit" disabled={isLoading}>
      {isLoading ? t['saving'] : t['save']}
      </button>
    </form>
  );
});

const EditMissionModal: React.FC<EditMissionModalProps> = ({ isOpen, onClose, onSave, mission, teamId, memberDetails }) => {
  const [isAttendanceView, setIsAttendanceView] = useState(false);
  const [attendanceData, setAttendanceData] = useState<GetCallbackQueryResultsResponse>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { t, isRTL } = useLanguage(); // Use the language hook



  const fetchAttendanceData = async () => {
    setIsLoading(true);
    try {
      const result = await getCallbackQueryResults(teamId, mission._id);
      setAttendanceData(result);
      setIsAttendanceView(mission.is_attendance);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterBySearchTerm = useCallback((item: { user_id: string }) => {
    const member = memberDetails.find(m => m._id === item.user_id);
    const memberName = member ? (member.displayName || member.username || "") : "";
    const memberEmail = member?.email || "";
    return memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           memberEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
           item.user_id.toLowerCase().includes(searchTerm.toLowerCase());
  }, [searchTerm, memberDetails]);

  const renderAttendanceBadges = (responses: typeof latestResponses, title: string, badgeColor: string) => {
    const filteredResponses = responses.filter(filterBySearchTerm);
    const totalMembers = memberDetails.length;

    return (
      <div className="attendance-section">
        <h3>{t[title]} ({filteredResponses.length}/{totalMembers-1})</h3>
        <div className="badge-container">
          {filteredResponses.map(response => {
            const member = memberDetails.find(m => m._id === response.user_id);
            return member ? renderUserBadge(member, badgeColor) : null;
          })}
        </div>
      </div>
    );
  };

  const renderNoResponseBadges = () => {
    const filteredNoResponses = noResponses.filter(member => {
      const memberName = member.displayName || member.username || "";
      const memberEmail = member.email || "";
      const searchLower = searchTerm.toLowerCase();
      
      return memberName.toLowerCase().includes(searchLower) ||
             memberEmail.toLowerCase().includes(searchLower);
    });

    const totalMembers = memberDetails.length;


    return (
      <div className="attendance-section">
        <h3>{t['no-response']} ({filteredNoResponses.length}/{totalMembers-1})</h3>
        <div className="badge-container">
          {filteredNoResponses.map(member => renderUserBadge(member, "no-response"))}
        </div>
      </div>
    );
  };

  const handleRefresh = () => {
    fetchAttendanceData();
  };

  useEffect(() => {
    if (mission.is_attendance) {
      fetchAttendanceData();
    }
  }, [teamId, mission._id]);


  const handleSave = (editedMission: Mission) => {
    setIsLoading(true);
    const updatedMission: Mission = {
      ...mission,
      name:editedMission.name,
      description:editedMission.description,
      mission_status: editedMission.mission_status,
      mark_id: mission.mark_id,
      deadline:mission.deadline,
      updated_at: Date.now(),
      publish_to_telegram: editedMission.publish_to_telegram,
    };
    onSave(updatedMission);
    setIsLoading(false);
  };

  const renderUserBadge = (user: User, badgeColor: string) => (
    <span
      key={user._id}
      className={`badge ${badgeColor} clickable`}
      onClick={() => setSelectedUser(user)}
    >
      {user.displayName || user.username || user.email}
    </span>
  );

  const getLatestResponses = () => {
    const userResponses = new Map();    
    
    attendanceData.forEach(response => {
      const userId = response.user_id;
      if (userId !== mission.creator_id && 
          (!userResponses.has(userId) || userResponses.get(userId).timestamp < response.timestamp)) {
            console.log('mission.creator_id',mission.creator_id);
            console.log('userId',userId);
            
        userResponses.set(userId, response);
      }
    });
    
    return Array.from(userResponses.values());
};

  const latestResponses = getLatestResponses();
  const okResponses = latestResponses.filter(r => r.message.data === 'ok');
  const sosResponses = latestResponses.filter(r => r.message.data === 'sos');
  const noResponses = memberDetails.filter(member =>
    member._id !== mission.creator_id && 
    !latestResponses.some(r => r.user_id === member._id)
);

  const renderLogs = () => {
    const filteredLogs = attendanceData.filter(filterBySearchTerm);

    return (
      <div className="logs-section">
        <h3>Logs {searchTerm && `(filtered by: ${searchTerm})`}</h3>
        <div className="logs-container">
          <ul className="logs-list">
            {filteredLogs.map((response, index) => {
              const user = memberDetails.find(m => m._id === response.user_id);
              const date = new Date(response.timestamp).toLocaleString();
              return (
                <li key={index}>
                  {user?.displayName || user?.username || response.user_id} clicked '{response.message.data}' - {date}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  };


  const renderLoading = () => (
    <div className="loading-container">
      <ClipLoader color="#2196F3" loading={isLoading} size={50} />
    </div>
  );

  const MemoizedAttendanceContent = useMemo(() => {
    return {
      attendanceTab: (
        <>
          {renderAttendanceBadges(okResponses, "responded-ok", "ok")}
          {renderAttendanceBadges(sosResponses, "requested-help", "sos")}
          {renderNoResponseBadges()}
        </>
      ),
      logsTab: renderLogs()
    };
  }, [okResponses, sosResponses, noResponses, attendanceData, searchTerm, memberDetails]);

  const renderUserPopover = () => {
    if (!selectedUser) return null;

    return (
      <div className="user-popover">
        <button className="close-popover" onClick={() => setSelectedUser(null)}>
          <X size={16} />
        </button>
        <h4>{selectedUser.displayName || selectedUser.username}</h4>
        <p>{selectedUser.email}</p>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} contentLabel="Edit Mission Modal" className="modal" overlayClassName="overlay">
      <div className="mission-modal" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <div className="button-group" style={{direction: 'ltr'}}>
        <button className="refresh-button" onClick={handleRefresh} title={t['refresh-attendance-data']}>
        <RefreshCw size={20} />
          </button>
          {attendanceData.length > 0 && (
            <button
              onClick={() => setIsAttendanceView(!isAttendanceView)}
              className="switch-view-button"
            >
              {isAttendanceView ? t['edit'] : t['attendance']}
              </button>
          )}
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <h2>{isAttendanceView ? t['attendance'] : t['edit-mission']}</h2>
        {isLoading ? renderLoading() : (
          isAttendanceView ? (
            <>
              <div className="search-container">
                <Search size={20} />
                <input
                  type="text"
                  placeholder={t['search-by-name-or-email']}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <p className="mission-info">{t['mission-created-at']} {formatTimestamp(mission.created_at)}</p>
              <p className="mission-info attendance-note">{t['attendance-note']}</p>
              <Tabs selectedIndex={activeTab} onSelect={index => setActiveTab(index)}>
                <TabList>
                <Tab>{t['attendance']}</Tab>
                <Tab>{t['logs']}</Tab>
                </TabList>
                <TabPanel>{MemoizedAttendanceContent.attendanceTab}</TabPanel>
                <TabPanel>{MemoizedAttendanceContent.logsTab}</TabPanel>
              </Tabs>  
              {renderUserPopover()}

                        </>
          ) : (
            <EditForm mission={mission} onSave={handleSave} isLoading={isLoading} />
          )
        )}
      </div>
    </Modal>
  );
};

export default React.memo(EditMissionModal);
