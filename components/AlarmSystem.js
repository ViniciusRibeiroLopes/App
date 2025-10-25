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

import Sound from 'react-native-sound';
import BackgroundTimer from 'react-native-background-timer';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';

const {width, height} = Dimensions.get('window');

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
 * Tela minimalista para alarme de horário fixo
 */
const AlarmHorarioFixo = ({visible, onDismiss, alarmData}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Animação de entrada
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Pulsação do ícone
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      );

      // Animação do fundo
      const background = Animated.loop(
        Animated.sequence([
          Animated.timing(backgroundAnim, {
            toValue: 1,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(backgroundAnim, {
            toValue: 0,
            duration: 8000,
            useNativeDriver: true,
          }),
        ]),
      );

      // Brilho pulsante
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1.15,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      );

      pulse.start();
      background.start();
      glow.start();

      return () => {
        pulse.stop();
        background.stop();
        glow.stop();
      };
    }
  }, [visible]);

  if (!visible || !alarmData) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Círculos animados de fundo */}
        <Animated.View
          style={[
            styles.backgroundCircle1,
            {
              opacity: backgroundAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.03, 0.08],
              }),
              transform: [
                {
                  scale: backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.backgroundCircle2,
            {
              opacity: backgroundAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.05, 0.03],
              }),
              transform: [
                {
                  scale: backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1.1, 1],
                  }),
                },
              ],
            },
          ]}
        />

        {/* Círculos decorativos estáticos */}
        <View style={[styles.decorativeCircle, styles.decorCircle1]} />
        <View style={[styles.decorativeCircle, styles.decorCircle2]} />
        <View style={[styles.decorativeCircle, styles.decorCircle3]} />

        <Animated.View
          style={[styles.content, {transform: [{scale: scaleAnim}]}]}>
          {/* Ícone com brilho */}
          <Animated.View style={{transform: [{scale: glowAnim}]}}>
            <Animated.View
              style={[styles.iconCircle, {transform: [{scale: pulseAnim}]}]}>
              <Icon name="medical-outline" size={70} color="#10B981" />
            </Animated.View>
          </Animated.View>

          {/* Nome do remédio */}
          <Text style={styles.medicationName}>{alarmData.remedioNome}</Text>

          {/* Dosagem */}
          <View style={styles.doseContainer}>
            <Icon name="fitness-outline" size={20} color="#10B981" />
            <Text style={styles.dosage}>{alarmData.dosagem}</Text>
          </View>

          {/* Horário */}
          <View style={styles.timeContainer}>
            <Icon name="time-outline" size={24} color="#10B981" />
            <Text style={styles.time}>{alarmData.horario}</Text>
          </View>

          {/* Botão */}
          <Animated.View style={{transform: [{scale: pulseAnim}], width: '100%'}}>
            <TouchableOpacity
              style={styles.button}
              onPress={onDismiss}
              activeOpacity={0.9}>
              <View style={styles.buttonContent}>
                <Icon name="checkmark-circle" size={28} color="#FFFFFF" />
                <Text style={styles.buttonText}>TOMEI</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Indicadores */}
          <View style={styles.indicators}>
            <Animated.View
              style={[
                styles.indicator,
                {
                  opacity: pulseAnim,
                  backgroundColor: '#10B981',
                },
              ]}
            />
            <Animated.View
              style={[
                styles.indicator,
                {
                  opacity: pulseAnim,
                  backgroundColor: '#10B981',
                },
              ]}
            />
            <Animated.View
              style={[
                styles.indicator,
                {
                  opacity: pulseAnim,
                  backgroundColor: '#10B981',
                },
              ]}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

/**
 * Tela minimalista para alarme de intervalo (X em X horas)
 */
