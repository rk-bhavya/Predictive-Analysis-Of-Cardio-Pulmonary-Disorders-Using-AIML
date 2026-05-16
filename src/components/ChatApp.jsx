import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faPaperPlane, faMoon, faSun, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { GoogleGenerativeAI } from "@google/generative-ai";

const ShimmerMessage = () => (
  <div className="flex justify-start mb-4 animate-pulse">
    <div className="bg-gray-300 dark:bg-gray-700 rounded-lg p-4 w-3/4 max-w-sm">
      <div className="h-4 bg-gray-400 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-400 dark:bg-gray-600 rounded w-1/2"></div>
    </div>
  </div>
);

const formatGeminiResponse = (response) => {
  return response
    .replace(/\* \*\*(.*?)\*\*:/g, '<li><b>$1:</b></li>')
    .replace(/\* \*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*/g, '')
    .replace(/(?:\r\n|\r|\n)/g, '<br>');
};

const ChatApp = () => {
  const { state } = useLocation();
  const isFreeChat = state?.isFreeChat || false;
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);
  useEffect(() => {
    const initialMesssage = "Hello from your AI health assistant. Upload your X-ray or share symptoms to get insights about heart and lung conditions.";
    setMessages([{ text: initialMesssage, isUser: false }]);
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const handleSendMessage = async () => {
    if (message.trim() || selectedFile) {
      const userMessage = {
        text: message,
        fileUrl: selectedFile ? URL.createObjectURL(selectedFile) : null,
        isUser: true
      };
      setMessages((prev) => [...prev, userMessage]);

      const formData = new FormData();
      formData.append('message', message);
      if (selectedFile) formData.append('file', selectedFile);

      setMessage('');
      setSelectedFile(null);
      setIsLoading(true);

      try {
        if (isFreeChat) {
          const genAI = new GoogleGenerativeAI(process.env.REACT_APP_API_KEY);
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const prompt = `You are an AI health assistant. Provide helpful advice about general health, symptoms, or precautions.
                          Always encourage consulting a doctor for confirmation.`;
          const result = await model.generateContent(prompt + message);
          const gemResponse = result.response.text();
          const formattedResponse = formatGeminiResponse(gemResponse);
          setMessages((prev) => [...prev, { text: formattedResponse, isUser: false }]);
        } else {
          const response = await fetch('http://localhost:8000/predict', {
            method: 'POST',
            body: formData,
            headers: { "Accept": "application/json" },
          });
          if (response.ok) {
            const result = await response.json();
            const formattedResponse = formatGeminiResponse(result.message);
            setMessages((prev) => [...prev, { text: formattedResponse, isUser: false }]);
          } else {
            console.error('Error sending message:', response.statusText);
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let { width, height } = img;

        if (width > height && width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        } else if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          const resizedFile = new File([blob], file.name, { type: 'image/jpeg' });
          setSelectedFile(resizedFile);
        }, 'image/jpeg', 0.7);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const toggleDarkMode = () => setDarkMode((prev) => !prev);
  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 
        bg-gradient-to-r 
        from-[#a8c0ff] via-[#bdb2ff] to-[#ff758c] 
        dark:from-[#2b5876] dark:via-[#4e4376] dark:to-[#2b5876]
        text-black dark:text-white 
        p-3 md:p-4 shadow-md flex justify-between items-center z-10 
        border-b border-gray-200 dark:border-gray-700">

        <h1
          className="text-base sm:text-lg md:text-xl font-semibold tracking-wide hover:cursor-pointer 
          transition-transform duration-200 hover:scale-105"
          onClick={() => navigate("/")}
        >
          Predictive Health Assistant
        </h1>

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full bg-white bg-opacity-30 hover:bg-opacity-40 
          transition duration-300"
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          <FontAwesomeIcon icon={darkMode ? faSun : faMoon} className="text-sm md:text-base" />
        </button>
      </header>

      {/* CHAT AREA */}
      <div className="flex-grow p-4 md:p-6 overflow-y-auto mt-20 md:mt-24 mb-10 md:mb-20">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 md:p-4 rounded-lg shadow-md max-w-xs md:max-w-sm lg:max-w-md 
              ${msg.isUser
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white dark:from-blue-700 dark:to-blue-800'
                : 'bg-white text-gray-800 dark:bg-gray-800 dark:text-white'
              } transition-all duration-300 transform hover:scale-105`}>
              {msg.text && msg.isUser ? (
                <p className="break-words text-sm md:text-base">{msg.text}</p>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: msg.text }} className="break-words text-sm md:text-base" />
              )}
              {msg.fileUrl && (
                <img src={msg.fileUrl} alt="Attachment" className="mt-2 w-full h-auto object-cover rounded-md max-w-xs max-h-60" />
              )}
            </div>
          </div>
        ))}
        {isLoading && <ShimmerMessage />}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-3 md:p-4 bg-white dark:bg-gray-800 shadow-lg 
        border-t border-gray-200 dark:border-gray-700 transition-colors duration-300 z-10">
        <div className="flex flex-wrap items-center space-x-2">
          {!isFreeChat && (
            <label className="flex-shrink-0 flex items-center justify-center w-8 h-8 md:w-10 md:h-10 
              bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer hover:bg-gray-300 
              dark:hover:bg-gray-600 transition duration-300 mb-2 sm:mb-0">
              <FontAwesomeIcon icon={faPaperclip} className="text-gray-600 dark:text-gray-300 text-lg" />
              <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" ref={fileInputRef} />
            </label>
          )}
          {selectedFile && (
            <div className="flex items-center bg-blue-100 dark:bg-blue-900 rounded-full px-2 py-1 text-xs md:text-sm mb-2 sm:mb-0">
              <span className="text-blue-800 dark:text-blue-200 truncate max-w-[100px] md:max-w-xs">
                {selectedFile.name}
              </span>
              <button onClick={removeSelectedFile} className="ml-2 text-blue-800 dark:text-blue-200 hover:text-blue-600 dark:hover:text-blue-400">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          )}
          <div className="flex-grow flex items-center space-x-2">
            <input
              type="text"
              className="w-full border dark:border-gray-600 rounded-full py-2 px-3 md:px-4 
              text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition duration-300"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="flex-shrink-0 bg-blue-500 dark:bg-blue-600 text-white p-2 rounded-full 
              hover:bg-blue-600 dark:hover:bg-blue-700 transition duration-300 flex items-center 
              justify-center w-8 h-8 md:w-10 md:h-10"
              onClick={handleSendMessage}
            >
              <FontAwesomeIcon icon={faPaperPlane} className="text-lg" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
