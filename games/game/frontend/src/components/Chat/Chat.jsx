import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import SoundSynth from '../../utils/soundSynth';

export default function Chat({ currentFriend, onBack }) {
  const { socket, isConnected } = useSocket();
  const { user, token } = useAuth();

  const [channel, setChannel] = useState(currentFriend ? 'direct' : 'global');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [friends, setFriends] = useState([]);
  const [activeDmFriend, setActiveDmFriend] = useState(currentFriend || null);

  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Load chat history & Friends list
  useEffect(() => {
    loadFriends();
    if (channel === 'global') {
      loadGlobalHistory();
    } else if (channel === 'direct' && activeDmFriend) {
      loadPrivateHistory(activeDmFriend.id);
    }
  }, [channel, activeDmFriend]);

  // Socket chat events
  useEffect(() => {
    if (!socket) return;

    socket.on('receive_global_message', (msg) => {
      if (channel === 'global') {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
      SoundSynth.playNotification();
    });

    socket.on('receive_direct_message', (msg) => {
      if (channel === 'direct' && activeDmFriend && (msg.senderId === activeDmFriend.id || msg.senderId === user.id)) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
      SoundSynth.playNotification();
    });

    socket.on('user_typing', (data) => {
      if (data.channel === channel) {
        if (channel === 'global' || (channel === 'direct' && data.senderId === activeDmFriend?.id)) {
          setTypingUser(data.isTyping ? data.username : '');
        }
      }
    });

    return () => {
      socket.off('receive_global_message');
      socket.off('receive_direct_message');
      socket.off('user_typing');
    };
  }, [socket, channel, activeDmFriend, user.id]);

  const loadFriends = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/user/friends', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data.filter(f => f.status === 'accepted'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadGlobalHistory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/chat/global', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        setTimeout(scrollToBottom, 50);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadPrivateHistory = async (friendId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/chat/direct/${friendId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        setTimeout(scrollToBottom, 50);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if (!inputText.trim() || !socket) return;

    SoundSynth.playClick();

    if (channel === 'global') {
      socket.emit('send_global_message', { text: inputText });
    } else if (channel === 'direct' && activeDmFriend) {
      socket.emit('send_direct_message', { recipientId: activeDmFriend.id, text: inputText });
    }

    setInputText('');
    stopTyping();
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (!isTyping && socket) {
      setIsTyping(true);
      socket.emit('typing_status', {
        channel,
        isTyping: true,
        friendId: activeDmFriend?.id,
        roomCode: null
      });
    }

    // Reset typing timeout
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(stopTyping, 2000);
  };

  const stopTyping = () => {
    if (isTyping && socket) {
      setIsTyping(false);
      socket.emit('typing_status', {
        channel,
        isTyping: false,
        friendId: activeDmFriend?.id,
        roomCode: null
      });
    }
  };

  const selectFriendDM = (friend) => {
    setActiveDmFriend(friend);
    setChannel('direct');
    SoundSynth.playClick();
  };

  const deleteMessage = async (msgId) => {
    if (user.role !== 'admin') return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/message/${msgId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== msgId));
        SoundSynth.playClick();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={styles.container} className="card-panel">
      {/* Channels Sidebar */}
      <div style={styles.sidebar}>
        <button
          onClick={() => { setChannel('global'); SoundSynth.playClick(); }}
          style={{
            ...styles.channelBtn,
            background: channel === 'global' ? 'var(--primary-glow)' : 'transparent',
            borderColor: channel === 'global' ? 'var(--primary)' : 'transparent',
            color: channel === 'global' ? 'var(--primary)' : 'var(--text-primary)'
          }}
        >
          🌐 Global Lobby Chat
        </button>

        <div style={styles.dmLabel}>DIRECT MESSAGES</div>
        <div style={styles.friendsList}>
          {friends.length === 0 ? (
            <div style={styles.emptyText}>No friends online. Add them in dashboard!</div>
          ) : (
            friends.map(f => {
              const isSelected = channel === 'direct' && activeDmFriend?.id === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => selectFriendDM(f)}
                  style={{
                    ...styles.friendRow,
                    background: isSelected ? 'var(--primary-glow)' : 'transparent',
                    borderColor: isSelected ? 'var(--primary)' : 'transparent'
                  }}
                >
                  <span style={styles.avatarMini}>{f.username[0].toUpperCase()}</span>
                  <div style={styles.friendInfo}>
                    <span style={{ fontWeight: '500' }}>{f.username}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>ELO: {f.elo}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Conversation pane */}
      <div style={styles.chatPane}>
        <div style={styles.paneHeader}>
          <h3>
            {channel === 'global' ? '🌐 Global Lounge' : `💬 Chat with ${activeDmFriend?.username}`}
          </h3>
          {onBack && (
            <button onClick={onBack} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
              Back
            </button>
          )}
        </div>

        <div style={styles.messageBox}>
          {messages.map(m => {
            const isMe = m.senderId === user.id || (m.sender && m.sender.id === user.id);
            const senderName = m.sender ? m.sender.username : (isMe ? user.username : activeDmFriend?.username);
            return (
              <div
                key={m.id}
                style={{
                  ...styles.messageBubbleRow,
                  justifyContent: isMe ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    ...styles.messageBubble,
                    background: isMe ? 'var(--primary-glow)' : 'var(--bg-secondary)',
                    borderColor: isMe ? 'var(--primary)' : 'var(--card-border)'
                  }}
                >
                  <div style={styles.msgHeader}>
                    <span style={{ fontWeight: '600', fontSize: 12, color: 'var(--text-primary)' }}>{senderName}</span>
                    {user.role === 'admin' && (
                      <button onClick={() => deleteMessage(m.id)} style={styles.deleteBtn} title="Admin: Delete message">
                        🗑️
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>{m.messageText}</div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {typingUser && (
          <div style={styles.typingIndicator}>
            ✍️ {typingUser} is typing...
          </div>
        )}

        <div style={styles.inputRow}>
          <input
            type="text"
            className="input-field"
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            style={{ borderRadius: '8px 0 0 8px' }}
          />
          <button
            onClick={handleSend}
            className="btn-primary"
            style={{ borderRadius: '0 8px 8px 0', padding: '0 20px' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: 480,
    padding: 0,
    overflow: 'hidden'
  },
  sidebar: {
    width: 200,
    borderRight: '1px solid var(--card-border)',
    background: 'rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    padding: 12,
    gap: 12
  },
  channelBtn: {
    textAlign: 'left',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid',
    fontSize: 13,
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  dmLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
    marginTop: 8
  },
  friendsList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  emptyText: {
    fontSize: 11,
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: 12
  },
  friendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid transparent',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    textAlign: 'left',
    transition: 'all 0.15s ease'
  },
  avatarMini: {
    width: 24,
    height: 24,
    background: 'var(--secondary-glow)',
    border: '1px solid var(--secondary)',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    fontSize: 11,
    fontWeight: 'bold'
  },
  friendInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  chatPane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(0, 0, 0, 0.05)'
  },
  paneHeader: {
    padding: '14px 18px',
    borderBottom: '1px solid var(--card-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  messageBox: {
    flex: 1,
    padding: 16,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  messageBubbleRow: {
    display: 'flex',
    width: '100%'
  },
  messageBubble: {
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid'
  },
  msgHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 10
  },
  typingIndicator: {
    fontSize: 11,
    color: 'var(--text-muted)',
    padding: '4px 16px',
    fontStyle: 'italic'
  },
  inputRow: {
    display: 'flex',
    padding: 12,
    borderTop: '1px solid var(--card-border)'
  }
};
