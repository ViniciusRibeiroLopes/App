import React, {useEffect, useState} from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

import OnBoarding from './components/OnBoarding';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/SignupScreen';
import Index from './screens/index/index';
import UserProfileForm from './screens/index/form_user';
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (_user) => {
      setUser(_user);
      if(initializing){
        setInitializing(false);
      }

      if (_user) {
        const doc = await firestore().collection('users').doc(_user.uid).get();
        setProfileExists(doc.exists);
      } else {
        setProfileExists(null);
      }
    });

  return unsubscribe;
}, []);

  if(initializing){
    return(
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size={"large"} color={"#000"}></ActivityIndicator>
      </View>
    )
  }
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          profileExists === false ? (
            <Stack.Screen name="UserProfileForm" component={UserProfileForm} />
          ) : (
            <Stack.Screen name="Index" component={Index} />
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
  );
}