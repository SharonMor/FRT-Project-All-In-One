import React, { useState } from 'react';
import { BiSolidTrafficBarrier } from "react-icons/bi";
import { BsFire } from "react-icons/bs";
import { CgDanger } from "react-icons/cg";
import { FaRegCircleQuestion } from "react-icons/fa6";
import { FaCarCrash } from "react-icons/fa";
import { PiRocketLaunchBold } from "react-icons/pi";
import './IconPicker.css';
import { IconSize } from '../../../types/iconSize';
import { IconKey } from '../customMarker/CustomMarker';
import { Size } from '../../../api/maps';
import { LiaTelegram } from "react-icons/lia";
import { ImAidKit } from "react-icons/im";

interface IconPickerProps {
  selectedIcon: IconKey | null;
  onIconSelect: (icon: IconKey | null) => void;
  iconSize: Size;
  onSizeChange: (size: Size) => void;
}

export const iconMap = {
  1: { icon: BiSolidTrafficBarrier, description: 'Barrier' },
  2: { icon: BsFire, description: 'Fire'},
  3: { icon: CgDanger, description: 'Danger' },
  4: { icon: FaRegCircleQuestion, description: 'Question' },
  5: { icon: FaCarCrash, description: 'Car Crash' },
  6: { icon: PiRocketLaunchBold, description: 'Rocket' },
  7: { icon: LiaTelegram, description: 'Telegram'},
  8: { icon: ImAidKit, description: 'SOS'},
} as const;

const iconSizes = {
  [IconSize.small]: 24,
  [IconSize.medium]: 32,
  [IconSize.large]: 48,
};

const IconPicker: React.FC<IconPickerProps> = ({ selectedIcon, onIconSelect, iconSize, onSizeChange }) => {
  const [showTooltip, setShowTooltip] = useState<IconKey | null>(null);

  return (
    <div className="icon-picker-container">
      <div className="icon-picker">
        {Object.entries(iconMap).map(([key, { icon: Icon, description }]) => (
          <div
            key={key}
            className={`icon-picker-item ${selectedIcon === Number(key) ? 'selected' : ''}`}
            onClick={() => onIconSelect(selectedIcon === Number(key) ? null : Number(key) as IconKey)}
            onMouseEnter={() => setShowTooltip(Number(key) as IconKey)}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <Icon size={iconSizes[iconSize]} />
            {showTooltip === Number(key) && (
              <div className="icon-tooltip">{description}</div>
            )}
          </div>
        ))}
      </div>
      <div className="size-selector">
        <label htmlFor="icon-size">Icon size:</label>
        <select 
            id="icon-size"
            value={iconSize}
            onChange={(e) => onSizeChange(Number(e.target.value) as IconSize)}
        >
            {Object.entries(IconSize)
                .filter(([key]) => isNaN(Number(key)))
                .map(([key, value]) => (
                    <option key={key} value={value}>
                        {key.charAt(0).toUpperCase() + key.slice(1)} ({value}px)
                    </option>
                ))
            }
        </select>
      </div>
    </div>
  );
};

export default IconPicker;