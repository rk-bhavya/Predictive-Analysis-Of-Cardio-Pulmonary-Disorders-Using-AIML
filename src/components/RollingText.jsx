import React, { useState, useEffect } from 'react';

const RollingText = ({ texts }) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(50); // Adjust typing speed

  useEffect(() => {
    const handleTyping = () => {
      const currentText = texts[currentTextIndex];

      if (isDeleting) {
        // If deleting, remove characters one by one
        setDisplayText(prev => prev.slice(0, -1));
        setTypingSpeed(35); // Speed up deletion

        if (displayText === '') {
          // Once the text is fully deleted, switch to the next text
          setIsDeleting(false);
          setCurrentTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
          setTypingSpeed(50); // Slow down for next typing
        }
      } else {
        // If typing, add characters one by one
        setDisplayText(currentText.slice(0, displayText.length + 1));

        if (displayText === currentText) {
          // Pause for a bit once the full text is typed
          setTimeout(() => setIsDeleting(true), 500); // Adjust pause before deleting
        }
      }
    };

    const timeout = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, texts, currentTextIndex, typingSpeed]);

  return (
    <span className="font-bold">
      {displayText}
      <span className="blinking-cursor">|</span> {/* Optional cursor for visual effect */}
    </span>
  );
};

export default RollingText;
