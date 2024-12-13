import React, { useState, useEffect, useRef } from 'react';
import IconPicker from '../iconPicker/IconPicker';
import './MarkerModal.css';
import { IconKey } from '../customMarker/CustomMarker';
import { MarkType, Size } from '../../../api/maps';
import { useLanguage } from '../../../LanguageContext'; // Import useLanguage hook

interface MarkerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, description: string, icon: IconKey | null, iconSize: Size, publishToTelegram: boolean) => void;
  onDelete: () => void;
  initialTitle?: string;
  initialDescription?: string;
  initialIcon?: MarkType | null;
  initialIconSize?: Size;
  initialCreatedBy?: string;
  initialLastModified?: Date;
  getUserDisplayName: (id: string) => string;
  isEdit: boolean;
}

const MarkerModal: React.FC<MarkerModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  initialTitle,
  initialDescription,
  initialIcon,
  initialIconSize,
  initialCreatedBy,
  initialLastModified,
  getUserDisplayName,
  isEdit,
}) => {
  const { t, isRTL } = useLanguage(); // Use the language hook
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<IconKey | null>(null);
  const [iconSize, setIconSize] = useState<Size>(2);
  const [createdBy, setCreatedBy] = useState('');
  const [publishToTelegram, setPublishToTelegram] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle || '');
      setDescription(initialDescription || '');
      setIcon(initialIcon || null);
      setIconSize(initialIconSize || 2);
      setCreatedBy(initialCreatedBy || '');
      setPublishToTelegram(false);
    }
  }, [visible, initialTitle, initialDescription, initialIcon, initialIconSize, initialCreatedBy, initialLastModified]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  const handleSave = () => {
    onSave(title, description, icon, iconSize, publishToTelegram);
  };

  if (!visible) return null;

  return (
    <div className="marker-modal-overlay">
      <div ref={modalRef} className="marker-modal" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <h2 className="marker-modal-title">
          {initialTitle ? t['edit-marker'].replace('{title}', title) : t['add-marker']}
        </h2>

        <div className="marker-input-group">
          <label htmlFor="title">{t['title']}</label>
          <input
            id="title"
            type="text"
            placeholder={t['enter-title']}
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ textAlign: isRTL ? 'right' : 'left' }}
          />
        </div>
        <div className="marker-input-group">
          <label>{t['icon-optional']}</label>
          <IconPicker
            selectedIcon={icon || null}
            onIconSelect={setIcon}
            iconSize={iconSize}
            onSizeChange={setIconSize}
          />
        </div>
        <div className="marker-input-group">
          <label htmlFor="description">{t['description-optional']}</label>
          <textarea
            id="description"
            placeholder={t['enter-description']}
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ textAlign: isRTL ? 'right' : 'left' }}
          />
        </div>
        <div className="marker-input-group">
          <label>{t['created-by'].replace('{name}', getUserDisplayName(createdBy))}</label>
        </div>
        <div className="marker-input-group publish-telegram-checkbox">
          <label>
            <input
              type="checkbox"
              checked={publishToTelegram}
              onChange={e => setPublishToTelegram(e.target.checked)}
            />
            {t['publish-to-telegram']}
          </label>
        </div>
        <div className="marker-modal-buttons">
          <button className="save-button" onClick={handleSave} disabled={!title}>{t['save']}</button>
          <button className="cancel-button" onClick={onClose}>{t['cancel']}</button>
          {isEdit && <button className="delete-button" onClick={onDelete}>{t['delete']}</button>}
        </div>
      </div>
    </div>
  );
};

export default MarkerModal;