// src/components/teamPage/TeamInbox.tsx
import React, { useState, useEffect } from 'react';
import './TeamInbox.css';

interface TeamInboxProps {
  teamId: string;
}

const TeamInbox: React.FC<TeamInboxProps> = ({ teamId }) => {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      // Fetch events from the server
      // For now, let's use dummy data
      const dummyEvents = [
        { id: 1, message: 'Event 1' },
        { id: 2, message: 'Event 2' },
      ];
      setEvents(dummyEvents);
    };

    fetchEvents();
  }, [teamId]);

  return (
    <div className="team-inbox">
      {events.map(event => (
        <div key={event.id} className="event">
          {event.message}
        </div>
      ))}
    </div>
  );
};

export default TeamInbox;
