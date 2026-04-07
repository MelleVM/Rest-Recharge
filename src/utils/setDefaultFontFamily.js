import { Text, TextInput } from 'react-native';
import { FONTS } from '../styles/fonts';

export const setDefaultFontFamily = () => {
  // This function is kept for compatibility but the font is now applied via theme
  // and explicit fontFamily in styles throughout the app
  console.log('Font configuration loaded:', FONTS);
};
