import React, {useEffect, useState, useRef} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Vibration,
  AppState,
} from 'react-native';

import notifee, {
  TriggerType,
  AndroidImportance,
  AndroidCategory,
  AndroidVisibility,
  RepeatFrequency,
} from '@notifee/react-native';

import Sound from 'react-native-sound';
import BackgroundTimer from 'react-native-background-timer';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const {width, height} = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

const diasSemana = [
  {abrev: 'Dom', completo: 'Domingo'},
  {abrev: 'Seg', completo: 'Segunda'},
  {abrev: 'Ter', completo: 'Terça'},
  {abrev: 'Qua', completo: 'Quarta'},
  {abrev: 'Qui', completo: 'Quinta'},
  {abrev: 'Sex', completo: 'Sexta'},
  {abrev: 'Sáb', completo: 'Sábado'},
];

/**
 * Componente AlarmOverlay - Tela cheia que aparece quando alarme dispara
 */
const AlarmOverlay = ({visible, onDismiss, alarmData}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (visible) {
      // Animação de pulsação
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
        ]),
      );

      // Animação de bounce
      const bounceAnimation = Animated.spring(bounceAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      });

      // Animação de rotação
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      );

      pulseAnimation.start();
      bounceAnimation.start();
      rotateAnimation.start();

      // Atualizar hora a cada segundo
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
  }, [visible, pulseAnim, bounceAnim, rotateAnim]);

  if (!visible || !alarmData) return null;

  const formatarHorario = date => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <StatusBar hidden />
      <View style={styles.alarmContainer}>
        {/* Efeito de pulsação de fundo */}
        <Animated.View
          style={[styles.pulseEffect, {transform: [{scale: pulseAnim}]}]}
        />

        {/* Círculos decorativos */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />

        {/* Conteúdo principal */}
        <Animated.View
          style={[styles.contentContainer, {transform: [{scale: bounceAnim}]}]}>
          {/* Ícone principal rotativo */}
          <View style={styles.alarmIconContainer}>
            <Animated.View
              style={[styles.iconWrapper, {transform: [{rotate}]}]}>
              <Icon
                name="alarm"
                size={isSmallScreen ? 70 : 90}
                color="#FFFFFF"
              />
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
                <Text style={styles.medicationDose}>{alarmData.dosagem}</Text>
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
            activeOpacity={0.8}>
            <View style={styles.buttonContent}>
              <Icon name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.dismissButtonText}>MEDICAMENTO TOMADO</Text>
            </View>
          </TouchableOpacity>

          {/* Indicadores pulsantes */}
          <View style={styles.indicators}>
            <Animated.View style={[styles.indicator, {opacity: pulseAnim}]} />
            <Animated.View style={[styles.indicator, {opacity: pulseAnim}]} />
            <Animated.View style={[styles.indicator, {opacity: pulseAnim}]} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

/**
 * Componente AlarmSystem - Gerencia alarmes e notificações
 */