const AlarmIntervalo = ({visible, onDismiss, alarmData}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animação de entrada
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Pulsação do ícone
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      );

      // Animação do fundo
      const background = Animated.loop(
        Animated.sequence([
          Animated.timing(backgroundAnim, {
            toValue: 1,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(backgroundAnim, {
            toValue: 0,
            duration: 8000,
            useNativeDriver: true,
          }),
        ]),
      );

      // Brilho pulsante
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1.15,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      );

      // Rotação suave do badge
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        }),
      );

      pulse.start();
      background.start();
      glow.start();
      rotate.start();

      return () => {
        pulse.stop();
        background.stop();
        glow.stop();
        rotate.stop();
      };
    }
  }, [visible]);

  if (!visible || !alarmData) return null;

  const rotateInterpolate = rotateAnim.interpolate({
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
      <View style={styles.container}>
        {/* Círculos animados de fundo - cor roxa */}
        <Animated.View
          style={[
            styles.backgroundCircle1,
            {
              backgroundColor: '#6366F1',
              opacity: backgroundAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.03, 0.08],
              }),
              transform: [
                {
                  scale: backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.backgroundCircle2,
            {
              backgroundColor: '#6366F1',
              opacity: backgroundAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.05, 0.03],
              }),
              transform: [
                {
                  scale: backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1.1, 1],
                  }),
                },
              ],
            },
          ]}
        />

        {/* Círculos decorativos estáticos - roxos */}
        <View style={[styles.decorativeCircle, styles.decorCircle1Purple]} />
        <View style={[styles.decorativeCircle, styles.decorCircle2Purple]} />
        <View style={[styles.decorativeCircle, styles.decorCircle3Purple]} />

        <Animated.View
          style={[styles.content, {transform: [{scale: scaleAnim}]}]}>
          {/* Badge de intervalo com rotação */}
          <Animated.View
            style={[
              styles.intervalBadge,
              {transform: [{rotate: rotateInterpolate}]},
            ]}>
            <Icon name="timer-outline" size={20} color="#6366F1" />
          </Animated.View>

          <View style={styles.intervalTextContainer}>
            <Text style={styles.intervalText}>
              A cada {alarmData.intervaloHoras}h
            </Text>
          </View>

          {/* Ícone com brilho */}
          <Animated.View style={{transform: [{scale: glowAnim}]}}>
            <Animated.View
              style={[
                styles.iconCircle,
                styles.iconCirclePurple,
                {transform: [{scale: pulseAnim}]},
              ]}>
              <Icon name="medical-outline" size={70} color="#6366F1" />
            </Animated.View>
          </Animated.View>

          {/* Nome do remédio */}
          <Text style={styles.medicationName}>{alarmData.remedioNome}</Text>

          {/* Dosagem */}
          <View style={styles.doseContainer}>
            <Icon name="fitness-outline" size={20} color="#6366F1" />
            <Text style={styles.dosage}>{alarmData.dosagem}</Text>
          </View>

          {/* Horário de início */}
          <View style={[styles.timeContainer, styles.timeContainerPurple]}>
            <Icon name="time-outline" size={24} color="#6366F1" />
            <Text style={styles.time}>Início: {alarmData.horarioInicio}</Text>
          </View>

          {/* Botão */}
          <Animated.View style={{transform: [{scale: pulseAnim}], width: '100%'}}>
            <TouchableOpacity
              style={[styles.button, styles.buttonPurple]}
              onPress={onDismiss}
              activeOpacity={0.9}>
              <View style={styles.buttonContent}>
                <Icon name="checkmark-circle" size={28} color="#FFFFFF" />
                <Text style={styles.buttonText}>TOMEI</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Indicadores */}
          <View style={styles.indicators}>
            <Animated.View
              style={[
                styles.indicator,
                {
                  opacity: pulseAnim,
                  backgroundColor: '#6366F1',
                },
              ]}
            />
            <Animated.View
              style={[
                styles.indicator,
                {
                  opacity: pulseAnim,
                  backgroundColor: '#6366F1',
                },
              ]}
            />
            <Animated.View
              style={[
                styles.indicator,
                {
                  opacity: pulseAnim,
                  backgroundColor: '#6366F1',
                },
              ]}
            />
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
  const [alarmType, setAlarmType] = useState(null); // 'horario' ou 'intervalo'
  const [appState, setAppState] = useState(AppState.currentState);

  const alarmSound = useRef(null);
  const checkAlarmInterval = useRef(null);
  const lastCheckedMinute = useRef(null);

  const uid = auth().currentUser?.uid;

  useEffect(() => {
    if (uid) {
      initializeAlarmSystem();
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

  const startAlarmChecker = () => {
    checkForAlarms();
    checkAlarmInterval.current = BackgroundTimer.setInterval(() => {
      checkForAlarms();
    }, 10000);
  };

  const checkForAlarms = async () => {
    if (!uid) return;

    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const currentMinute = `${now.getHours()}:${now.getMinutes()}`;
      const currentDay = diasSemana[now.getDay()].abrev;

      if (lastCheckedMinute.current === currentMinute) {
        return;
      }
      lastCheckedMinute.current = currentMinute;

      console.log(`🔍 Verificando alarmes: ${currentTime} - ${currentDay}`);

      // Verificar alarmes de horário fixo
      await checkHorarioFixoAlarms(now, currentTime, currentDay);

      // Verificar alarmes de intervalo
      await checkIntervaloAlarms(now);
    } catch (error) {
      console.error('❌ Erro ao verificar alarmes:', error);
    }
  };

  /**
   * Verifica alarmes de horário fixo
   */
  const checkHorarioFixoAlarms = async (now, currentTime, currentDay) => {
    const snapshot = await firestore()
      .collection('alertas')
      .where('usuarioId', '==', uid)
      .where('tipoAlerta', '==', 'dias')
      .get();

    if (snapshot.empty) return;

    for (const doc of snapshot.docs) {
      const alarm = doc.data();

      if (
        alarm.horario <= currentTime &&
        alarm.dias &&
        alarm.dias.includes(currentDay)
      ) {
        const diaStr = now.toISOString().slice(0, 10);

        const tomadoSnapshot = await firestore()
          .collection('medicamentos_tomados')
          .where('usuarioId', '==', uid)
          .where('horario', '==', alarm.horario)
          .where('dia', '==', diaStr)
          .get();

        if (!tomadoSnapshot.empty) continue;

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

          console.log('🚨 Disparando alarme de horário fixo:', alarmData);
          triggerAlarm(alarmData, 'horario');
          break;
        }
      }
    }
  };

  /**
   * Verifica alarmes de intervalo (X em X horas)
   */
  const checkIntervaloAlarms = async now => {
    const snapshot = await firestore()
      .collection('alertas')
      .where('usuarioId', '==', uid)
      .where('tipoAlerta', '==', 'intervalo')
      .where('ativo', '==', true)
      .get();

    console.log(`📋 Alarmes de intervalo encontrados: ${snapshot.size}`);

    if (snapshot.empty) return;

    for (const doc of snapshot.docs) {
      const alarm = doc.data();
      console.log(`\n🔍 Verificando alarme: ${alarm.remedioNome || 'Sem nome'}`);
      console.log(`   Horário início: ${alarm.horarioInicio}`);
      console.log(`   Intervalo: ${alarm.intervaloHoras}h`);

      // Verificar se deve disparar baseado no horário de início
      const shouldTrigger = await checkIntervaloTiming(alarm, now);

      if (shouldTrigger) {
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

          console.log('🚨 Disparando alarme de intervalo:', alarmData);
          triggerAlarm(alarmData, 'intervalo');
          break;
        }
      }
    }
  };

  /**
   * Verifica se é hora de disparar alarme de intervalo
   */
  const checkIntervaloTiming = async (alarm, now) => {
    try {
      const currentTime = now.getTime();
      const intervaloMs = alarm.intervaloHoras * 60 * 60 * 1000;
      
      // Calcular horário base (horarioInicio de hoje)
      const [hora, minuto] = alarm.horarioInicio.split(':').map(Number);
      const horarioBase = new Date(now);
      horarioBase.setHours(hora, minuto, 0, 0);
      
      // Se o horário base já passou hoje, considera o de ontem
      const horarioBaseOntem = new Date(horarioBase);
      horarioBaseOntem.setDate(horarioBaseOntem.getDate() - 1);
      
      // Verificar qual horário base usar (se já passou ou não)
      let horarioReferencia = horarioBase.getTime();
      if (currentTime < horarioBase.getTime()) {
        // Ainda não chegou o horário de hoje, usa o de ontem como base
        horarioReferencia = horarioBaseOntem.getTime();
      }
      
      // Calcular quanto tempo passou desde o horário de referência
      const tempoDecorrido = currentTime - horarioReferencia;
      
      // Calcular quantas doses já deveriam ter sido tomadas
      const dosesEsperadas = Math.floor(tempoDecorrido / intervaloMs);
      
      // Calcular o horário exato do próximo alarme
      const proximoAlarmeTime = horarioReferencia + (dosesEsperadas * intervaloMs);
      
      // Verificar se estamos na janela de 5 minutos do próximo alarme
      const diffMinutos = (currentTime - proximoAlarmeTime) / 1000 / 60;
      const dentroJanela = diffMinutos >= 0 && diffMinutos <= 5;
      
      if (!dentroJanela) {
        return false;
      }
      
      // Verificar se já foi tomado neste horário específico
      const hoje = new Date(now);
      hoje.setHours(0, 0, 0, 0);
      const diaHojeStr = hoje.toISOString().slice(0, 10);
      
      const horarioEsperado = new Date(proximoAlarmeTime).toTimeString().slice(0, 5);
      
      const tomadosSnapshot = await firestore()
        .collection('medicamentos_tomados')
        .where('usuarioId', '==', uid)
        .where('remedioId', '==', alarm.remedioId)
        .where('dia', '==', diaHojeStr)
        .get();
      
      // Verificar se já foi marcado como tomado neste horário
      const jaFoiTomado = tomadosSnapshot.docs.some(doc => {
        const data = doc.data();
        // Considera tomado se for do mesmo horário (margem de 30 min)
        if (!data.horario) return false;
        
        const [hTomado, mTomado] = data.horario.split(':').map(Number);
        const [hEsperado, mEsperado] = horarioEsperado.split(':').map(Number);
        
        const minutosTomado = hTomado * 60 + mTomado;
        const minutosEsperado = hEsperado * 60 + mEsperado;
        
        const diferenca = Math.abs(minutosTomado - minutosEsperado);
        return diferenca <= 30; // Margem de 30 minutos
      });
      
      if (jaFoiTomado) {
        console.log(`⏭️ Alarme de ${horarioEsperado} já foi tomado`);
        return false;
      }
      
      console.log(`⏰ Disparando alarme de intervalo:`);
      console.log(`   Horário início: ${alarm.horarioInicio}`);
      console.log(`   Intervalo: ${alarm.intervaloHoras}h`);
      console.log(`   Horário esperado: ${horarioEsperado}`);
      console.log(`   Doses esperadas: ${dosesEsperadas + 1}`);
      
      return true;
    } catch (error) {
      console.error('Erro ao verificar timing de intervalo:', error);
      return false;
    }
  };

  const triggerAlarm = (alarmData, type) => {
    if (showAlarm) {
      console.log('Alarme já está ativo');
      return;
    }

    setCurrentAlarm(alarmData);
    setAlarmType(type);
    setShowAlarm(true);

    playAlarmSound();
    Vibration.vibrate([1000, 500, 1000, 500], true);
  };

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

  const stopAlarmSound = () => {
    if (alarmSound.current) {
      alarmSound.current.stop();
    }
    Vibration.cancel();
  };

  const dismissAlarm = () => {
    stopAlarmSound();
    logMedicationTaken();
    setShowAlarm(false);

    setTimeout(() => {
      setCurrentAlarm(null);
      setAlarmType(null);
    }, 500);
  };

  const logMedicationTaken = async () => {
    if (!currentAlarm || !uid) return;

    try {
      const now = new Date();
      const diaStr = now.toISOString().slice(0, 10);
      const timestamp = firestore.FieldValue.serverTimestamp();

      const dados = {
        usuarioId: uid,
        remedioId: currentAlarm.remedioId,
        remedioNome: currentAlarm.remedioNome,
        dosagem: currentAlarm.dosagem,
        dia: diaStr,
        timestamp: timestamp,
      };

      // Adicionar horário específico dependendo do tipo
      if (alarmType === 'horario') {
        dados.horario = currentAlarm.horario;
      } else if (alarmType === 'intervalo') {
        dados.horario = now.toTimeString().slice(0, 5);
        dados.tipoAlerta = 'intervalo';
        dados.intervaloHoras = currentAlarm.intervaloHoras;
      }

      await firestore().collection('medicamentos_tomados').add(dados);

      console.log('✅ Medicamento registrado como tomado');
    } catch (error) {
      console.error('❌ Erro ao registrar medicamento:', error);
    }
  };

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
    <>
      <AlarmHorarioFixo
        visible={showAlarm && alarmType === 'horario'}
        onDismiss={dismissAlarm}
        alarmData={currentAlarm}
      />
      <AlarmIntervalo
        visible={showAlarm && alarmType === 'intervalo'}
        onDismiss={dismissAlarm}
        alarmData={currentAlarm}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    position: 'relative',
  },
  backgroundCircle1: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    borderRadius: width,
    backgroundColor: '#10B981',
    top: -width * 0.8,
    left: -width * 0.5,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: '#10B981',
    bottom: -width * 0.6,
    right: -width * 0.4,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 100,
    zIndex: 1,
  },
  decorCircle1: {
    top: height * 0.15,
    right: width * 0.1,
    width: 80,
    height: 80,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  decorCircle2: {
    bottom: height * 0.2,
    left: width * 0.05,
    width: 60,
    height: 60,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  decorCircle3: {
    top: height * 0.35,
    left: width * 0.1,
    width: 50,
    height: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  decorCircle1Purple: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  decorCircle2Purple: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  decorCircle3Purple: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 20,
    zIndex: 10,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  iconCirclePurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    shadowColor: '#6366F1',
  },
  medicationName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
    marginTop: 8,
  },
  doseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  dosage: {
    fontSize: 20,
    fontWeight: '600',
    color: '#D1D5DB',
    textAlign: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  timeContainerPurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: 'rgba(99, 102, 241, 0.25)',
    shadowColor: '#6366F1',
  },
  time: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 20,
    paddingHorizontal: 50,
    borderRadius: 25,
    width: '100%',
    marginTop: 8,
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.5,
    shadowRadius: 15,
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPurple: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
  },
  intervalBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    shadowColor: '#6366F1',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  intervalTextContainer: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    marginBottom: 8,
  },
  intervalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#A5B4FC',
    letterSpacing: 0.5,
  },
  indicators: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default AlarmSystem;