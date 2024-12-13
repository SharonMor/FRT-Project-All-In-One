import React, { useState } from "react";
import { Link } from "react-router-dom";
import useUser from "../../hooks/useUser";
import {  BsArrowRightShort } from "react-icons/bs";
// import MonkeyWatcher from "../../components/MonkeyWatcher";
import MonkeyWatcher from "../monkeyWatcher/MonkeyWatcher";
import _ from "lodash";
import './HomePage.css';
import { useLanguage } from "../../LanguageContext";

const HomePage: React.FC = () => {
  const { user } = useUser();
  const { t } = useLanguage(); 
  const [isHovered, setIsHovered] = useState(false);
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });

  const updateMouseLocationOnMouseMove = _.debounce((event: React.MouseEvent) => {
    setMouseCoords({
      x: event.clientX,
      y: event.clientY,
    });
  }, 1);

  return (
    <div onMouseMove={updateMouseLocationOnMouseMove} className="homepage ">
      <div className="text-center">
        <div className="hero">
          <h1>FRT Project</h1>
          <p>{t["coordinate-efficiently"]}</p>
          <MonkeyWatcher mouseCoords={mouseCoords} />
        </div>
        
        <Link
          to={user ? "/teams" : "/login"}
          className={`cta-button ${isHovered ? 'hovered' : ''}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <span className={`cta-text ${isHovered ? 'hovered' : ''}`}>
          {user ? t["teams"] : t["login"]}
          </span>
          <BsArrowRightShort className={`cta-arrow ${isHovered ? 'visible' : ''}`} />
        </Link>
      </div>

    </div>
  );
};

export default HomePage;