const AlarmSystem = () => {
  const [showAlarm, setShowAlarm] = useState(false);
  const [currentAlarm, setCurrentAlarm] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);

  const alarmSound = useRef(null);
  const checkAlarmInterval = useRef(null);
  const lastCheckedMinute = useRef(null);

  const uid = auth().currentUser?.uid;

  /**
   * Inicialização do sistema de alarmes
   */
  useEffect(() => {
    if (uid) {
      initializeAlarmSystem();
      createNotificationChannels();
    }

    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
      if (nextAppState === 'active' && uid) {
        checkForAlarms();
      }
    });

    return () => {
      cleanup();
      subscription?.remove();
    };
  }, [uid]);

  /**
   * Cria os canais de notificação
   */
  const createNotificationChannels = async () => {
    try {
      await notifee.createChannel({
        id: 'alarm-channel',
        name: 'Alarmes de Medicamentos',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });

      await notifee.createChannel({
        id: 'general-channel',
        name: 'Notificações Gerais',
        importance: AndroidImportance.DEFAULT,
      });

      console.log('✅ Canais de notificação criados');
    } catch (error) {
      console.error('Erro ao criar canais:', error);
    }
  };

  /**
   * Inicializa o sistema de alarmes
   */
  const initializeAlarmSystem = () => {
    Sound.setCategory('Playback');

    alarmSound.current = new Sound('alarm.mp3', Sound.MAIN_BUNDLE, error => {
      if (error) {
        console.log('Erro ao carregar som:', error);
        alarmSound.current = null;
      } else {
        console.log('Som carregado com sucesso');
      }
    });

    startAlarmChecker();
  };

  /**
   * Inicia o verificador de alarmes
   */
  const startAlarmChecker = () => {
    // Verifica imediatamente
    checkForAlarms();

    // Verifica a cada 30 segundos
    checkAlarmInterval.current = BackgroundTimer.setInterval(() => {
      checkForAlarms();
    }, 30000);
  };

  /**
   * Verifica se há alarmes para disparar
   */
  const checkForAlarms = async () => {
    if (!uid) return;

    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const currentMinute = `${now.getHours()}:${now.getMinutes()}`;
      const currentDay = diasSemana[now.getDay()].abrev;

      // Evita verificações duplicadas no mesmo minuto
      if (lastCheckedMinute.current === currentMinute) {
        return;
      }
      lastCheckedMinute.current = currentMinute;

      console.log(`🔍 Verificando alarmes: ${currentTime} - ${currentDay}`);

      const snapshot = await firestore()
        .collection('alertas')
        .where('usuarioId', '==', uid)
        .get();

      if (snapshot.empty) {
        console.log('Nenhum alarme cadastrado');
        return;
      }

      for (const doc of snapshot.docs) {
        const alarm = doc.data();

        // Verificar se o horário corresponde e se o dia está incluído
        if (
          alarm.horario === currentTime &&
          alarm.dias &&
          alarm.dias.includes(currentDay)
        ) {
          const diaStr = now.toISOString().slice(0, 10);

          // Verificar se já foi tomado hoje
          const tomadoSnapshot = await firestore()
            .collection('medicamentos_tomados')
            .where('remedioId', '==', alarm.remedioId)
            .where('horario', '==', alarm.horario)
            .where('dia', '==', diaStr)
            .get();

          if (!tomadoSnapshot.empty) {
            console.log('Medicamento já foi tomado hoje');
            continue;
          }

          // Buscar dados do remédio
          const remedioDoc = await firestore()
            .collection('remedios')
            .doc(alarm.remedioId)
            .get();

          if (remedioDoc.exists) {
            const remedioData = remedioDoc.data();

            const alarmData = {
              ...alarm,
              remedioNome: remedioData.nome,
              id: doc.id,
            };

            console.log('🚨 Disparando alarme:', alarmData);
            triggerAlarm(alarmData);
            break;
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao verificar alarmes:', error);
    }
  };

  /**
   * Dispara o alarme
   */
  const triggerAlarm = alarmData => {
    if (showAlarm) {
      console.log('Alarme já está ativo');
      return;
    }

    setCurrentAlarm(alarmData);
    setShowAlarm(true);

    // SEM notificação - apenas som, vibração e tela cheia
    playAlarmSound();
    Vibration.vibrate([1000, 500, 1000, 500], true);
  };

  /**
   * Toca o som do alarme
   */
  const playAlarmSound = () => {
    if (alarmSound.current) {
      alarmSound.current.setNumberOfLoops(-1);
      alarmSound.current.setVolume(1.0);
      alarmSound.current.play(success => {
        if (!success) {
          console.log('Erro ao tocar som');
        }
      });
    }
  };

  /**
   * Para som e vibração
   */
  const stopAlarmSound = () => {
    if (alarmSound.current) {
      alarmSound.current.stop();
    }
    Vibration.cancel();
  };

  /**
   * Desativa o alarme
   */
  const dismissAlarm = () => {
    stopAlarmSound();
    logMedicationTaken();
    setShowAlarm(false);

    // Reseta após um pequeno delay
    setTimeout(() => {
      setCurrentAlarm(null);
    }, 500);
  };

  /**
   * Registra medicamento tomado
   */
  const logMedicationTaken = async () => {
    if (!currentAlarm || !uid) return;

    try {
      const now = new Date();
      const diaStr = now.toISOString().slice(0, 10);
      const timestamp = firestore.FieldValue.serverTimestamp();

      await firestore().collection('medicamentos_tomados').add({
        usuarioId: uid,
        remedioId: currentAlarm.remedioId,
        remedioNome: currentAlarm.remedioNome,
        horario: currentAlarm.horario,
        dosagem: currentAlarm.dosagem,
        dia: diaStr,
        timestamp: timestamp,
      });

      console.log('✅ Medicamento registrado como tomado');
      scheduleNextAlarm(currentAlarm);
    } catch (error) {
      console.error('❌ Erro ao registrar medicamento:', error);
    }
  };

  /**
   * Agenda próxima verificação (sem notificação agendada)
   */
  const scheduleNextAlarm = async alarmData => {
    try {
      // Apenas loga - o sistema continuará verificando automaticamente
      console.log('✅ Sistema continuará verificando alarmes automaticamente');
      console.log(
        '📋 Próximo alarme será disparado no horário:',
        alarmData.horario,
      );
    } catch (error) {
      console.error('Erro ao processar próximo alarme:', error);
    }
  };

  /**
   * Limpa recursos
   */
  const cleanup = () => {
    if (checkAlarmInterval.current) {
      BackgroundTimer.clearInterval(checkAlarmInterval.current);
      checkAlarmInterval.current = null;
    }
    stopAlarmSound();
    if (alarmSound.current) {
      alarmSound.current.release();
      alarmSound.current = null;
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
    shadowOffset: {width: 0, height: 4},
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
