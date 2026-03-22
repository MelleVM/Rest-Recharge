import { Platform } from 'react-native';

export const FONTS = {
  regular: 'Archivo-Regular',
  medium: 'Archivo-Medium',
  semiBold: 'Archivo-SemiBold',
  bold: 'Archivo-Bold',
};

export const getFontFamily = (weight = 'regular') => {
  const weightMap = {
    '400': FONTS.regular,
    '500': FONTS.medium,
    '600': FONTS.semiBold,
    '700': FONTS.bold,
    'normal': FONTS.regular,
    'bold': FONTS.bold,
    'regular': FONTS.regular,
    'medium': FONTS.medium,
    'semibold': FONTS.semiBold,
  };
  
  return weightMap[weight] || FONTS.regular;
};
