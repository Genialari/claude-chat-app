import { useState, useEffect, useRef } from 'react';
import { Send, Plus, Trash2, MessageSquare, Menu, X, Bot, User } from 'lucide-react';

const ChatApp = () => {
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Проверка размера экрана
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Загрузка чатов из localStorage
  const loadChats = () => {
    try {
      if (typeof window !== 'undefined') {
        const savedChats = localStorage.getItem('claude-chats');
        if (savedChats) {
          const parsedChats = JSON.parse(savedChats);
          setChats(parsedChats);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    }
  };

  // Сохранение чатов в localStorage
  const saveChats = (updatedChats) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('claude-chats', JSON.stringify(updatedChats));
      }
    } catch (error) {
      console.error('Ошибка сохранения чатов:', error);
    }
  };

  // Генерация ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Создание нового чата
  const createNewChat = () => {
    const newChat = {
      id: generateId(),
      title: 'Новый чат',
      messages: [],
      createdAt: new Date().toISOString()
    };
    
    const updatedChats = [newChat, ...chats];
    setChats(updatedChats);
    saveChats(updatedChats);
    setCurrentChatId(newChat.id);
    setCurrentChat(newChat);
    setSidebarOpen(false);
  };

  // Загрузка конкретного чата
  const loadChat = (chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChat(chat);
      setCurrentChatId(chatId);
    }
  };

  // Автоматическое изменение высоты textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  // Отправка сообщения
  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    let chatId = currentChatId;
    let workingChat = currentChat;
    
    if (!chatId) {
      const newChat = {
        id: generateId(),
        title: 'Новый чат',
        messages: [],
        createdAt: new Date().toISOString()
      };
      chatId = newChat.id;
      workingChat = newChat;
      setCurrentChatId(chatId);
      setCurrentChat(newChat);
    }

    const userMessage = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...(workingChat?.messages || []), userMessage];
    const updatedChat = { ...workingChat, messages: updatedMessages };
    
    if (updatedChat.title === 'Новый чат') {
      updatedChat.title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
    }

    setCurrentChat(updatedChat);
    setMessage('');
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      const finalChat = { ...updatedChat, messages: finalMessages };
      
      setCurrentChat(finalChat);

      const updatedChats = chats.map(chat => 
        chat.id === chatId ? finalChat : chat
      );
      
      if (!chats.find(chat => chat.id === chatId)) {
        updatedChats.unshift(finalChat);
      }
      
      setChats(updatedChats);
      saveChats(updatedChats);

    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      
      const errorMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Извините, произошла ошибка при отправке сообщения. Проверьте настройки API.',
        timestamp: new Date().toISOString()
      };
      
      const errorMessages = [...updatedMessages, errorMessage];
      const errorChat = { ...updatedChat, messages: errorMessages };
      setCurrentChat(errorChat);
    } finally {
      setIsLoading(false);
    }
  };

  // Удаление чата
  const deleteChat = (chatId, e) => {
    e.stopPropagation();
    const updatedChats = chats.filter(chat => chat.id !== chatId);
    setChats(updatedChats);
    saveChats(updatedChats);
    
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setCurrentChat(null);
    }
  };

  // Прокрутка к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
        .bounce-dot {
          animation: bounce 1.4s infinite ease-in-out;
        }
        .bounce-dot:nth-child(1) { animation-delay: -0.32s; }
        .bounce-dot:nth-child(2) { animation-delay: -0.16s; }
        .bounce-dot:nth-child(3) { animation-delay: 0s; }
      `}</style>
      
      <div style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}>
        {/* Оверлей для мобильных */}
        {sidebarOpen && isMobile && (
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 40
            }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Боковая панель */}
        <div style={{
          width: '320px',
          height: '100%',
          backgroundColor: '#1f2937',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease-in-out',
          position: isMobile ? 'fixed' : 'relative',
          zIndex: 50
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #374151'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={24} color="#60a5fa" />
                <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Claude Chat</h2>
              </div>
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    padding: '4px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <button
              onClick={createNewChat}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#2563eb',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              <Plus size={18} />
              Новый чат
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {chats.length === 0 ? (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: '#9ca3af'
              }}>
                <MessageSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <p style={{ fontSize: '14px', margin: 0 }}>Пока нет чатов</p>
              </div>
            ) : (
              chats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => {
                    loadChat(chat.id);
                    setSidebarOpen(false);
                  }}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #374151',
                    cursor: 'pointer',
                    backgroundColor: currentChatId === chat.id ? '#374151' : 'transparent',
                    borderLeft: currentChatId === chat.id ? '4px solid #3b82f6' : 'none',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (currentChatId !== chat.id) {
                      e.currentTarget.style.backgroundColor = '#374151';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentChatId !== chat.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <MessageSquare size={14} color="#9ca3af" />
                        <h3 style={{
                          fontWeight: '500',
                          fontSize: '14px',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {chat.title}
                        </h3>
                      </div>
                      {chat.messages.length > 0 && (
                        <p style={{
                          fontSize: '12px',
                          color: '#9ca3af',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {chat.messages[chat.messages.length - 1].content.substring(0, 50)}...
                        </p>
                      )}
                      <p style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        margin: '4px 0 0 0'
                      }}>
                        {new Date(chat.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteChat(chat.id, e)}
                      style={{
                        padding: '4px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        opacity: 0
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#4b5563';
                        e.currentTarget.style.opacity = 1;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Основная область */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Заголовок */}
          <div style={{
            backgroundColor: 'white',
            borderBottom: '1px solid #e5e7eb',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Menu size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={24} color="#3b82f6" />
              <h1 style={{
                fontSize: '20px',
                fontWeight: '600',
                margin: 0,
                color: '#1f2937'
              }}>
                {currentChat?.title || 'Claude Assistant'}
              </h1>
            </div>
          </div>

          {/* Сообщения */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!currentChat ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                padding: '32px'
              }}>
                <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                  <Bot size={64} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Добро пожаловать в Claude Chat
                  </h2>
                  <p style={{
                    color: '#6b7280',
                    marginBottom: '24px',
                    lineHeight: '1.5'
                  }}>
                    Выберите существующий чат или создайте новый, чтобы начать общение с AI-ассистентом
                  </p>
                  <button
                    onClick={createNewChat}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <Plus size={18} />
                    Создать новый чат
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                padding: '16px',
                maxWidth: '800px',
                margin: '0 auto',
                width: '100%'
              }}>
                {currentChat.messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <Bot size={48} color="#60a5fa" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Чат создан
                    </h3>
                    <p style={{ color: '#6b7280', margin: 0 }}>Задайте свой первый вопрос</p>
                  </div>
                )}

                {currentChat.messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      marginBottom: '24px',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {msg.role === 'assistant' && (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#dbeafe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Bot size={16} color="#2563eb" />
                      </div>
                    )}
                    
                    <div style={{ maxWidth: '600px', order: msg.role === 'user' ? -1 : 0 }}>
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: '16px',
                        backgroundColor: msg.role === 'user' ? '#2563eb' : 'white',
                        color: msg.role === 'user' ? 'white' : '#1f2937',
                        border: msg.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
                        boxShadow: msg.role === 'assistant' ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)' : 'none',
                        borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                        borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '16px'
                      }}>
                        <p style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.5'
                        }}>
                          {msg.content}
                        </p>
                      </div>
                      <p style={{
                        fontSize: '12px',
                        color: '#9ca3af',
                        margin: '4px 0 0 0',
                        textAlign: msg.role === 'user' ? 'right' : 'left'
                      }}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>

                    {msg.role === 'user' && (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <User size={16} color="#6b7280" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '24px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#dbeafe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Bot size={16} color="#2563eb" />
                    </div>
                    <div style={{ maxWidth: '600px' }}>
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: '16px',
                        borderBottomLeftRadius: '4px',
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="bounce-dot" style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#9ca3af',
                            borderRadius: '50%'
                          }} />
                          <div className="bounce-dot" style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#9ca3af',
                            borderRadius: '50%'
                          }} />
                          <div className="bounce-dot" style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#9ca3af',
                            borderRadius: '50%'
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Поле ввода */}
          <div style={{
            backgroundColor: 'white',
            borderTop: '1px solid #e5e7eb',
            padding: '16px'
          }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '12px'
              }}>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Введите сообщение..."
                  style={{
                    flex: 1,
                    resize: 'none',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#1f2937',
                    minHeight: '24px',
                    maxHeight: '120px',
                    fontFamily: 'inherit',
                    fontSize: '14px'
                  }}
                  rows="1"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!message.trim() || isLoading}
                  style={{
                    padding: '8px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: message.trim() && !isLoading ? 'pointer' : 'not-allowed',
                    opacity: message.trim() && !isLoading ? 1 : 0.5,
                    flexShrink: 0
                  }}
                >
                  <Send size={18} />
                </button>
              </div>
              <p style={{
                fontSize: '12px',
                color: '#9ca3af',
                margin: '8px 0 0 0',
                textAlign: 'center'
              }}>
                Нажмите Enter для отправки, Shift+Enter для новой строки
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatApp;
