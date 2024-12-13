import React from 'react';

interface ImageModalProps {
  src: string;
  alt: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ src, alt, onClose }) => {
  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={alt} className="image-modal-img" />
        <button className="image-modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ImageModal;