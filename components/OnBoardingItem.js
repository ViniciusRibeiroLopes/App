import React from 'react';
import { View, Text, StyleSheet, Image, useWindowDimensions } from 'react-native';

const OnBoardingItem = ({ item }) => {
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.container, { width }]}>
      <Image
        source={item.image}
        style={[styles.image, { width, resizeMode: 'contain' }]}
      />

      <View>
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
  },

  image: {
    flex: 0.7,
    justifyContent: 'center',
  },

  title: {
    fontWeight: '800',
    fontSize: 28,
    marginBottom: 10,
    color: '#cac7dfff',
    textAlign: 'center',
  },

  description: {
    fontWeight: '300',
    color: '#62656b',
    textAlign: 'center',
    paddingHorizontal: 64,
  },
});