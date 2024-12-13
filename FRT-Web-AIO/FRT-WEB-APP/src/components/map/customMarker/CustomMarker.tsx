import React, { useState } from 'react';
import { Marker, OverlayView } from '@react-google-maps/api';
import { svgToDataURL } from '../../../utils/svgToDataURL';
import Tooltip from '../../../utils/tooltip/Tooltip';
import './CustomMarker.css';
import { IconSize } from '../../../types/iconSize';
import { iconMap } from '../iconPicker/IconPicker';
import { Marker as MarkerType } from '../../../api/maps';

interface CustomMarkerProps {
  marker: MarkerType,
  showTitle: boolean;
  onClick: () => void;

  getUserDisplayName: (id: string) => string;
}

export type IconKey = keyof typeof iconMap;

const iconSizes = {
  small: 24,
  medium: 32,
  large: 48,
};

const CustomMarker: React.FC<CustomMarkerProps> = ({showTitle, onClick, getUserDisplayName, marker}) => {
  const [isHovered, setIsHovered] = useState(false);

  let markerIcon: google.maps.Icon | undefined;
  const size = iconSizes[IconSize[marker.size]];
  
  if (marker.mark_type && marker.mark_type in iconMap) {
    const IconComponent = iconMap[marker.mark_type].icon;
    const svgElement = <IconComponent size={size} />;
    const svgUrl = svgToDataURL(svgElement);
    markerIcon = {
      url: svgUrl,
      scaledSize: new google.maps.Size(size, size),
    };
  }

  const tooltipContent = `
    ${marker.title}
    Created by: ${getUserDisplayName(marker.user_id)}
  `;
//     Last modified: ${lastModified.toLocaleString()}

const googlePoistion : google.maps.LatLngLiteral = {
  lat: marker.location.latitude,
  lng: marker.location.longitude
}
  return (
    <>
      <Marker
        position={googlePoistion}
        label={!marker.mark_type ? marker.title : undefined}
        icon={marker.mark_type ? markerIcon : undefined}
        onClick={onClick}
        onMouseOver={() => setIsHovered(true)}
        onMouseOut={() => setIsHovered(false)}
        options={{ cursor: 'pointer' }}
      />
      {isHovered && (
        <OverlayView
          position={googlePoistion}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <Tooltip text={tooltipContent} />
          </OverlayView>
      )}
      {showTitle && marker.title && (
        <OverlayView
          position={googlePoistion}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div className="marker-description">
            {marker.title}
          </div>
        </OverlayView>
      )}
    </>
  );
};

export default CustomMarker;