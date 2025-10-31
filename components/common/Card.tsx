
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div
      className={`
        bg-white/80 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-lg
        border border-white/50
        transition-all duration-300
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;
