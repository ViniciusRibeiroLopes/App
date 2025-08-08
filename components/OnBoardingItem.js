import React, {useState} from 'react';
import {View, Text, StyleSheet, useWindowDimensions} from 'react-native';
import LottieView from 'lottie-react-native';

const OnBoardingItem = ({item}) => {
  const {width} = useWindowDimensions();
  const [animationError, setAnimationError] = useState(false);

  console.log('OnBoardingItem - item recebido:', item);

  if (!item) {
    return (
      <View style={[styles.container, {width, backgroundColor: 'red'}]}>
        <Text style={styles.errorText}>Item não encontrado</Text>
      </View>
    );
  }

  const handleAnimationFailure = error => {
    console.warn('Erro ao carregar animação:', error);
    setAnimationError(true);
  };

  return (
    <View style={[styles.container, {width}]}>
      <View style={styles.animationContainer}>
        {!animationError ? (
          <LottieView
            source={item.animation}
            autoPlay
            loop
            style={styles.animation}
            resizeMode="contain"
            onAnimationFailure={handleAnimationFailure}
          />
        ) : (
          <View style={styles.animationFallback}>
            <Text style={styles.fallbackEmoji}>
              {item.id === '1' ? '💊' : item.id === '2' ? '👨‍👩‍👧‍👦' : '🏥'}
            </Text>
            <Text style={styles.fallbackText}>Slide {item.id}</Text>
          </View>
        )}
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );
};

export default OnBoardingItem;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  animationContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
  },

  animation: {
    width: 350,
    height: 350,
  },

  animationFallback: {
    width: 280,
    height: 280,
    backgroundColor: '#333',
    borderRadius: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },

  fallbackEmoji: {
    fontSize: 100,
    marginBottom: 15,
  },

  fallbackText: {
    color: '#cac7df',
    fontSize: 20,
    fontWeight: 'bold',
  },

  textContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  title: {
    fontWeight: '800',
    fontSize: 32,
    marginBottom: 20,
    color: '#cac7df',
    textAlign: 'center',
    lineHeight: 38,
  },

  description: {
    fontWeight: '400',
    fontSize: 18,
    color: '#62656b',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 26,
  },

  errorText: {
    color: 'white',
    fontSize: 20,
    textAlign: 'center',
  },
});
