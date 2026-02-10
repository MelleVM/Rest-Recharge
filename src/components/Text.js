import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { FONTS } from '../styles/fonts';

const Text = ({ style, children, ...props }) => {
  return (
    <RNText style={[styles.defaultText, style]} {...props}>
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  defaultText: {
    fontFamily: FONTS.regular,
  },
});

export default Text;
