import React from 'react';
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  View,
  ViewStyle,
} from 'react-native';

interface LogoProps {
  size?: number;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  source?: ImageSourcePropType;
}

export const Logo: React.FC<LogoProps> = ({
  size = 48,
  style,
  containerStyle,
  source,
}) => {
  const defaultSource = require('@/assets/images/icon.png');

  const imageElement = (
    <Image
      source={source || defaultSource}
      style={[
        {
          width: size,
          height: size,
          resizeMode: 'contain',
        },
        style,
      ]}
    />
  );

  if (containerStyle) {
    return <View style={containerStyle}>{imageElement}</View>;
  }

  return imageElement;
};

export default Logo;
