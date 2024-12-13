import React from 'react';
import { useLanguage } from '../../LanguageContext';
import { MdLanguage } from "react-icons/md";
import './languagePicker.css'


const LanguagePicker: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="language-picker-container">
    <MdLanguage className='world-icon'/>
<select 
        value={language} 
        onChange={(e) => setLanguage(e.target.value as 'en' | 'he')}
        className="language-picker"
      >
        <option value="en">EN</option>
        <option value="he">HE</option>
      </select>
    </div>
  );
};

export default LanguagePicker;