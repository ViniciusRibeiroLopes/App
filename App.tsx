import React, {useEffect, useState} from 'react';
import {PermissionsAndroid, Platform, Linking, Alert} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import FastImage from 'react-native-fast-image';
import notifee, {
  AndroidImportance,
  AndroidVisibility,
} from '@notifee/react-native';

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

import PerfilScreen from './screens/navigation/PerfilScreen.js';
import ConfigScreen from './screens/navigation/ConfigScreen.js';
import {View, AppState} from 'react-native';

const Stack = createNativeStackNavigator();

/**
 * Inicializa os canais de notificação do Firebase Cloud Messaging
 * Deve ser chamado uma única vez na inicialização do app
 */
const initializeNotificationChannels = async () => {
  console.log('🚀 Initializing notification channels...');
  try {
    // Canal para alarmes de medicamentos
    console.log('⚙️ Creating alarm channel...');
    const alarmChannel = await notifee.createChannel({
      id: 'alarm-channel',
      name: 'Alarmes de Medicação',
      description: 'Notificações de lembretes de medicamentos',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
      lights: true,
      lightColor: '#4D97DB',
      vibration: true,
    });
    console.log('✅ Alarm channel created:', alarmChannel);

    // Canal para notificações gerais
    await notifee.createChannel({
      id: 'general-channel',
      name: 'Notificações Gerais',
      description: 'Notificações gerais do PillCheck',
      importance: AndroidImportance.DEFAULT,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
    });

    // Canal para notificações urgentes
    await notifee.createChannel({
      id: 'urgent-channel',
      name: 'Notificações Urgentes',
      description: 'Alertas urgentes do sistema',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
      lights: true,
      lightColor: '#E53E3E',
      vibration: true,
    });

    console.log('✅ Canais de notificação inicializados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar canais de notificação:', error);
  }
};

/**
 * Configura listeners para eventos de notificação
 */
const setupNotificationListeners = () => {
  try {
    // Listener para quando o app está em foreground
    notifee.onForegroundEvent(({type}) => {
      console.log('Evento de notificação em foreground:', type);
    });

    // Listener para quando o app está em background/closed
    notifee.onBackgroundEvent(async ({type}) => {
      console.log('Evento de notificação em background:', type);
    });
  } catch (error) {
    console.error('❌ Erro ao configurar listeners de notificação:', error);
  }
};

async function requestAlarmPermissions() {
  if (Platform.OS === 'android') {
    try {
      // 1. Permissão de notificações
      const notifPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );

      console.log('📱 Permissão de notificação:', notifPermission);

      // 2. Verificar se precisa de permissão para alarmes exatos (Android 12+)
      if (Platform.Version >= 31) {
        const canScheduleExactAlarms = await notifee.requestPermission();

        if (!canScheduleExactAlarms) {
          Alert.alert(
            '⏰ Permissão Necessária',
            'Para que os alarmes funcionem com o app fechado, você precisa permitir "Alarmes e lembretes" nas configurações.',
            [
              {text: 'Cancelar', style: 'cancel'},
              {
                text: 'Abrir Configurações',
                onPress: () => {
                  Linking.openSettings();
                },
              },
            ],
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao solicitar permissões:', error);
      return false;
    }
  }
  return true;
}

export default function App() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [isDependentUser, setIsDependentUser] = useState<boolean | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [gifDone, setGifDone] = useState(false);
  const [initialAuthCheck, setInitialAuthCheck] = useState(true);
  const [appState, setAppState] = useState(AppState.currentState);

  // Inicializar sistema de notificações apenas uma vez
  useEffect(() => {
    let mounted = true;

    const initNotifications = async () => {
      try {
        await initializeNotificationChannels();
        setupNotificationListeners();
      } catch (error) {
        console.error('Erro ao inicializar notificações:', error);
      }
    };

    if (mounted) {
      initNotifications();
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Monitorar estado do app
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log('App state changed:', appState, '->', nextAppState);
      setAppState(nextAppState);
    });

    return () => {
      subscription?.remove();
    };
  }, [appState]);

  // Listener de autenticação
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;

    const setupAuth = async () => {
      try {
        unsubscribe = auth().onAuthStateChanged(async _user => {
          if (!mounted) {return;}

          console.log(
            'Auth state changed:',
            _user ? 'Logged in' : 'Logged out',
          );

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

          setUser(_user);

          if (_user) {
            await processUserData(_user);
          } else {
            setProfileExists(null);
            setIsDependentUser(null);
          }

          setFirebaseReady(true);
        });
      } catch (error) {
        console.error('Erro ao configurar auth listener:', error);
        if (mounted) {
          setFirebaseReady(true);
        }
      }
    };

    setupAuth();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [initialAuthCheck]);

  useEffect(() => {
    requestAlarmPermissions();
  }, []);

  const processUserData = async (_user: FirebaseAuthTypes.User) => {
    try {
      console.log('Processing user data for:', _user.uid);

      // Verificar perfil do usuário
      const userDoc = await firestore()
        .collection('users')
        .doc(_user.uid)
        .get();

      const exists = userDoc.exists;
      console.log('User profile exists:', exists);
      setProfileExists(exists);

      // Verificar se é dependente
      const dependentUserQuery = await firestore()
        .collection('users_dependentes')
        .where('dependenteUid', '==', _user.uid)
        .limit(1)
        .get();

      const isDependent = !dependentUserQuery.empty;
      console.log('Is dependent user:', isDependent);
      setIsDependentUser(isDependent);
    } catch (error) {
      console.error('Erro ao processar dados do usuário:', error);
      setProfileExists(false);
      setIsDependentUser(false);
    }
  };

  // Timer para o GIF de splash
  useEffect(() => {
    const gifDuration = 3000;

    const timer = setTimeout(() => {
      console.log('Splash screen completed');
      setGifDone(true);
    }, gifDuration);

    return () => clearTimeout(timer);
  }, []);

  // Splash screen
  if (!firebaseReady || !gifDone) {
    return (
      // eslint-disable-next-line react-native/no-inline-styles
      <View style={{flex: 1, backgroundColor: '#fff'}}>
        <FastImage
          source={require('./images/splash_screen.gif')}
          // eslint-disable-next-line react-native/no-inline-styles
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
          {user ? (
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
                <Stack.Screen name="Perfil" component={PerfilScreen} />
                <Stack.Screen name="Configuracoes" component={ConfigScreen} />
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

      {/* Componente de alarme ativo apenas para usuários autenticados com perfil */}
      {user && profileExists && !isDependentUser && <AlarmSystem />}
    </>
  );
}
