import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { Calendar, Clipboard } from "lucide-react";
import "./CreateMissionModal.css";
import { useLanguage } from '../../LanguageContext'; // Import useLanguage hook

interface CreateMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mission: { name: string; description: string; publish_to_telegram: boolean, is_attendance: boolean }) => void;
}

const CreateMissionModal: React.FC<CreateMissionModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t, isRTL } = useLanguage(); // Use the language hook
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [publishToTelegram, setPublishToTelegram] = useState(false);
  const [isAttendance, setIsAttendance] = useState(false);

  useEffect(() => {
    if (isAttendance) {
      setPublishToTelegram(true);
    }
  }, [isAttendance]);

  const handleSave = () => {
    onSave({ name, description, publish_to_telegram: publishToTelegram, is_attendance: isAttendance });
    resetForm();
  };

  const resetForm = () => {
    setStep('select');
    setName('');
    setDescription('');
    setPublishToTelegram(false);
    setIsAttendance(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const renderSelectStep = () => (
    <div className="mission-type-selection">
      <h2>{t['select-mission-type']}</h2>
      <div className="mission-type-buttons">
        <button onClick={() => { setIsAttendance(false); setStep('form'); setPublishToTelegram(false); }} className="mission-type-button">
          <Clipboard size={24} />
          {t['regular-mission']}
        </button>
        <button onClick={() => { setIsAttendance(true); setStep('form'); setPublishToTelegram(true); }} className="mission-type-button attendance">
          <Calendar size={24} />
          {t['attendance-mission']}
        </button>
      </div>
    </div>
  );

  const renderForm = () => (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <h2>{isAttendance ? t['create-attendance-mission'] : t['create-regular-mission']}</h2>
      <div>
        <label>{t['name']}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label>{t['description']}</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} required></textarea>
      </div>
      <div className={`checkbox-group ${isAttendance ? 'disabled' : ''}`}>
        <label className="checkbox-container">
          <input
            type="checkbox"
            checked={publishToTelegram}
            onChange={(e) => !isAttendance && setPublishToTelegram(e.target.checked)}
            disabled={isAttendance}
          />
          <span className="checkmark"></span>
          {t['publish-to-telegram']}
          {isAttendance && <span className="info-text">{t['always-published-for-attendance']}</span>}
        </label>
      </div>
      <div className="form-buttons">
        <button type="button" onClick={() => setStep('select')}>{t['back']}</button>
        <button type="submit">{t['save']}</button>
      </div>
    </form>
  );

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose} contentLabel={t['create-mission-modal']} className="modal" overlayClassName="overlay">
      <div className="mission-modal" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <button onClick={handleClose} className="close-button">&times;</button>
        {step === 'select' ? renderSelectStep() : renderForm()}
      </div>
    </Modal>
  );
};

export default CreateMissionModal;