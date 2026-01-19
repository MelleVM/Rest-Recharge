import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import * as Icons from '@fortawesome/free-solid-svg-icons';

// Create a mapping of icon names to their FA objects
const iconMap = {};
Object.keys(Icons).forEach(key => {
  if (key.startsWith('fa')) {
    const iconName = key.replace(/^fa/, '').toLowerCase();
    iconMap[iconName] = Icons[key];
  }
});

const FAIcon = ({ name, size, color, style }) => {
  // Convert names like "home-outline" to "home"
  const baseName = name.split('-')[0];
  
  // Find the icon in our map
  const icon = iconMap[baseName] || iconMap.question;
  
  return (
    <FontAwesomeIcon 
      icon={icon} 
      size={size} 
      color={color}
      style={style}
    />
  );
};

export default FAIcon;
