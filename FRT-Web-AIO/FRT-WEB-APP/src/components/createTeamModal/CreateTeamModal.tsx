import React, { useState, useEffect } from "react";
import './CreateTeamModal.css';
import { useLanguage } from '../../LanguageContext';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (teamName: string) => void;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [teamName, setTeamName] = useState('');
    const { t, isRTL } = useLanguage();
    
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamName.trim()) {
            alert(t["team-name-required"]);
            return;
        }
        
        onSubmit(teamName);
        setTeamName(''); // Reset the input
        onClose(); // Close modal on submit
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <span className="close" onClick={onClose}>&times;</span>
                <h2 style={{ direction: isRTL ? 'rtl' : 'ltr' }}>{t["create-team"]}</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder={t["team-name-placeholder"]}
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        required
                        style={{ direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                    />
                    <button type="submit">{t["create-team-button"]}</button>
                </form>
            </div>
        </div>
    );
};

export default CreateTeamModal;