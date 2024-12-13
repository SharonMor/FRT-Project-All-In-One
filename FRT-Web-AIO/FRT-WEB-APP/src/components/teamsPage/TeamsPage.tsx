import React, { useCallback, useEffect, useState } from 'react';
import { ClipLoader } from 'react-spinners';
import { RefreshCw, LogOut, X, Download } from 'lucide-react';
import './TeamsPage.css';
import { createTeam, deleteTeam, getTeams, inviteUserToTeam, leaveTeam } from '../../api/teams';
import { getUser, getUserByEmail } from '../../api/users';
import useUser from '../../hooks/useUser';
import { Team } from '../../types/teams';
import CreateTeamModal from '../createTeamModal/CreateTeamModal';
import TeamPage from '../teamPage/TeamPage';
import { getChatTimelineExcel, GetChatTimelineExcelRequest } from '../../api/chats';
import * as XLSX from 'xlsx';
import { useLanguage } from '../../LanguageContext';

const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const { user: firebaseUser } = useUser();
  const [leaveTeamConfirmation, setLeaveTeamConfirmation] = useState<{
    isOpen: boolean;
    teamId: string;
    teamName: string;
    isOwner: boolean;
  }>({ isOpen: false, teamId: '', teamName: '', isOwner: false });
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  const [selectedExportTeam, setSelectedExportTeam] = useState<Team | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const handleOpenExportModal = () => setExportModalOpen(true);
  const [isExporting, setIsExporting] = useState(false);
  const handleCloseExportModal = () => {
    setExportModalOpen(false);
    setSelectedExportTeam(null);
    setStartDate('');
    setEndDate('');
    setTeamSearchQuery('');
  };
  const { t, isRTL } = useLanguage();


  const handleExportData = async () => {
    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime();

    if (selectedExportTeam && startDate && endDate) {
      const request: GetChatTimelineExcelRequest = {
        chat_id: selectedExportTeam._id,
        start_time: startTimestamp,
        end_time: endTimestamp
      };
      setIsExporting(true);
      try {
        const excelData = await getChatTimelineExcel(request);
        console.log("Exported data:", excelData);

        // Create a new workbook and add the data
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, "Timeline Data");

        // Generate Excel file
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // Create download link and trigger download
        const fileName = `${selectedExportTeam.team_name}_${new Date(startTimestamp).toISOString().split('T')[0]}-${new Date(endTimestamp).toISOString().split('T')[0]}.xlsx`;

        // Create a URL for the blob
        const url = window.URL.createObjectURL(data);

        // Create a link element
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;

        // Append the link to the body
        document.body.appendChild(link);

        // Programmatically click the link to trigger the download
        link.click();

        // Clean up by removing the link and revoking the blob URL
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        handleCloseExportModal();
      } catch (error) {
        console.error("Failed to export data:", error);
        alert('Failed to export data');
      } finally {
        setIsExporting(false);
      }
    }
  };

  const filteredTeams = teams.filter(team =>
    team.team_name.toLowerCase().includes(teamSearchQuery.toLowerCase())
  );

  const fetchUserAndTeams = useCallback(async () => {
    setLoading(true);
    if (firebaseUser) {
      try {
        const userDetails = await getUser(firebaseUser.uid);
        const teamsData = await getTeams(userDetails.team_ids || []);
        setTeams(teamsData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    fetchUserAndTeams();
  }, [fetchUserAndTeams]);

  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => setModalOpen(false);

  const handleCreateTeam = async (teamName: string) => {
    if (firebaseUser && teamName) {
      await createTeam(firebaseUser.uid, teamName);
      fetchUserAndTeams();
    }
  };

  const handleRefresh = () => {
    fetchUserAndTeams();
  };

  const handleTeamClick = (team: Team) => setSelectedTeam(team);

  const handleAddMember = async () => {
    if (firebaseUser && selectedTeam && newMemberEmail) {
      if (selectedTeam.members.some(member => member.email === newMemberEmail)) {
        alert('User already exists in the team');
        return;
      }

      try {
        const user = await getUserByEmail(newMemberEmail);
        await inviteUserToTeam(firebaseUser.uid, selectedTeam._id, user._id);
        setNewMemberEmail('');
        setSelectedTeam(prevTeam => ({
          ...prevTeam!,
          members: [...prevTeam!.members, user]
        }));

        // Update the teams state to reflect the change
        setTeams(prevTeams =>
          prevTeams.map(team =>
            team._id === selectedTeam._id
              ? { ...team, members: [...team.members, user] }
              : team
          )
        );
      } catch (error) {
        console.error("Error adding member:", error);
        alert('Failed to add member');
      }
    }
  };

  const handleLeaveTeam = async (teamId: string, teamName: string) => {
    setLeaveTeamConfirmation({ isOpen: true, teamId, teamName, isOwner: false });
  };


  const confirmLeaveTeam = async () => {
    if (firebaseUser && leaveTeamConfirmation.teamId) {
      try {
        if (leaveTeamConfirmation.isOwner) {
          await deleteTeam(firebaseUser.uid, leaveTeamConfirmation.teamId);
        } else {
          await leaveTeam(firebaseUser.uid, leaveTeamConfirmation.teamId);
        }
        setLeaveTeamConfirmation({ isOpen: false, teamId: '', teamName: '', isOwner: false });
        fetchUserAndTeams();
      } catch (error) {
        if (error instanceof Error && error.message === "OWNER_LEAVING") {
          setLeaveTeamConfirmation(prev => ({ ...prev, isOwner: true }));
        } else {
          console.error("Error leaving/deleting team:", error);
          alert('Failed to leave/delete team');
        }
      }
    }
  };

  return (
    <div className="teams-page page-content">
      {selectedTeam && firebaseUser ? (
        <div className="selected-team-container">
          <TeamPage team={selectedTeam} userId={firebaseUser.uid} newMemberEmail={newMemberEmail} setNewMemberEmail={setNewMemberEmail} handleAddMember={handleAddMember} />
        </div>
      ) : (
        <div className="teams-list-container">
          <div className='teams-page-header-section'>
            <h1 className="teams-page-title" style={{ direction: isRTL ? 'rtl' : 'ltr' }} >{t["your-teams"]}</h1>
            <div className="teams-actions">
              <button className="refresh-button" onClick={handleRefresh} title={t["refresh-teams"]}>
                <RefreshCw size={20} />
              </button>
              <button className="export-button" onClick={handleOpenExportModal} title={t["download-data"]}>
                <Download size={20} />
              </button>
              <button className="create-team-button" onClick={handleOpenModal}>{t["create-new-team"]}</button>
            </div>
          </div>
          {isLoading ? <div className="teams-page loader"><ClipLoader color="#123abc" size={50} /></div> : teams.length === 0 ? (
            <div className="teams-page error-message">
              <p>{t["no-teams-message"]}</p>
            </div>
          ) : (
            <div className="teams-list">
              {teams.map(team => (
                <div key={team._id} className="team-item" onClick={() => handleTeamClick(team)}>
                  <button
                    className="leave-team-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLeaveTeam(team._id, team.team_name);
                    }}
                    title={t["leave-team"]}
                  >
                    <LogOut size={16} />
                  </button>
                  <h2 style={{ direction: isRTL ? 'rtl' : 'ltr' }}>{team.team_name}</h2>
                  <p className="team-members-count" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>{team.members.length} {t["members"]}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {firebaseUser && <CreateTeamModal isOpen={isModalOpen} onClose={handleCloseModal} onSubmit={handleCreateTeam} />}
      {leaveTeamConfirmation.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setLeaveTeamConfirmation({ isOpen: false, teamId: '', teamName: '', isOwner: false })}>
              <X size={24} />
            </button>
            <h2>{leaveTeamConfirmation.isOwner ? t["delete-team"] : t["leave-team"]}</h2>
            {leaveTeamConfirmation.isOwner ? (
              <p>{t["delete-team-warning"].replace("{teamName}", leaveTeamConfirmation.teamName)}</p>
            ) : (
              <p>{t["leave-team-confirmation"].replace("{teamName}", leaveTeamConfirmation.teamName)}</p>
            )}
            <div className="modal-actions">
              <button className="modal-button cancel" onClick={() => setLeaveTeamConfirmation({ isOpen: false, teamId: '', teamName: '', isOwner: false })}>
                {t["cancel"]}
              </button>
              <button className="modal-button confirm" onClick={confirmLeaveTeam}>
                {leaveTeamConfirmation.isOwner ? t["confirm-delete-team"] : t["confirm-leave-team"]}
              </button>
            </div>
          </div>
        </div>
      )}
      {isExportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content export-modal">
            <button className="modal-close" onClick={handleCloseExportModal}>
              <X size={24} />
            </button>
            <h2 style={{ direction: isRTL ? 'rtl' : 'ltr' }}>{t["export-team-data"]}</h2>
            <input
              type="text"
              placeholder={t["search-teams"]}
              value={teamSearchQuery}
              onChange={(e) => setTeamSearchQuery(e.target.value)}
              className="team-search-input"
              style={{ direction: isRTL ? 'rtl' : 'ltr' }}
            />
            <div className="team-grid">
              {filteredTeams.map(team => (
                <div
                  key={team._id}
                  className={`team-card ${selectedExportTeam?._id === team._id ? 'selected' : ''}`}
                  onClick={() => setSelectedExportTeam(team)}
                >
                  <h3 className='team-name'>{team.team_name}</h3>
                  <p>{team.members.length} {t["members"]}</p>
                </div>
              ))}
            </div>
            {selectedExportTeam && (
              <div className="date-picker-container">
                <div className="date-picker">
                  <label>{t["start-date"]}:</label>
                  <input
                    type="datetime-local"
                    onChange={(e) => setStartDate(e.target.value)}
                    value={startDate}
                  />
                </div>
                <div className="date-picker">
                  <label>{t["end-date"]}:</label>
                  <input
                    type="datetime-local"
                    onChange={(e) => setEndDate(e.target.value)}
                    value={endDate}
                  />
                </div>
              </div>
            )}
            <button
              className="export-data-button"
              onClick={handleExportData}
              disabled={!selectedExportTeam || !startDate || !endDate || isExporting}
            >
              {isExporting ? (
                <>
                  <ClipLoader color="#ffffff" size={16} />
                  <span style={{ marginLeft: '8px' }}>{t["downloading"]}</span>
                </>
              ) : (
                t["download-data"]
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsPage;