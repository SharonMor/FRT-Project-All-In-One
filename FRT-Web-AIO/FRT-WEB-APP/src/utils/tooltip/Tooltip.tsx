import React from 'react';
import './Tooltip.css';

interface TooltipProps {
  text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text }) => {
  return <div className={text && "tooltip"}>{text}</div>;
};

export default Tooltip;
