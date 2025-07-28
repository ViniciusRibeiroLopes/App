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

const { width, height } = Dimensions.get('window');

const diasSemana = [
  { abrev: 'Dom', completo: 'Domingo' },
  { abrev: 'Seg', completo: 'Segunda' },
  { abrev: 'Ter', completo: 'Terça' },
  { abrev: 'Qua', completo: 'Quarta' },
  { abrev: 'Qui', completo: 'Quinta' },
  { abrev: 'Sex', completo: 'Sexta' },
  { abrev: 'Sáb', completo: 'Sábado' }
];

const AlarmOverlay = ({ visible, onDismiss, onSnooze, alarmData }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (visible) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      const bounceAnimation = Animated.spring(bounceAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      });

      pulseAnimation.start();
      bounceAnimation.start();

      const timeInterval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => {
        pulseAnimation.stop();
        clearInterval(timeInterval);
      };
    } else {
      bounceAnim.setValue(0);
    }
  }, [visible]);

  if (!visible || !alarmData) return null;

  const formatarHorario = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

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

        <Animated.View 
          style={[
            styles.contentContainer,
            { transform: [{ scale: bounceAnim }] }
          ]}
        >
          <View style={styles.alarmIconContainer}>
            <Text style={styles.alarmIcon}>⏰</Text>
            <Text style={styles.alarmTitle}>ALARME</Text>
          </View>

          <View style={styles.medicationInfo}>
            <Text style={styles.medicationTitle}>
              Hora do Medicamento!
            </Text>
            <View style={styles.medicationCard}>
              <Text style={styles.medicationName}>
                💊 {alarmData.remedioNome}
              </Text>
              <Text style={styles.medicationDose}>
                📋 {alarmData.dosagem}
              </Text>
              <Text style={styles.medicationTime}>
                🕐 {alarmData.horario}
              </Text>
            </View>
          </View>

          <Text style={styles.currentTime}>
            {formatarHorario(currentTime)}
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissButtonText}>
                ✓ MEDICAMENTO TOMADO
              </Text>
            </TouchableOpacity>

            <View style={styles.snoozeButtons}>
              <TouchableOpacity
                style={styles.snoozeButton}
                onPress={() => onSnooze(5)}
                activeOpacity={0.8}
              >
                <Text style={styles.snoozeButtonText}>
                  💤 5 min
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.snoozeButton}
                onPress={() => onSnooze(10)}
                activeOpacity={0.8}
              >
                <Text style={styles.snoozeButtonText}>
                  💤 10 min
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.indicators}>
            <View style={styles.indicator} />
            <View style={styles.indicator} />
            <View style={styles.indicator} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const SnoozeOverlay = ({ visible, timeLeft, onCancel }) => {
  if (!visible) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <View style={styles.snoozeContainer}>
        <View style={styles.snoozeContent}>
          <Text style={styles.snoozeIcon}>😴</Text>
          <Text style={styles.snoozeTitle}>Soneca Ativa</Text>
          <Text style={styles.snoozeTimer}>
            {formatTime(timeLeft)}
          </Text>
          <Text style={styles.snoozeSubtitle}>
            O alarme tocará novamente em breve
          </Text>
          <TouchableOpacity
            style={styles.cancelSnoozeButton}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelSnoozeButtonText}>
              Cancelar Soneca
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const AlarmSystem = () => {
  const [showAlarm, setShowAlarm] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);
  const [currentAlarm, setCurrentAlarm] = useState(null);
  const [snoozeTimeLeft, setSnoozeTimeLeft] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState);
  
  const alarmSound = useRef(null);
  const checkAlarmInterval = useRef(null);
  const snoozeTimeout = useRef(null);
  const snoozeInterval = useRef(null);

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
            !showAlarm && 
            !showSnooze) 
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

  const snoozeAlarm = (minutes) => {
    stopAlarmSound();
    setShowAlarm(false);
    setShowSnooze(true);
    setSnoozeTimeLeft(minutes * 60);
    

    snoozeTimeout.current = setTimeout(() => {
      setShowSnooze(false);
      setSnoozeTimeLeft(0);
      if (currentAlarm) {
        triggerAlarm(currentAlarm);
      }
    }, minutes * 60 * 1000);

    snoozeInterval.current = setInterval(() => {
      setSnoozeTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(snoozeInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelSnooze = () => {
    if (snoozeTimeout.current) {
      clearTimeout(snoozeTimeout.current);
    }
    if (snoozeInterval.current) {
      clearInterval(snoozeInterval.current);
    }
    
    setShowSnooze(false);
    setSnoozeTimeLeft(0);
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
    if (snoozeTimeout.current) {
      clearTimeout(snoozeTimeout.current);
    }
    if (snoozeInterval.current) {
      clearInterval(snoozeInterval.current);
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
          body: `Dosagem: ${dosagem}`,
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
    <>
      <AlarmOverlay
        visible={showAlarm}
        onDismiss={dismissAlarm}
        onSnooze={snoozeAlarm}
        alarmData={currentAlarm}
      />
      
      <SnoozeOverlay
        visible={showSnooze}
        timeLeft={snoozeTimeLeft}
        onCancel={cancelSnooze}
      />
    </>
  );
};

const styles = StyleSheet.create({
  alarmContainer: {
    flex: 1,
    backgroundColor: '#d32f2f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseEffect: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    borderRadius: width,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 10,
  },
  alarmIconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  alarmIcon: {
    fontSize: 100,
    marginBottom: 10,
  },
  alarmTitle: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  medicationInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  medicationTitle: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  medicationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    minWidth: width * 0.8,
  },
  medicationName: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  medicationDose: {
    fontSize: 20,
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  medicationTime: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
  },
  currentTime: {
    fontSize: 24,
    color: '#ffffff',
    fontFamily: 'monospace',
    marginBottom: 40,
    opacity: 0.8,
  },
  actionButtons: {
    width: '100%',
    alignItems: 'center',
  },
  dismissButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 20,
    minWidth: width * 0.8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  dismissButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  snoozeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  snoozeButton: {
    backgroundColor: '#ff9800',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 20,
    flex: 0.45,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  snoozeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  indicators: {
    flexDirection: 'row',
    marginTop: 30,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 5,
  },

  // Estilos da Soneca
  snoozeContainer: {
    flex: 1,
    backgroundColor: '#ff9800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  snoozeContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  snoozeIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  snoozeTitle: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  snoozeTimer: {
    fontSize: 48,
    color: '#ffffff',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  snoozeSubtitle: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.9,
  },
  cancelSnoozeButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  cancelSnoozeButtonText: {
    color: '#ff9800',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AlarmSystem;