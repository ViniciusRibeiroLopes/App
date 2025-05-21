import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import AntDesign from 'react-native-vector-icons/AntDesign';

const NextButton = ({ percentage, scrollTo }) => {
  const size = 128;
  const strokeWidth = 2;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  const progressAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: percentage,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const strokeDashoffset = progressAnimation.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          <Circle
            stroke="#E6E7E8"
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            fill="white"
          />
          <AnimatedCircle
            stroke="#F4338F"
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="white"
          />
        </G>
      </Svg>

      <TouchableOpacity onPress={scrollTo} style={styles.button} activeOpacity={0.7}>
         <AntDesign name="arrowright" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default NextButton;

const styles = StyleSheet.create({
  container: {
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    position: 'absolute',
    backgroundColor: '#f4338f',
    borderRadius: 100,
    padding: 20,
  },
});
