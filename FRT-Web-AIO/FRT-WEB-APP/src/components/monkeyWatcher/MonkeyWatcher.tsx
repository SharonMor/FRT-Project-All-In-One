import React, { useRef, useState, useEffect } from "react";
import Avatar from "../../utils/monkey/Avatar.png"
import eye7 from "../../utils/monkey/eye7.png"
import './MonkeyWatcher.css';

const MonkeyWatcher: React.FC<{ mouseCoords: { x: number; y: number } }> = ({ mouseCoords }) => {
  const Orca = useRef<HTMLImageElement>(null);
  const leftEye = useRef<HTMLImageElement>(null);
  const rightEye = useRef<HTMLImageElement>(null);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [angleFromOrca, setAngleFromOrca] = useState(0);

  useEffect(() => {
    if (leftEye.current && rightEye.current) {
      leftEye.current.style.transform = `rotate(${90 + angleFromOrca}deg)`;
      rightEye.current.style.transform = `rotate(${90 + angleFromOrca}deg)`;
    }
  }, [angleFromOrca]);

  useEffect(() => {
    if (Orca.current) {
      const rect = Orca.current.getBoundingClientRect();
      setAnchor({
        x: (rect.left + 500 + rect.width + 20) / 2,
        y: (rect.top + 120 + rect.height + 200) / 2,
      });
    }
    const angleDeg = angle(mouseCoords.x, mouseCoords.y, anchor.x, anchor.y);
    setAngleFromOrca(angleDeg);
  }, [anchor.x, anchor.y, mouseCoords]);

  function angle(cx: number, cy: number, ex: number, ey: number) {
    const dy = ey - cy;
    const dx = ex - cx;
    const rad = Math.atan2(dy, dx);
    const deg = (rad * 180) / Math.PI;
    return deg;
  }

  return (
    <div className="monkey-watcher">
      <div className="monkey-background"></div>
      <img
        ref={Orca}
        alt="orca logo"
        src={Avatar}
        className="monkey-avatar"
      />
      <img
        ref={leftEye}
        alt="left eye ball"
        src={eye7}
        className="monkey-eye left-eye"
      />
      <img
        ref={rightEye}
        alt="right eye ball"
        src={eye7}
        className="monkey-eye right-eye"
      />
    </div>
  );
};

export default MonkeyWatcher;