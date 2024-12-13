import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TeamChat.css'; // Make sure to import the CSS file
import { MessageType } from '../../types/messageType';
import { User } from '../../auth/Authenticator';
import ImageModal from './ImageModal'; // Import the new ImageModal component
import { FaArrowDown, FaImage, FaPaperPlane } from "react-icons/fa";
import { formatMessages, Message, PhotoMessage, TimelineMessage, Timeline, FilterType, getChat, getChatInsights, ActionRequestMessage, ActionResponseMessage } from "../../api/chats";
import { Check } from 'lucide-react'; // Import the Check icon from lucide-react
import { ClipLoader } from 'react-spinners'; // Add this import
import { formatTimestamp } from '../../utils/utils';
import { useLanguage } from '../../LanguageContext'; // Import useLanguage hook

interface TeamChatProps {
  teamId: string;
  userId: string;
  findUserById: (id: string) => User | undefined;
}

function isHebrew(text: string): boolean {
  const hebrewPattern = /[\u0590-\u05FF]/;
  return hebrewPattern.test(text);
}

const TeamChat: React.FC<TeamChatProps> = ({ teamId, userId, findUserById }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isTypingSent, setIsTypingSent] = useState(false); // State to track if typing has been sent
  const [filter, setFilter] = useState<FilterType>('all');
  const [totalMessages, setTotalMessages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modalImage, setModalImage] = useState<{ src: string; alt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [showLoadMore, setShowLoadMore] = useState(false);
  const [showNewMessageNotification, setShowNewMessageNotification] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState<boolean>(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { t, isRTL } = useLanguage(); // Use the language hook

  const ws = useRef<WebSocket | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);


  const isOnTeamsPage = useCallback(() => {
    return window.location.pathname === "/teams";
  }, []);

  const handleScroll = useCallback(() => {
    if (chatMessagesRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
      const scrollPosition = scrollHeight - scrollTop - clientHeight;

      setIsNearBottom(scrollPosition < 100);
      setShowLoadMore(scrollTop < 100);
      if (scrollPosition < 100) {
        
        setShowNewMessageNotification(false);
        setNewMessageCount(0);
      }
    }
  }, []);

  useEffect(() => {
    const chatMessagesElement = chatMessagesRef.current;
    if (chatMessagesElement) {
      chatMessagesElement.addEventListener('scroll', handleScroll);
      return () => chatMessagesElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const fetchChatData = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const insights = await getChatInsights(teamId);
      
      setTotalMessages(insights.number_of_rows);

      const initialData = await getChat(teamId);
      
      const formattedMessages = formatMessages(initialData);
      
      setMessages(formattedMessages.reverse());
      setCurrentPage(0);
    } catch (error) {
      console.error("Failed to load chat data:", error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchChatData();
  }, [fetchChatData]);

  const handleRetry = useCallback(() => {
    fetchChatData();
  }, [fetchChatData]);

  const getUserDisplayName = useCallback((id: string): string => {
    const user = findUserById(id);
    return (user && user.displayName) ? user.displayName : `User ${id}`;
  }, [findUserById]);

  const loadMoreMessages = useCallback(async () => {
    if (!isLoading && chatMessagesRef.current) {
      setIsLoading(true);
      setShouldScrollToBottom(false);
      const scrollHeight = chatMessagesRef?.current?.scrollHeight;
      const scrollTop = chatMessagesRef.current.scrollTop;
      
      try {
        const additionalData = await getChat(teamId, currentPage + 1);
        const formattedMessages = formatMessages(additionalData);
        formattedMessages.reverse();
        setMessages(prevMessages => [...formattedMessages, ...prevMessages]);
        setCurrentPage(prevPage => prevPage + 1);
        setTimeout(() => {
          if (chatMessagesRef.current) {
            const newScrollHeight = chatMessagesRef.current.scrollHeight;
            chatMessagesRef.current.scrollTop = newScrollHeight - scrollHeight + scrollTop;
          }
        }, 0);
      } catch (error) {
        console.error("Failed to load more messages:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [teamId, currentPage, isLoading]);

  const connectWebSocket = useCallback(() => {
    if (!isOnTeamsPage()) return;
    
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL;
    console.log('wsUrl is: ', wsUrl);
    
    if (wsUrl) {
      ws.current = new WebSocket(`${wsUrl}?teamId=${teamId}`);
      ws.current.onopen = () => {
        console.log('WebSocket connected in Chat');
        setIsWebSocketConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === MessageType.Text || data.type === MessageType.Timeline || data.type === MessageType.Photo || data.type === MessageType.ActionResponse) {
          const newMessage = formatMessages([data])[0];
          setMessages(prevMessages => [...prevMessages, newMessage]);
          setTypingUsers(prev => new Set([...prev].filter(id => id !== data.senderId)));
          setNewMessageCount(prevCount => prevCount + 1); // Increment new message count
        } else if (data.type === MessageType.Typing) {
          if (data.typing === false) {
            setTypingUsers(prev => new Set([...prev].filter(id => id !== data.senderId)));
          } else {
            setTypingUsers(prev => new Set(prev.add(data.senderId)));
          }
        }
      };
      ws.current.onclose = () => {
        console.log('WebSocket disconnected in Chat');
        setIsWebSocketConnected(false);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 6000);
        startPolling();
      };
    } else {
      console.log('WebSocket URL is not defined. No connection will be made.');
      startPolling();

    }
  }, [teamId]);

  const startPolling = useCallback(() => {
    if (!isOnTeamsPage()) return;

    if (!pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const chatData = await getChat(teamId);
          const formattedMessages = formatMessages(chatData);
          setMessages(prevMessages => {
            const newMessages = formattedMessages.filter(
              newMsg => !prevMessages.some(prevMsg => prevMsg.id === newMsg.id)
            );
            return [...prevMessages, ...newMessages];
          });
        } catch (error) {
          console.error("Failed to poll chat data:", error);
        }
      }, 20000); // Poll every 20 seconds
    }
  }, [teamId]);

  const cleanup = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsWebSocketConnected(false);
  }, []);

  useEffect(() => {
    connectWebSocket();
    return cleanup;
  }, [connectWebSocket, cleanup]);

  useEffect(() => {
    if (!isNearBottom) {
      setShowNewMessageNotification(true);
    }

  }, [isNearBottom])

useEffect(()=> {
  scrollToBottom();
},[])
  const renderTimelineItem = (msg: Message) => {
    let timelineData: TimelineMessage | null = null;

    if (typeof msg.message === 'object' && 'timeline' in msg.message) {
      timelineData = msg.message;
    } else if (typeof msg.message === 'string') {
      try {
        timelineData = JSON.parse(msg.message);
      } catch (error) {
        console.log('Failed to parse timeline message:', msg.message);
      }
    }

    if (timelineData) {

      const { timeline, data } = timelineData;
      let content = '';
      const userName = getUserDisplayName(msg.senderId);
      let isMissionRelated = false;

      switch (Number(timeline)) {
        case Timeline.START_NEW_CHAT:
          content = `${userName} started a new chat`;
          break;
        case Timeline.DELETE_MARK:
          content = `${userName} deleted a mark`;
          break;
        case Timeline.UPDATE_MARK:
          content = `${userName} updated a mark`;
          break;
        case Timeline.ADD_MARK:
          content = `${userName} added a new mark`;
          break;
        case Timeline.UPDATE_MAP:
          content = `${userName} updated the map`;
          break;
        case Timeline.CREATE_MISSION:
          content = `${userName} created a new mission: ${data?.name}`;
          isMissionRelated = true;
          break;
        case Timeline.UPDATE_MISSION:

          content = `${userName} updated the mission: ${data?.name}`;
          isMissionRelated = true;
          break;
        case Timeline.DELETE_MISSION:
          content = `${userName} deleted the mission: ${data?.name}`;
          isMissionRelated = true;
          break;
        default:
          content = `${userName} performed an unknown action`;
      }

      return (
        <div className="chat-message timeline-message">
          <div className={`timeline-item ${isMissionRelated ? 'mission' : ''}`}>
            <div className="timeline-timestamp">{formatTimestamp(msg.timestamp || '')}</div>
            <div className="timeline-content">{content}</div>
          </div>
        </div>
      );
    }
    return null;
  };


  const scrollToBottom = useCallback(() => {
  if (shouldScrollToBottom) {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setNewMessageCount(0);
  }
}, [shouldScrollToBottom]);

const handleNewMessageNotificationClick = () => {
  
  scrollToBottom();
  setNewMessageCount(0);
};


  const handleSendMessage = () => {
    if (newMessage.trim() && ws.current) {
      const msg: Message = { type: MessageType.Text, id: teamId, message: newMessage, senderId: userId, timestamp: Date.now().toString() };
      ws.current.send(JSON.stringify(msg));
      setNewMessage('');
      setTypingUsers(prev => new Set([...prev].filter(id => id !== userId)));
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      setIsTypingSent(false);
      setShouldScrollToBottom(true);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && ws.current) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Image = e.target?.result as string;
        const photoMessage: PhotoMessage = {
          file_name: file.name,
          file_data: base64Image.split(',')[1] // Remove the data URL prefix
        };
        const msg: Message = {
          type: MessageType.Photo,
          id: teamId,
          message: photoMessage,
          senderId: userId,
          timestamp: new Date().getTime().toString(),
        };
        if (ws.current) {
          ws.current.send(JSON.stringify(msg));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTyping = () => {
    if (ws.current && newMessage.trim() !== '') {
      if (!isTypingSent) {
        ws.current.send(JSON.stringify({ type: MessageType.Typing, senderId: userId, teamId, typing: true }));
        setIsTypingSent(true);
      }

      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        if (ws.current) {
          ws.current.send(JSON.stringify({ type: MessageType.Typing, senderId: userId, teamId, typing: false }));
          setIsTypingSent(false); // Reset typing sent status after stopping
        }
      }, 1200); // Shorter timeout as per your code
    }
  };

  const renderMessage = (msg: Message) => {
    const isMyMessage = msg.senderId === userId;
    const isHebrewMessage = typeof msg.message === 'string' && isHebrew(msg.message);
    const lang = isHebrewMessage ? 'he' : 'en';
    const className = `chat-message ${isMyMessage ? 'my-message' : 'other-message'}`;

    switch (msg.type) {
      case MessageType.Photo:
        return (
          <div key={msg.id} className={className}>
            <div className="message-content">
              <div className="sender-name-wrapper" title={isMyMessage ? 'You' : getUserDisplayName(msg.senderId)}>
                <strong className="sender-name">{isMyMessage ? 'You' : getUserDisplayName(msg.senderId)}</strong>
              </div>
              {renderPhotoMessage(msg.message as PhotoMessage)}
              <span className="message-timestamp">{formatTimestamp(msg.timestamp || '')}</span>
            </div>
          </div>
        );
      case MessageType.Timeline:
        return renderTimelineItem(msg)
      case MessageType.ActionRequest:
        return renderActionRequestMessage(msg, isMyMessage);
      case MessageType.ActionResponse:
        return renderActionResponseMessage(msg);
      default:

      return (
        <div key={msg.id} className={className}>
          <div className="message-content">
            <div className="sender-name-wrapper" title={isMyMessage ? 'You' : getUserDisplayName(msg.senderId)}>
              <strong className="sender-name">{isMyMessage ? 'You' : getUserDisplayName(msg.senderId)}</strong>
            </div>
            <div className="message-text" lang={lang}>
            {typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message)}
            </div>
            <span className="message-timestamp">{formatTimestamp(msg.timestamp || '')}</span>
          </div>
        </div>
      );
    }
  };
  
  const renderActionResponseMessage = (msg: Message) => {
    const actionResponse = msg.message as ActionResponseMessage;
    const userName = getUserDisplayName(msg.senderId);
    return (
      <div className="action-response-message">
        <div className="action-response-content">
          <span className="action-response-text">{`${userName} voted '${actionResponse.data}'`}</span>
          <span className="action-response-timestamp">{formatTimestamp(msg.timestamp || '')}</span>
        </div>
        <div className="action-response-symbol">
          <Check size={16} />
        </div>
      </div>
    );
  };

  const renderPhotoMessage = (photoMsg: PhotoMessage) => (
    <div className="message-image">
      <img
        src={`data:image/jpeg;base64,${photoMsg.file_data}`}
        alt={photoMsg.file_name}
        onClick={() => setModalImage({
          src: `data:image/jpeg;base64,${photoMsg.file_data}`,
          alt: photoMsg.file_name
        })}
      />
    </div>
  );
  
  const renderActionRequestMessage = (
    msg: Message,
    isMyMessage: boolean,
  ) => {
    const isHebrewMessage = typeof (msg.message as ActionRequestMessage).content === 'string' && isHebrew((msg.message as ActionRequestMessage).content);
    const lang = isHebrewMessage ? 'he' : 'en';
    return (
      <div className="action-request-timeline">
        <div className="sender-name">
          {isMyMessage ? 'You' : getUserDisplayName(msg.senderId)}
        </div>
        <p className="message-text" lang={lang}>
          {(msg.message as ActionRequestMessage).content || 'Action Required'}
        </p>
        {msg.timestamp && <span className="message-timestamp">{formatTimestamp(msg.timestamp)}</span>}
      </div>
    );
  };
  

  const filteredMessages = messages.filter(msg => {
    if (filter === 'all') return msg.type === MessageType.Text || msg.type === MessageType.Photo || msg.type === MessageType.Timeline || msg.type === MessageType.ActionRequest || msg.type === MessageType.ActionResponse;//no telegram markers
    if (filter === 'chat') return msg.type === MessageType.Text || msg.type === MessageType.Photo;
    if (filter === 'timeline') return msg.type === MessageType.Timeline;
    if (filter === 'action') return msg.type === MessageType.ActionRequest || msg.type === MessageType.ActionResponse;
    return true;
  });

  const renderFilterButton = (filterType: FilterType, label: string) => (
    <button
      className={filter === filterType ? 'active' : ''}
      onClick={() => setFilter(filterType)}
    >
      {t[label.toLowerCase()]}
      </button>
  );

 return (
  <div className="team-chat" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
    <div className="chat-filter">
      {renderFilterButton('all', 'All')}
      {renderFilterButton('chat', 'Chat')}
      {renderFilterButton('timeline', 'Timeline')}
      {renderFilterButton('action', 'Action')}
    </div>
    {showLoadMore && messages.length < totalMessages && (
      <button onClick={loadMoreMessages} disabled={isLoading} className='load-more-btn'>
          {isLoading ? t['loading'] : t['load-more']}
          </button>
    )}
    <div className="chat-messages" ref={chatMessagesRef}>
    {error ? (
          <div className="team-chat error">
             <h3>{t['chat-load-error']}</h3>

             <div className="error-options">
               <div className="error-option">
                 <h4>{t['new-team-title']}</h4>
                 <p>{t['new-team-message']}</p>
               </div>

               <div className="error-option">
                 <h4>{t['existing-team-title']}</h4>
                 <p>{t['existing-team-message']}</p>
                 <button onClick={handleRetry} className='retry-button'>
                   {t['retry-loading-chat']}
                 </button>
               </div>
             </div>

             <p className="help-text">{t['persistent-error-message']}</p>
           </div>
      ) : isLoading && messages.length === 0 ? (
        <div className="loading-spinner">
          <ClipLoader color="#007bff" size={50} />
        </div>
      ) : filteredMessages.length > 0 ? (
        <>
          {filteredMessages.map(msg => renderMessage(msg))}
          <div ref={messagesEndRef} />
        </>
      ) : (
        <div className="no-messages">{t['no-messages']}</div>
      )}
    </div>
    {showNewMessageNotification && newMessageCount > 0 && (
      <div className="new-message-notification" onClick={handleNewMessageNotificationClick}>
          <FaArrowDown /> {t['new-messages']} {`(${newMessageCount})`}
          </div>
    )}
    <div className="typing-status">
      {Array.from(typingUsers).filter(u => u !== userId).map(user => (
        <div key={user} className="typing-indicator">
            <span className="blinking-text">{t['user-is-typing'].replace('{user}', getUserDisplayName(user))}</span>
            <div className="dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>
      ))}
    </div>
    <div className="chat-input">
      <div className="input-wrapper" >
        <textarea
         disabled={!isWebSocketConnected}
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          placeholder={isWebSocketConnected ? t['type-a-message'] : 'Temporary chat error. please wait or refresh the page.'}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          style={{ textAlign: isRTL ? 'right' : 'left' }}

        />
      </div>
      <div className="button-wrapper">
      <button disabled={!isWebSocketConnected} onClick={handleSendMessage} className="send-button" title={t['send-message']}>
      <FaPaperPlane />
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="upload-image-button" title={t['upload-image']}>
        <FaImage />
        </button>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleImageUpload}
      />
    </div>
    {modalImage && (
      <ImageModal
        src={modalImage.src}
        alt={modalImage.alt}
        onClose={() => setModalImage(null)}
      />
    )}
  </div>
);
};

export default TeamChat;
