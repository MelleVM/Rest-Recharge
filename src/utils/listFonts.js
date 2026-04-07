import { Platform, Text } from 'react-native';

export const listAvailableFonts = () => {
  if (Platform.OS === 'ios') {
    // On iOS, we can check if fonts load by trying to use them
    const testFonts = [
      'Archivo',
      'Archivo-Regular',
      'Archivo-Medium',
      'Archivo-SemiBold',
      'Archivo-Bold',
      'Archivo_400Regular',
      'Archivo_500Medium',
      'Archivo_600SemiBold',
      'Archivo_700Bold',
    ];
    
    console.log('Testing font names on iOS:');
    testFonts.forEach(font => {
      console.log(`- ${font}`);
    });
  }
};
