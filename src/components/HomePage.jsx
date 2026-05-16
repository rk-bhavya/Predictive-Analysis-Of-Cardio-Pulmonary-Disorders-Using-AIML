import React from 'react';
import { useNavigate } from 'react-router-dom';
import RollingText from './RollingText';

const titles = [
  "Doctor Chat Bot",
  "Medical AI Assistant",
  "Health Companion",
  "Virtual Physician",
  "Symptom Analyzer"
];

const HomePage = () => {
  const navigate = useNavigate();

  const goToChatApp = () => {
    navigate('/chat', { state: { isFreeChat: false } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ff6b81] via-[#3b5bdb] to-[#0b132b] flex flex-col items-center justify-center p-6 transition-all duration-500">
      {/* Main Rolling Title */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-8 h-[50px] sm:h-[60px] md:h-[72px] overflow-hidden text-center drop-shadow-lg">
        <RollingText texts={titles} />
      </h1>

      {/* Subheading */}
      <div className="text-center text-white mb-12">
        <p className="text-2xl sm:text-3xl font-semibold">Your Personal AI Assistant</p>
        <p className="text-xl sm:text-2xl mt-2">
          Enhancing <span className="font-bold text-red-300">♥ Heart</span> and{" "}
          <span className="font-bold text-blue-300">🩺 Lung</span> Care
        </p>
      </div>

      {/* Button */}
      <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center">
        <button
          className="w-full bg-white text-[#1f3c88] hover:bg-blue-100 transition-all duration-300 py-4 px-8 rounded-xl font-extrabold text-xl tracking-widest shadow-lg hover:shadow-blue-400/50 uppercase"
          onClick={goToChatApp}
        >
          PREDICT DISEASE
        </button>
      </div>
    </div>
  );
};

export default HomePage;
