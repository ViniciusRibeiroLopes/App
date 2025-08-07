import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Alert,
  Vibration,
  AppState,
} from 'react-native';

import notifee, {
  TimestampTrigger,
  TriggerType,
  AndroidImportance,
  AndroidCategory,
  AndroidVisibility,
  RepeatFrequency
} from '@notifee/react-native';

import Sound from 'react-native-sound';
import BackgroundTimer from 'react-native-background-timer';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

const diasSemana = [
  { abrev: 'Dom', completo: 'Domingo' },
  { abrev: 'Seg', completo: 'Segunda' },
  { abrev: 'Ter', completo: 'Terça' },
  { abrev: 'Qua', completo: 'Quarta' },
  { abrev: 'Qui', completo: 'Quinta' },
  { abrev: 'Sex', completo: 'Sexta' },
  { abrev: 'Sáb', completo: 'Sábado' }
];

const AlarmOverlay = ({ visible, onDismiss, alarmData }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (visible) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      const bounceAnimation = Animated.spring(bounceAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      });

      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );

      pulseAnimation.start();
      bounceAnimation.start();
      rotateAnimation.start();

      const timeInterval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => {
        pulseAnimation.stop();
        rotateAnimation.stop();
        clearInterval(timeInterval);
      };
    } else {
      bounceAnim.setValue(0);
      rotateAnim.setValue(0);
    }
  }, [visible]);

  if (!visible || !alarmData) return null;

  const formatarHorario = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <StatusBar hidden />
      <View style={styles.alarmContainer}>
        <Animated.View 
          style={[
            styles.pulseEffect,
            { transform: [{ scale: pulseAnim }] }
          ]} 
        />
        
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />

        <Animated.View 
          style={[
            styles.contentContainer,
            { transform: [{ scale: bounceAnim }] }
          ]}
        >
          {/* Ícone principal rotativo */}
          <View style={styles.alarmIconContainer}>
            <Animated.View style={[
              styles.iconWrapper,
              { transform: [{ rotate }] }
            ]}>
              <Icon name="alarm" size={isSmallScreen ? 70 : 90} color="#FFFFFF" />
            </Animated.View>
            <Text style={styles.alarmTitle}>ALARME ATIVO</Text>
            <Text style={styles.alarmSubtitle}>Hora do seu medicamento</Text>
          </View>

          {/* Horário atual grande */}
          <View style={styles.timeContainer}>
            <Text style={styles.currentTime}>
              {formatarHorario(currentTime)}
            </Text>
            <Text style={styles.timeLabel}>Horário atual</Text>
          </View>

          {/* Card do medicamento */}
          <View style={styles.medicationCard}>
            <View style={styles.medicationHeader}>
              <MaterialIcons name="medication" size={24} color="#4D97DB" />
              <Text style={styles.medicationTitle}>Medicamento</Text>
            </View>
            
            <View style={styles.medicationDetails}>
              <View style={styles.medicationRow}>
                <Icon name="medical" size={16} color="#10B981" />
                <Text style={styles.medicationName}>
                  {alarmData.remedioNome}
                </Text>
              </View>
              
              <View style={styles.medicationRow}>
                <Icon name="fitness" size={16} color="#F59E0B" />
                <Text style={styles.medicationDose}>
                  {alarmData.dosagem}
                </Text>
              </View>
              
              <View style={styles.medicationRow}>
                <Icon name="time" size={16} color="#6366F1" />
                <Text style={styles.medicationTime}>
                  Horário: {alarmData.horario}
                </Text>
              </View>
            </View>
          </View>

          {/* Botão principal */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Icon name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.dismissButtonText}>
                MEDICAMENTO TOMADO
              </Text>
            </View>
          </TouchableOpacity>

          {/* Indicadores pulsantes */}
          <View style={styles.indicators}>
            <Animated.View style={[styles.indicator, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.indicator, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.indicator, { opacity: pulseAnim }]} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const AlarmSystem = () => {
  const [showAlarm, setShowAlarm] = useState(false);
  const [currentAlarm, setCurrentAlarm] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);
  
  const alarmSound = useRef(null);
  const checkAlarmInterval = useRef(null);

  const uid = auth().currentUser?.uid;

  useEffect(() => {
    if (uid) {
      initializeAlarmSystem();
    }
    
    const handleAppStateChange = (nextAppState) => {
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      cleanup();
      subscription?.remove();
    };
  }, [uid]);

  const initializeAlarmSystem = () => {
    Sound.setCategory('Playback');
    
    alarmSound.current = new Sound('alarm.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Som personalizado não encontrado, usando som padrão');
        alarmSound.current = new Sound('alarm.mp3', Sound.MAIN_BUNDLE);
      }
    });

    startAlarmChecker();
  };

  const startAlarmChecker = () => {
    checkAlarmInterval.current = BackgroundTimer.setInterval(() => {
      checkForAlarms();
    }, 60000); 
    checkForAlarms();
  };

  const checkForAlarms = async () => {
    if (!uid) return;

    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const currentDay = diasSemana[now.getDay()].abrev;

      console.log(`Verificando alarmes: ${currentTime} - ${currentDay}`);

      const snapshot = await firestore()
        .collection('alertas')
        .where('usuarioId', '==', uid)
        .get();

      for (const doc of snapshot.docs) {
        const alarm = doc.data();
        
        if (alarm.horario <= currentTime && 
            alarm.dias.includes(currentDay) &&
            !showAlarm) 
        {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diaStr = new Date().toISOString().slice(0, 10);

            const tomado = await firestore()
                .collection('medicamentos_tomados')
                .where('remedioId', '==', alarm.remedioId)
                .where('horario', '==', alarm.horario)
                .where('dia', '==', diaStr)
                .get();
            
                if (!tomado.empty){
                  continue;
                }
                
            console.log('Alarme encontrado:', alarm);
            
            const remedioDoc = await firestore()
            .collection('remedios')
            .doc(alarm.remedioId)
            .get();

            if (remedioDoc.exists) {
            const remedioData = remedioDoc.data();
            
            const alarmData = {
                ...alarm,
                remedioNome: remedioData.nome,
                id: doc.id
            };

            triggerAlarm(alarmData);
            break;
            }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar alarmes:', error);
    }
  };

  const triggerAlarm = (alarmData) => {
    console.log('Disparando alarme:', alarmData);
    
    setCurrentAlarm(alarmData);
    setShowAlarm(true);
    
    playAlarmSound();
    
    Vibration.vibrate([1000, 500, 1000, 500, 1000], true);
  };

  const playAlarmSound = () => {
    if (alarmSound.current) {
      alarmSound.current.setNumberOfLoops(-1);
      alarmSound.current.setVolume(1.0);
      alarmSound.current.play((success) => {
        if (!success) {
          console.log('Erro ao tocar som do alarme');
          Vibration.vibrate([500, 500, 500, 500], true);
        }
      });
    }
  };

  const stopAlarmSound = () => {
    if (alarmSound.current) {
      alarmSound.current.stop();
    }
    Vibration.cancel();
  };

  const dismissAlarm = () => {
    stopAlarmSound();
    setShowAlarm(false);

    logMedicationTaken();
    
    setCurrentAlarm(null);
  };

  const logMedicationTaken = async () => {
    if (currentAlarm && uid) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diaStr = today.toISOString().slice(0, 10);
        await firestore().collection('medicamentos_tomados').add({
          usuarioId: uid,
          remedioId: currentAlarm.remedioId,
          remedioNome: currentAlarm.remedioNome,
          horario: currentAlarm.horario,
          dosagem: currentAlarm.dosagem,
          dia: diaStr,
        });
        
        console.log('Medicamento registrado como tomado');
        scheduleNextAlarm(currentAlarm);

      } catch (error) {
        console.error('Erro ao registrar medicamento tomado:', error);
      }
    }
  };

  const cleanup = () => {
    if (checkAlarmInterval.current) {
      BackgroundTimer.clearInterval(checkAlarmInterval.current);
    }
    stopAlarmSound();
  };

  const scheduleNextAlarm = async (alarmData) => {
    try {
      const now = new Date();
      const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const hojeIndex = now.getDay();

      let proximoDiaIndex = null;

      for (let i = 1; i <= 7; i++) {
        const idx = (hojeIndex + i) % 7;
        const abrev = diasSemana[idx];
        if (alarmData.dias.includes(abrev)) {
          proximoDiaIndex = idx;
          break;
        }
      }

      if (proximoDiaIndex === null) return;

      const [hora, minuto] = alarmData.horario.split(':').map(Number);
      const proximaData = new Date(now);
      const diffDias = (proximoDiaIndex - hojeIndex + 7) % 7 || 7;
      proximaData.setDate(now.getDate() + diffDias);
      proximaData.setHours(hora, minuto, 0, 0);

      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: proximaData.getTime(),
        repeatFrequency: RepeatFrequency.WEEKLY,
      };

      await notifee.createTriggerNotification(
        {
          title: 'Hora de tomar o remédio',
          body: `Dosagem: ${alarmData.dosagem}`,
          android: {
            channelId: 'alarm-channel',
            category: AndroidCategory.ALARM,
            fullScreenAction: {
              id: 'default',
            },
            pressAction: {
              id: 'default',
              launchActivity: 'default',
            },
            sound: 'default',
            priority: AndroidImportance.MAX,
            visibility: AndroidVisibility.PUBLIC,
            ongoing: true,
            smallIcon: 'ic_launcher',
          },
        },
        trigger
      );

      console.log('🔔 Próxima notificação agendada para:', proximaData);

    } catch (error) {
      console.error('Erro ao agendar próxima notificação:', error);
    }
  };

  if (!uid) return null;

  return (
    <AlarmOverlay
      visible={showAlarm}
      onDismiss={dismissAlarm}
      alarmData={currentAlarm}
    />
  );
};

