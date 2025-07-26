import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import FastImage from 'react-native-fast-image';

import OnBoarding from './components/OnBoarding';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/SignupScreen';
import Index from './screens/index/Index';
import UserProfileForm from './screens/forms/FormUser';
import AdicionarRemedio from './screens/forms/FormRemedio';
import AdicionarAlerta from './screens/forms/FormAlerta';
import AlarmSystem from './components/AlarmSystem.js';

import { View, Image } from 'react-native';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [gifDone, setGifDone] = useState(false);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (_user) => {
      setUser(_user);

      if (_user) {
        const doc = await firestore().collection('users').doc(_user.uid).get();
        setProfileExists(doc.exists);
      } else {
        setProfileExists(null);
      }

      setFirebaseReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const gifDuration = 2300;

    const timer = setTimeout(() => {
      setGifDone(true);
    }, gifDuration);

    return () => clearTimeout(timer);
  }, []);

  if (!firebaseReady || !gifDone) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <FastImage
          source={require('./images/splash_screen.gif')}
          style={{ width: '100%', height: '100%' }}
          resizeMode={FastImage.resizeMode.cover}
        />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          profileExists === false ? (
            <Stack.Screen name="UserProfileForm">
              {(props) => (
                <UserProfileForm {...props} onProfileCreated={() => setProfileExists(true)} />
              )}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Index" component={Index} />
              <Stack.Screen name="AdicionarRemedio" component={AdicionarRemedio} />
              <Stack.Screen name="AdicionarAlerta" component={AdicionarAlerta} />
            </>
          )
        ) : (
          <>
            <Stack.Screen name="OnBoarding" component={OnBoarding} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
        </Stack.Navigator>
      </NavigationContainer>
      
      {user && profileExists && <AlarmSystem />}
    </>
  );
}