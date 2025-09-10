import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FastImage from 'react-native-fast-image';

import OnBoarding from './components/OnBoarding';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/SignupScreen';
import Index from './screens/menus/Index.js';
import UserProfileForm from './screens/forms/FormUser';
import AdicionarRemedio from './screens/forms/FormRemedio';
import AdicionarAlerta from './screens/forms/FormAlerta';
import AlarmSystem from './components/AlarmSystem.js';
import AlertasMenu from './screens/menus/AlertasMenu.js';
import RemediosMenu from './screens/menus/RemediosMenu.js';
import HistoricoMenu from './screens/menus/HistoricoMenu.js';

import DependentesMenu from './screens/menus/dependentes/DependentesMenu.js';
import AdicionarDependente from './screens/forms/dependentes/FormDependentes.js';
import IndexDependentes from './screens/menus/dependentes/IndexDependentes.js';
import HistoricoDependentes from './screens/menus/dependentes/HistoricoDependentes.js';
import AdicionarAlertaDependente from './screens/forms/dependentes/FormAlertaDependentes.js';

import IndexTelaDependente from './screens/telas_dependentes/IndexTelaDependente.js';

import AjudaScreen from './screens/navigation/AjudaScreen.js';

import {View, Image} from 'react-native';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [isDependentUser, setIsDependentUser] = useState<boolean | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [gifDone, setGifDone] = useState(false);
  const [initialAuthCheck, setInitialAuthCheck] = useState(true);

  const [isWaitingForLoginAnimation, setIsWaitingForLoginAnimation] =
    useState(false);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async _user => {
      if (initialAuthCheck) {
        setInitialAuthCheck(false);
        setUser(_user);

        if (_user) {
          await processUserData(_user);
        } else {
          setProfileExists(null);
          setIsDependentUser(null);
        }

        setFirebaseReady(true);
        return;
      }

      if (!user && _user) {
        console.log(
          '🎯 Usuário fez login manual, aguardando animação Lottie...',
        );
        setIsWaitingForLoginAnimation(true);

        await AsyncStorage.setItem('waitingForLoginAnimation', 'true');

        checkForAnimationCompletion();
      }

      setUser(_user);

      if (_user && !isWaitingForLoginAnimation) {
        await processUserData(_user);
      } else if (!_user) {
        setProfileExists(null);
        setIsDependentUser(null);
        setIsWaitingForLoginAnimation(false);
        await AsyncStorage.removeItem('waitingForLoginAnimation');
        await AsyncStorage.removeItem('loginAnimationCompleted');
      }

      setFirebaseReady(true);
    });

    return unsubscribe;
  }, [user, isWaitingForLoginAnimation, initialAuthCheck]);

  const checkForAnimationCompletion = async () => {
    const checkInterval = setInterval(async () => {
      try {
        const animationCompleted = await AsyncStorage.getItem(
          'loginAnimationCompleted',
        );

        if (animationCompleted === 'true') {
          console.log(
            '✅ Animação Lottie concluída, processando dados do usuário...',
          );

          setIsWaitingForLoginAnimation(false);

          await AsyncStorage.removeItem('waitingForLoginAnimation');
          await AsyncStorage.removeItem('loginAnimationCompleted');

          if (user) {
            await processUserData(user);
          }

          clearInterval(checkInterval);
        }
      } catch (error) {
        console.error('Erro ao verificar conclusão da animação:', error);
      }
    }, 500);

    setTimeout(() => {
      clearInterval(checkInterval);
      if (isWaitingForLoginAnimation) {
        console.log('⚠️ Timeout da animação - prosseguindo...');
        setIsWaitingForLoginAnimation(false);
        AsyncStorage.removeItem('waitingForLoginAnimation');
        AsyncStorage.removeItem('loginAnimationCompleted');
      }
    }, 10000);
  };

  const processUserData = async (_user: FirebaseAuthTypes.User) => {
    try {
      const userDoc = await firestore()
        .collection('users')
        .doc(_user.uid)
        .get();
      setProfileExists(userDoc.exists);

      const dependentUserQuery = await firestore()
        .collection('users_dependentes')
        .where('dependenteUid', '==', _user.uid)
        .get();

      setIsDependentUser(!dependentUserQuery.empty);
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
      setProfileExists(false);
      setIsDependentUser(false);
    }
  };

  useEffect(() => {
    const gifDuration = 3000;

    const timer = setTimeout(() => {
      setGifDone(true);
    }, gifDuration);

    return () => clearTimeout(timer);
  }, []);

  if (!firebaseReady || !gifDone) {
    return (
      <View style={{flex: 1, backgroundColor: '#fff'}}>
        <FastImage
          source={require('./images/splash_screen.gif')}
          style={{width: '100%', height: '100%'}}
          resizeMode={FastImage.resizeMode.cover}
        />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          {user && !isWaitingForLoginAnimation ? (
            isDependentUser ? (
              <Stack.Screen
                name="IndexTelaDependente"
                component={IndexTelaDependente}
              />
            ) : profileExists === false ? (
              <Stack.Screen name="UserProfileForm">
                {props => (
                  <UserProfileForm
                    {...props}
                    onProfileCreated={() => setProfileExists(true)}
                  />
                )}
              </Stack.Screen>
            ) : (
              <>
                <Stack.Screen name="Index" component={Index} />
                <Stack.Screen name="AlertasMenu" component={AlertasMenu} />
                <Stack.Screen name="RemediosMenu" component={RemediosMenu} />
                <Stack.Screen name="HistoricoMenu" component={HistoricoMenu} />
                <Stack.Screen
                  name="DependentesMenu"
                  component={DependentesMenu}
                />
                <Stack.Screen
                  name="AdicionarRemedio"
                  component={AdicionarRemedio}
                />
                <Stack.Screen
                  name="AdicionarAlerta"
                  component={AdicionarAlerta}
                />
                <Stack.Screen
                  name="AdicionarDependente"
                  component={AdicionarDependente}
                />

                <Stack.Screen
                  name="IndexDependentes"
                  component={IndexDependentes}
                />
                <Stack.Screen
                  name="HistoricoDependentes"
                  component={HistoricoDependentes}
                />
                <Stack.Screen
                  name="AdicionarAlertaDependente"
                  component={AdicionarAlertaDependente}
                />
                <Stack.Screen name="Ajuda" component={AjudaScreen} />
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

      {user && profileExists && !isDependentUser && <AlarmSystem />}
    </>
  );
}
