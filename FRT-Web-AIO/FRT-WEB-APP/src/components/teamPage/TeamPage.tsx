import React, { useEffect, useState } from "react";
import "./TeamPage.css";
import { Team } from "../../types/teams";
import TeamChat from "./TeamChat";
import Map from "../map/Map";
import { getUsersByIds } from "../../api/users";
import MissionManager from "../missions/MissionManager";
import { deleteMember } from "../../api/teams";
import { User } from "../../api/users";
interface TeamPageProps {
  team: Team;
  userId: string;
  newMemberEmail: string;
  setNewMemberEmail: React.Dispatch<React.SetStateAction<string>>;
  handleAddMember: () => void;
}
import { useLanguage } from '../../LanguageContext';

const TeamPage: React.FC<TeamPageProps> = ({ team, userId, newMemberEmail, setNewMemberEmail, handleAddMember }) => {
  const [memberDetails, setMemberDetails] = useState<User[]>([]);
  const [activeView, setActiveView] = useState<'chat' | 'map' | 'missions'>('chat');
  const [isTeamDetailsExpanded, setIsTeamDetailsExpanded] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [membersCount, setMembersCount] = useState<number>(team.members.length || 0);
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    const fetchMemberDetails = async () => {
      try {
        const memberIds = [...team.members, team.team_owner].map(member => member._id);
        const users = await getUsersByIds(memberIds);
        setMemberDetails(users);
      } catch (error) {
        console.error("Error fetching member details:", error);
      }
    };

    fetchMemberDetails();
  }, [team]);

  const findUserById = (id: string): User | undefined => {
    return memberDetails.find(user => user._id === id);
  };


  const filteredMembers = memberDetails.filter(member =>
    (findUserById(member._id)?.displayName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRemoveFromTeam = async (memberIdToRemove: string) => {
    if (window.confirm(t["confirm-remove-member"])) {
      try {
        await deleteMember(userId, team._id, memberIdToRemove);
        // Update the local state to reflect the removal
        setMemberDetails(prevMembers => prevMembers.filter(member => member._id !== memberIdToRemove));
        setSelectedUser(null);
        setMembersCount((prev) => prev - 1);
        console.log(t["member-removed-log"].replace("{memberId}", memberIdToRemove));
      } catch (error) {
        console.error(t["error-removing-member"], error);
        alert(t["failed-remove-member"]);
      }
    }
  };



  const renderMemberList = () => {
    const displayedMembers = memberDetails.slice(0, 4);

    return (
      <>
        {displayedMembers.map((member) => (
          <div key={member._id} className="member-item" onClick={() => setSelectedUser(member)}>
            {member.displayName}
          </div>
        ))}
        {memberDetails.length > 4 && (
          <div className="member-item more" onClick={() => setShowAllMembers(true)}>
            {t["more-members"].replace("{count}", (memberDetails.length - 4).toString())}
          </div>
        )}
      </>
    );
  };


  return (
    <div className="team-page">
      <div className="team-page__left">
        <div className={`team-page__details ${isTeamDetailsExpanded ? 'expanded' : ''}`}>
          <div className="team-page__details-header" onClick={() => setIsTeamDetailsExpanded(!isTeamDetailsExpanded)}>
            <h2>{team.team_name}</h2>
            <span className={`arrow ${isTeamDetailsExpanded ? 'up' : 'down'}`}></span>
          </div>
          {isTeamDetailsExpanded && (
            <div className="team-info" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
              <div className="team-members">
                <strong>{t["members-count"].replace("{count}", membersCount.toString())}:</strong>
                <div className="member-list">
                  {renderMemberList()}
                </div>
              </div>
              <div className="add-member-section">
                <input
                  type="text"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder={t["enter-email-invite"]}
                />
                <button onClick={handleAddMember} className="add-member-button">{t["add"]}</button>
              </div>
            </div>
          )}
        </div>
        <div className="team-page__mobile-controls">
          <button onClick={() => setActiveView('chat')} className={activeView === 'chat' ? 'active' : ''}>{t["chat"]}</button>
          <button onClick={() => setActiveView('map')} className={activeView === 'map' ? 'active' : ''}>{t["map"]}</button>
          <button onClick={() => setActiveView('missions')} className={activeView === 'missions' ? 'active' : ''}>{t["missions"]}</button>
        </div>
        <div className={`team-page__chat ${activeView === 'chat' ? 'active' : ''}`}>
          <TeamChat teamId={team._id} userId={userId} findUserById={findUserById} />
        </div>
      </div>
      <div className={`team-page__map-container ${activeView === 'map' ? 'active' : ''}`}>
        <Map teamId={team._id} userId={userId} findUserById={findUserById} />
      </div>
      <div className={`team-page__missions ${activeView === 'missions' ? 'active' : ''}`}>
        <MissionManager teamId={team._id} userId={userId} memberDetails={memberDetails} />
      </div>
      {showAllMembers && (
        <div className="modal-overlay" onClick={() => setShowAllMembers(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{t["all-team-members"]}</h3>
            <input
              type="text"
              placeholder={t["search-members"]}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ textAlign: isRTL ? 'right' : 'left' }}
            />
            <div className="modal-member-list">
              {filteredMembers.map((member) => (
                <div key={member._id} className="modal-member-item" onClick={() => setSelectedUser(member)}>
                  {member.displayName}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="modal-button secondary" onClick={() => setShowAllMembers(false)}>{t["close"]}</button>
            </div>
          </div>
        </div>
      )}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
            <h3>{t["user-details"]}</h3>
            <div className="user-details">
              <div className="user-detail-item">
                <strong>{t["name"]}</strong>
                <span>{selectedUser.displayName}</span>
              </div>
              <div className="user-detail-item">
                <strong>{t["email"]}</strong>
                <span>{selectedUser.email}</span>
              </div>
              <div className="user-detail-item">
                <strong>{t["role"]}</strong>
                <span>{selectedUser._id === team.team_owner._id ? t["owner"] : t["member"]}</span>
              </div>
              <div className="user-detail-item">
                <div className="inner-user-detail-item">
                  <strong>{t["id"]}: </strong>
                  <span className="inner-user-detail-content">{selectedUser._id}</span>
                </div>
                <div className="inner-user-detail-item">
                  <strong>{t["telegram-id"]}: </strong>
                  <span className="inner-user-detail-content">{selectedUser.telegram_user_id || t["not-verified"]}</span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              {userId === team.team_owner._id && selectedUser._id !== team.team_owner._id && <button className="modal-button danger" onClick={() => handleRemoveFromTeam(selectedUser._id)}>Remove from Team</button>}
              <button className="modal-button secondary" onClick={() => setSelectedUser(null)}>{t["close"]}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPage;