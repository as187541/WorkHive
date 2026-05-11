import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const MessagesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialUserId = searchParams.get('user');

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Fetch conversations
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle initial userId from URL (start new conversation)
  useEffect(() => {
    if (initialUserId) {
      startConversation(initialUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
      const interval = setInterval(() => fetchMessages(selectedConversation._id, false), 5000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?._id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (userId) => {
    try {
      const res = await api.post('/messages/conversations', { userId });
      const conversation = res.data.data;
      setSelectedConversation(conversation);
      // Refresh conversation list
      fetchConversations();
      // Clear URL param
      navigate('/messages', { replace: true });
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to start conversation');
    }
  };

  const fetchMessages = async (conversationId, showLoading = true) => {
    if (showLoading) setMessagesLoading(true);
    try {
      const res = await api.get(`/messages/conversations/${conversationId}/messages`);
      setMessages(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      if (showLoading) setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const res = await api.post(
        `/messages/conversations/${selectedConversation._id}/messages`,
        { content: newMessage.trim() }
      );

      setMessages(prev => [...prev, res.data.data]);
      setNewMessage('');

      // Update conversation list with last message
      setConversations(prev =>
        prev.map(conv =>
          conv._id === selectedConversation._id
            ? {
                ...conv,
                lastMessage: {
                  content: newMessage.trim(),
                  sender: { _id: JSON.parse(localStorage.getItem('user'))._id },
                  createdAt: new Date().toISOString()
                }
              }
            : conv
        )
      );
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    // Mark as read locally
    setConversations(prev =>
      prev.map(conv =>
        conv._id === conversation._id ? { ...conv, unreadCount: 0 } : conv
      )
    );
  };

  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;

    try {
      await api.delete(`/messages/conversations/${conversationId}`);
      setConversations(prev => prev.filter(c => c._id !== conversationId));
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to delete conversation');
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}')._id;

  return (
    <div className="messages-page page-enter">
      <div className="messages-layout">
        {/* Conversations Sidebar */}
        <div className="conversations-sidebar">
          <div className="conversations-header">
            <h2>Messages</h2>
          </div>

          {loading ? (
            <div className="loading-state-sm">
              <div className="spinner"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="empty-state-sm">
              <p>No conversations yet.</p>
              <p className="empty-hint">Visit a talent profile to start messaging.</p>
            </div>
          ) : (
            <div className="conversations-list">
              {conversations.map(conv => {
                const otherUser = conv.participants?.find(
                  p => String(p._id) !== String(currentUserId)
                );
                const isSelected = selectedConversation?._id === conv._id;

                return (
                  <div
                    key={conv._id}
                    className={`conversation-item ${isSelected ? 'active' : ''} ${conv.unreadCount > 0 ? 'unread' : ''}`}
                    onClick={() => handleSelectConversation(conv)}
                  >
                    <div className="conversation-avatar">
                      {otherUser?.avatar ? (
                        <img src={otherUser.avatar} alt={otherUser.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {otherUser?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      {conv.unreadCount > 0 && (
                        <span className="unread-dot"></span>
                      )}
                    </div>

                    <div className="conversation-info">
                      <div className="conversation-top">
                        <span className="conversation-name">{otherUser?.name || 'Unknown'}</span>
                        <span className="conversation-time">
                          {conv.lastMessage?.createdAt
                            ? formatTime(conv.lastMessage.createdAt)
                            : formatTime(conv.updatedAt)}
                        </span>
                      </div>
                      <div className="conversation-preview">
                        <span className="preview-text">
                          {conv.lastMessage?.content
                            ? (conv.lastMessage.sender?._id === currentUserId ? 'You: ' : '') +
                              conv.lastMessage.content.substring(0, 40) +
                              (conv.lastMessage.content.length > 40 ? '...' : '')
                            : 'No messages yet'}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="unread-badge">{conv.unreadCount}</span>
                        )}
                      </div>
                    </div>

                    <button
                      className="delete-conversation-btn"
                      onClick={(e) => handleDeleteConversation(conv._id, e)}
                      title="Delete conversation"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          {!selectedConversation ? (
            <div className="chat-empty-state">
              <div className="empty-icon">💬</div>
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the sidebar or visit a talent profile to start messaging.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                {(() => {
                  const otherUser = selectedConversation.participants?.find(
                    p => String(p._id) !== String(currentUserId)
                  );
                  return (
                    <div className="chat-header-user">
                      {otherUser?.avatar ? (
                        <img src={otherUser.avatar} alt={otherUser.name} className="chat-header-avatar" />
                      ) : (
                        <div className="chat-header-avatar-placeholder">
                          {otherUser?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="chat-header-info">
                        <span className="chat-header-name">{otherUser?.name || 'Unknown'}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Messages */}
              <div className="messages-container" ref={messagesContainerRef}>
                {messagesLoading ? (
                  <div className="loading-state-sm">
                    <div className="spinner"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-empty-state-sm">
                    <p>No messages yet. Say hello! 👋</p>
                  </div>
                ) : (
                  <div className="messages-list">
                    {messages.map((msg, index) => {
                      const isMine = String(msg.sender?._id) === String(currentUserId);
                      const showAvatar = index === 0 ||
                        String(messages[index - 1].sender?._id) !== String(msg.sender?._id);

                      return (
                        <div
                          key={msg._id}
                          className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}
                        >
                          {!isMine && showAvatar && (
                            <div className="message-avatar">
                              {msg.sender?.avatar ? (
                                <img src={msg.sender.avatar} alt={msg.sender.name} />
                              ) : (
                                <div className="message-avatar-placeholder">
                                  {msg.sender?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="message-content-wrapper">
                            <div className="message-content">{msg.content}</div>
                            <span className="message-time">{formatTime(msg.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <form className="message-input-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  maxLength={2000}
                  disabled={sending}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!newMessage.trim() || sending}
                >
                  {sending ? '...' : 'Send'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