const styles = StyleSheet.create({
  alarmContainer: {
    flex: 1,
    backgroundColor: '#121A29',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulseEffect: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: 'rgba(77, 151, 219, 0.1)',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: height * 0.1,
    right: width * 0.1,
    width: isSmallScreen ? 60 : 80,
    height: isSmallScreen ? 60 : 80,
    borderRadius: isSmallScreen ? 30 : 40,
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: height * 0.15,
    left: width * 0.1,
    width: isSmallScreen ? 40 : 60,
    height: isSmallScreen ? 40 : 60,
    borderRadius: isSmallScreen ? 20 : 30,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: height * 0.3,
    left: width * 0.05,
    width: isSmallScreen ? 30 : 50,
    height: isSmallScreen ? 30 : 50,
    borderRadius: isSmallScreen ? 15 : 25,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 20 : 30,
    zIndex: 10,
    width: '100%',
  },
  alarmIconContainer: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? 30 : 40,
  },
  iconWrapper: {
    width: isSmallScreen ? 120 : 140,
    height: isSmallScreen ? 120 : 140,
    borderRadius: isSmallScreen ? 60 : 70,
    backgroundColor: 'rgba(77, 151, 219, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(77, 151, 219, 0.4)',
  },
  alarmTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  alarmSubtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? 25 : 30,
    backgroundColor: 'rgba(77, 151, 219, 0.1)',
    paddingVertical: isSmallScreen ? 20 : 25,
    paddingHorizontal: isSmallScreen ? 30 : 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.3)',
  },
  currentTime: {
    fontSize: isSmallScreen ? 36 : 48,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontWeight: '300',
    letterSpacing: -1,
  },
  timeLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#4D97DB',
    fontWeight: '500',
    marginTop: 4,
  },
  medicationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: isSmallScreen ? 20 : 25,
    marginBottom: isSmallScreen ? 30 : 40,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  medicationTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  medicationDetails: {
    gap: 12,
  },
  medicationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  medicationName: {
    fontSize: isSmallScreen ? 16 : 18,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },
  medicationDose: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#D1D5DB',
    fontWeight: '500',
    flex: 1,
  },
  medicationTime: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#D1D5DB',
    fontWeight: '500',
    flex: 1,
  },
  dismissButton: {
    backgroundColor: '#10B981',
    paddingVertical: isSmallScreen ? 16 : 20,
    paddingHorizontal: isSmallScreen ? 30 : 40,
    borderRadius: 25,
    width: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dismissButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  indicators: {
    flexDirection: 'row',
    marginTop: isSmallScreen ? 25 : 30,
    gap: 12,
  },
  indicator: {
    width: isSmallScreen ? 8 : 10,
    height: isSmallScreen ? 8 : 10,
    borderRadius: isSmallScreen ? 4 : 5,
    backgroundColor: '#4D97DB',
  },
});

export default AlarmSystem;