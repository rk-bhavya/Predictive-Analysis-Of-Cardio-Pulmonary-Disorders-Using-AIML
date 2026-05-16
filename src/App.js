import React from 'react';
import ChatApp from './components/ChatApp';
import HomePage from './components/HomePage';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route for HomePage */}
        <Route path="/" element={<HomePage />} />

        {/* Route for ChatApp */}
        <Route path="/chat" element={<ChatApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
