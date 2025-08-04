import { useState, useEffect, useRef } from 'react';
import { Send, Plus, Trash2, MessageSquare, Menu, X } from 'lucide-react';

const ChatApp = () => {
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);

  // Загрузка чатов из localStorage
  const loadChats = () => {
    try {
      const savedChats = localStorage.getItem('claude-chats');
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats);
        setChats(parsedChats);
      }
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    }
  };

  // Сохранение чатов в localStorage
  const saveChats = (updatedChats) => {
    try {
      localStorage.setItem('claude-chats', JSON.stringify(updatedChats));
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
  };

  // Загрузка конкретного чата
  const loadChat = (chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChat(chat);
      setCurrentChatId(chatId);
    }
  };

  // Отправка сообщения
  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    let chatId = currentChatId;
    let workingChat = currentChat;
    
    // Создаем новый чат если его нет
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

    // Добавляем сообщение пользователя
    const updatedMessages = [...(workingChat?.messages || []), userMessage];
    const updatedChat = { ...workingChat, messages: updatedMessages };
    
    // Обновляем заголовок если это первое сообщение
    if (updatedChat.title === 'Новый чат') {
      updatedChat.title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
    }

    setCurrentChat(updatedChat);
    setMessage('');
    setIsLoading(true);

    try {
      // Отправляем запрос к API
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

      // Добавляем ответ ассистента
      const finalMessages = [...updatedMessages, assistantMessage];
      const finalChat = { ...updatedChat, messages: finalMessages };
      
      setCurrentChat(finalChat);

      // Обновляем список чатов
      const updatedChats = chats.map(chat => 
        chat.id === chatId ? finalChat : chat
      );
      
      // Если это новый чат, добавляем его в начало списка
      if (!chats.find(chat => chat.id === chatId)) {
        updatedChats.unshift(finalChat);
      }
      
      setChats(updatedChats);
      saveChats(updatedChats);

    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      
      // Показываем сообщение об ошибке
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Оверлей для мобильных устройств */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Боковая панель */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        fixed lg:relative lg:translate-x-0 z-50 lg:z-auto
        w-80 h-full bg-gray-900 text-white flex flex-col
        transition-transform duration-300 ease-in-out
      `}>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4 lg:mb-0">
            <h2 className="text-lg font-semibold">Claude Chat</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-700 rounded"
            >
              <X size={20} />
            </button>
          </div>
          <button
            onClick={createNewChat}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <Plus size={18} />
            Новый чат
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => {
                loadChat(chat.id);
                setSidebarOpen(false);
              }}
              className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors group ${
                currentChatId === chat.id ? 'bg-gray-800' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={16} />
                    <h3 className="font-medium truncate">{chat.title}</h3>
                  </div>
                  {chat.messages.length > 0 && (
                    <p className="text-sm text-gray-400 truncate">
                      {chat.messages[chat.messages.length - 1].content}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => deleteChat(chat.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Основная область */}
      <div className="flex-1 flex flex-col">
        {/* Заголовок */}
        <div className="bg-white border-b p-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:block p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MessageSquare size={20} />
          </button>
          <h1 className="text-xl font-semibold">
            {currentChat?.title || 'Claude Assistant'}
          </h1>
        </div>

        {/* Сообщения */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!currentChat && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
                <h2 className="text-xl font-semibold mb-2">Добро пожаловать в Claude Chat</h2>
                <p>Выберите существующий чат или создайте новый</p>
              </div>
            </div>
          )}

          {currentChat?.messages?.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-2xl px-4 py-2 rounded-lg bg-white border shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Поле ввода */}
        <div className="bg-white border-t p-4">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Введите сообщение..."
              className="flex-1 resize-none border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32"
              rows="1"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!message.trim() || isLoading}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
