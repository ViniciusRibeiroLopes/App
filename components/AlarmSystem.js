// AlarmSystem.js
import React, {useEffect, useState, useRef, useCallback} from 'react';
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
  NativeModules,
  Platform,
  DeviceEventEmitter,
} from 'react-native';

import Sound from 'react-native-sound';
import BackgroundTimer from 'react-native-background-timer';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';

import notifee, {
  AndroidImportance,
  AndroidCategory,
  EventType,
  AndroidStyle,
  TriggerType,
} from '@notifee/react-native';

const MedicationModule = NativeModules;

const windowDimensions = Dimensions.get('window');

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
  }, [visible, scaleAnim, pulseAnim, backgroundAnim, glowAnim]);

  if (!visible || !alarmData) {return null;}

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
          <Animated.View
            // eslint-disable-next-line react-native/no-inline-styles
            style={{transform: [{scale: pulseAnim}], width: '100%'}}>
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
                // eslint-disable-next-line react-native/no-inline-styles
                {
                  opacity: pulseAnim,
                  backgroundColor: '#10B981',
                },
              ]}
            />
            <Animated.View
              style={[
                styles.indicator,
                // eslint-disable-next-line react-native/no-inline-styles
                {
                  opacity: pulseAnim,
                  backgroundColor: '#10B981',
                },
              ]}
            />
            <Animated.View
              style={[
                styles.indicator,
                // eslint-disable-next-line react-native/no-inline-styles
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
  }, [visible, scaleAnim, pulseAnim, backgroundAnim, glowAnim, rotateAnim]);

  if (!visible || !alarmData) {return null;}

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
            // eslint-disable-next-line react-native/no-inline-styles
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
            // eslint-disable-next-line react-native/no-inline-styles
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
          <Animated.View
            // eslint-disable-next-line react-native/no-inline-styles
            style={{transform: [{scale: pulseAnim}], width: '100%'}}>
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
                // eslint-disable-next-line react-native/no-inline-styles
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

// Função para criar canal de notificação
async function createNotificationChannel() {
  try {
    const channelId = await notifee.createChannel({
      id: 'alarm-channel',
      name: 'Alarmes de Medicação',
      sound: 'default',
      importance: AndroidImportance.HIGH,
      vibration: true,
      lights: true,
      bypassDnd: true,
    });
    return channelId;
  } catch (error) {
    console.error('❌ Erro ao criar canal:', error);
    return 'alarm-channel';
  }
}

async function showMedicationNotification(id, title, body, alarmData) {
  console.log('📱 Exibindo notificação persistente:', {
    id,
    title,
    body,
  });

  try {
    const channelId = await createNotificationChannel();

    await notifee.displayNotification({
      id,
      title,
      body,
      android: {
        channelId,
        smallIcon: '@drawable/icon',
        category: AndroidCategory.ALARM,
        // CONFIGURAÇÕES CRÍTICAS PARA NÃO SER DESCARTÁVEL
        ongoing: true,
        autoCancel: false,
        onlyAlertOnce: false,
        showTimestamp: true,
        timestamp: Date.now(),
        sound: 'default',
        importance: AndroidImportance.HIGH,
        // REMOVER esta linha que causa o erro:
        // timeoutAfter: 0,
        localOnly: true,
        visibility: 1,
        fullScreenAction: {
          id: 'default',
          launchActivity: 'default',
        },
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        actions: [
          {
            title: '✅ Tomei o medicamento',
            pressAction: {
              id: 'confirm',
              launchActivity: 'default',
            },
          },
        ],
        style: {
          type: AndroidStyle.BIGTEXT,
          text: body,
        },
      },
      data: {
        id: String(id || ''),
        remedioId: String(alarmData?.remedioId || ''),
        remedioNome: String(alarmData?.remedioNome || ''),
        dosagem: String(alarmData?.dosagem || ''),
        tipoAlerta: String(alarmData?.tipoAlerta || ''),
        horario: String(alarmData?.horario || ''),
        intervaloHoras: String(alarmData?.intervaloHoras || ''),
        persistent: 'true',
      },
    });
    console.log(
      '✅ Notificação persistente não-descartável exibida com sucesso',
    );
  } catch (error) {
    console.error('❌ Erro ao exibir notificação:', error);
  }
}

// Função para agendar notificação com trigger
async function scheduleNotification(id, title, body, triggerDate, alarmData) {
  console.log('📅 Agendando notificação:', {
    id,
    title,
    body,
    triggerDate,
  });

  try {
    const channelId = await createNotificationChannel();

    // Criar o trigger corretamente tipado
    const trigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerDate.getTime(),
      alarmManager: {
        allowWhileIdle: true,
      },
    };

    await notifee.createTriggerNotification(
      {
        id,
        title,
        body,
        android: {
          channelId,
          smallIcon: 'ic_launcher', // Certifique-se que este ícone existe
          category: AndroidCategory.ALARM,
          ongoing: true,
          autoCancel: false,
          sound: 'default',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          actions: [
            {
              title: '✅ Tomei o medicamento',
              pressAction: {
                id: 'confirm',
              },
            },
          ],
          style: {
            type: AndroidStyle.BIGTEXT,
            text: body,
          },
        },
        data: {
          id: String(id || ''),
          remedioId: String(alarmData?.remedioId || ''),
          remedioNome: String(alarmData?.remedioNome || ''),
          dosagem: String(alarmData?.dosagem || ''),
          tipoAlerta: String(alarmData?.tipoAlerta || ''),
          horario: String(alarmData?.horario || ''),
          intervaloHoras: String(alarmData?.intervaloHoras || ''),
        },
      },
      trigger,
    );

    console.log('✅ Notificação agendada com sucesso para:', triggerDate);
  } catch (error) {
    console.error('❌ Erro ao agendar notificação:', error);
    throw error; // Re-lançar para tratamento upstream
  }
}

// Função para cancelar todas as notificações agendadas
async function cancelAllScheduledNotifications() {
  try {
    const notifications = await notifee.getTriggerNotifications();
    console.log(`🗑️ Cancelando ${notifications.length} notificações agendadas`);

    for (const notification of notifications) {
      await notifee.cancelNotification(notification.notification.id);
    }
    console.log('✅ Todas as notificações agendadas foram canceladas');
  } catch (error) {
    console.error('❌ Erro ao cancelar notificações:', error);
  }
}

// Função para registrar handlers de notificação
function registerMedicationHandler(callback) {
  console.log('🎯 Registrando handlers de notificação...');

  // Registrar handler de foreground
  const foregroundSubscription = notifee.onForegroundEvent(
    async ({type, detail}) => {
      console.log('📱 Evento foreground recebido:', {type, detail});
      try {
        if (type === EventType.ACTION_PRESS || type === EventType.PRESS) {
          console.log('👆 Action press detectada');
          const {pressAction, notification} = detail;
          if (pressAction && pressAction.id === 'confirm') {
            console.log('✅ Ação de confirmação pressionada');
            const notifData = notification?.data;
            if (notifData) {
              console.log('💊 Dados da notificação:', notifData);
              await callback(notifData);
              // Cancelar a notificação após confirmação
              if (notification?.id) {
                await notifee.cancelNotification(notification.id);
              }
            }
          }
        }
      } catch (err) {
        console.error('❌ Erro no handler foreground:', err);
      }
    },
  );

  // Registrar handler de background
  let backgroundSubscription;
  try {
    console.log('🌙 Configurando handler de background...');
    backgroundSubscription = notifee.onBackgroundEvent(
      async ({type, detail}) => {
        console.log('🌙 Evento background recebido:', {type, detail});
        try {
          if (type === EventType.ACTION_PRESS || type === EventType.PRESS) {
            console.log('👆 Action press em background detectada');
            const {pressAction, notification} = detail;
            if (pressAction && pressAction.id === 'confirm') {
              console.log('✅ Ação de confirmação em background pressionada');
              const notifData = notification?.data;
              if (notifData) {
                console.log(
                  '💊 Dados da notificação em background:',
                  notifData,
                );
                await callback(notifData);
                console.log('✅ Callback de background executado com sucesso');
                // Cancelar a notificação após confirmação
                if (notification?.id) {
                  await notifee.cancelNotification(notification.id);
                }
              }
            }
          }
        } catch (err) {
          console.error('❌ Erro no handler background:', err);
        }
      },
    );
  } catch (err) {
    console.error('❌ Falha ao registrar handler de background:', err);
  }

  // Retorna função de cleanup
  return () => {
    try {
      if (foregroundSubscription) {
        foregroundSubscription();
      }
      if (backgroundSubscription) {
        backgroundSubscription();
      }
    } catch (err) {
      console.warn('Erro ao desregistrar handlers:', err);
    }
  };
}

/**
 * Componente AlarmSystem - Gerencia alarmes e notificações
 */
const AlarmSystem = () => {
  const [showAlarm, setShowAlarm] = useState(false);
  const [currentAlarm, setCurrentAlarm] = useState(null);
  const [alarmType, setAlarmType] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);

  const alarmSound = useRef(null);
  const checkAlarmInterval = useRef(null);
  const lastCheckedMinute = useRef(null);

  const uid = auth().currentUser?.uid;

  // Formata minuto com zero à esquerda
  const formatHourMinute = date => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Agendar notificações do dia
  const scheduleAllNotifications = useCallback(async () => {
    if (!uid) return;

    console.log('📅 Iniciando agendamento de notificações do dia...');

    try {
      // Cancelar todas as notificações agendadas anteriormente
      await cancelAllScheduledNotifications();

      const now = new Date();
      const hoje = new Date(now);
      hoje.setHours(0, 0, 0, 0);

      // Agendar alarmes de horário fixo
      await scheduleHorarioFixoNotifications(now, hoje);

      // Agendar alarmes de intervalo
      await scheduleIntervaloNotifications(now, hoje);

      console.log('✅ Todas as notificações foram agendadas com sucesso');
    } catch (error) {
      console.error('❌ Erro ao agendar notificações:', error);
    }
  }, [scheduleHorarioFixoNotifications, scheduleIntervaloNotifications, uid]);

  // Agendar notificações de horário fixo
  const scheduleHorarioFixoNotifications = useCallback(
    async (now, hoje) => {
      try {
        const currentDay = diasSemana[now.getDay()].abrev;
        const diaHojeStr = hoje.toISOString().slice(0, 10);

        const snapshot = await firestore()
          .collection('alertas')
          .where('usuarioId', '==', uid)
          .where('tipoAlerta', '==', 'dias')
          .get();

        console.log(`📋 Encontrados ${snapshot.size} alarmes de horário fixo`);

        for (const doc of snapshot.docs) {
          const alarm = doc.data();

          // Verificar se o alarme é para hoje
          if (alarm.dias && alarm.dias.includes(currentDay)) {
            const [hora, minuto] = String(alarm.horario).split(':').map(Number);
            const triggerDate = new Date(hoje);
            triggerDate.setHours(hora, minuto || 0, 0, 0);

            // Só agendar se for no futuro
            if (triggerDate > now) {
              // Verificar se já foi tomado
              const tomadoSnapshot = await firestore()
                .collection('medicamentos_tomados')
                .where('usuarioId', '==', uid)
                .where('horario', '==', alarm.horario)
                .where('dia', '==', diaHojeStr)
                .get();

              if (tomadoSnapshot.empty) {
                const remedioDoc = await firestore()
                  .collection('remedios')
                  .doc(alarm.remedioId)
                  .get();

                if (remedioDoc.exists) {
                  const remedioData = remedioDoc.data();
                  const notifId = `horario-${doc.id}-${alarm.horario}`;

                  await scheduleNotification(
                    notifId,
                    '💊 Hora de tomar seu medicamento',
                    `${remedioData?.nome || ''} - ${alarm.dosagem || ''}`,
                    triggerDate,
                    {
                      ...alarm,
                      remedioNome: remedioData?.nome || '',
                      id: doc.id,
                      tipoAlerta: 'dias',
                    },
                  );

                  console.log(
                    `✅ Notificação agendada: ${remedioData?.nome} às ${alarm.horario}`,
                  );
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(
          '❌ Erro ao agendar notificações de horário fixo:',
          error,
        );
      }
    },
    [uid],
  );

  // Agendar notificações de intervalo
  const scheduleIntervaloNotifications = useCallback(
    async (now, hoje) => {
      try {
        const snapshot = await firestore()
          .collection('alertas')
          .where('usuarioId', '==', uid)
          .where('tipoAlerta', '==', 'intervalo')
          .where('ativo', '==', true)
          .get();

        console.log(`📋 Encontrados ${snapshot.size} alarmes de intervalo`);

        for (const doc of snapshot.docs) {
          const alarm = doc.data();

          if (!alarm.horarioInicio || !alarm.intervaloHoras) continue;

          const [hora, minuto] = String(alarm.horarioInicio)
            .split(':')
            .map(Number);
          const intervaloMs = alarm.intervaloHoras * 60 * 60 * 1000;

          // Calcular primeira dose do dia
          let proximaDose = new Date(hoje);
          proximaDose.setHours(hora, minuto || 0, 0, 0);

          // Agendar doses até o fim do dia
          const fimDia = new Date(hoje);
          fimDia.setHours(23, 59, 59, 999);

          let contador = 0;
          while (proximaDose <= fimDia && contador < 24) {
            if (proximaDose > now) {
              const horarioFormatado = proximaDose.toTimeString().slice(0, 5);
              const diaHojeStr = hoje.toISOString().slice(0, 10);

              // Verificar se já foi tomado
              const tomadoSnapshot = await firestore()
                .collection('medicamentos_tomados')
                .where('usuarioId', '==', uid)
                .where('remedioId', '==', alarm.remedioId)
                .where('dia', '==', diaHojeStr)
                .get();

              const jaFoiTomado = tomadoSnapshot.docs.some(tomadoDoc => {
                const tomadoData = tomadoDoc.data();
                if (!tomadoData.horario) return false;

                const [hTomado, mTomado] = String(tomadoData.horario)
                  .split(':')
                  .map(Number);
                const [hEsperado, mEsperado] = String(horarioFormatado)
                  .split(':')
                  .map(Number);

                const minutosTomado = (hTomado || 0) * 60 + (mTomado || 0);
                const minutosEsperado =
                  (hEsperado || 0) * 60 + (mEsperado || 0);

                return Math.abs(minutosTomado - minutosEsperado) <= 30;
              });

              if (!jaFoiTomado) {
                const remedioDoc = await firestore()
                  .collection('remedios')
                  .doc(alarm.remedioId)
                  .get();

                if (remedioDoc.exists) {
                  const remedioData = remedioDoc.data();
                  const notifId = `intervalo-${doc.id}-${horarioFormatado}`;

                  await scheduleNotification(
                    notifId,
                    '💊 Hora de tomar seu medicamento',
                    `${remedioData?.nome || ''} - ${
                      alarm.dosagem || ''
                    } (A cada ${alarm.intervaloHoras}h)`,
                    proximaDose,
                    {
                      ...alarm,
                      remedioNome: remedioData?.nome || '',
                      horario: horarioFormatado,
                      id: doc.id,
                      tipoAlerta: 'intervalo',
                    },
                  );

                  console.log(
                    `✅ Notificação de intervalo agendada: ${remedioData?.nome} às ${horarioFormatado}`,
                  );
                }
              }
            }

            proximaDose = new Date(proximaDose.getTime() + intervaloMs);
            contador++;
          }
        }
      } catch (error) {
        console.error('❌ Erro ao agendar notificações de intervalo:', error);
      }
    },
    [uid],
  );

  // Inicializa som e inicia verificação
  const initializeAlarmSystem = useCallback(() => {
    try {
      if (Sound && Sound.setCategory) {
        try {
          if (Platform.OS === 'ios') {
            Sound.setCategory('Playback');
          }
        } catch (e) {
          // ignora se não suportado
        }
      }

      alarmSound.current = new Sound('alarm.mp3', Sound.MAIN_BUNDLE, error => {
        if (error) {
          console.log('Erro ao carregar som:', error);
          alarmSound.current = null;
        } else {
          console.log('Som carregado com sucesso');
        }
      });

      startAlarmChecker();
    } catch (e) {
      console.error('Erro initializeAlarmSystem:', e);
    }
  }, [startAlarmChecker]);

  const startAlarmChecker = useCallback(() => {
    if (checkAlarmInterval.current) {
      return;
    }

    checkForAlarms();
    checkAlarmInterval.current = BackgroundTimer.setInterval(() => {
      checkForAlarms();
    }, 10000);
  }, [checkForAlarms]);

  const stopAlarmChecker = useCallback(() => {
    if (checkAlarmInterval.current) {
      BackgroundTimer.clearInterval(checkAlarmInterval.current);
      checkAlarmInterval.current = null;
    }
  }, []);

  const checkForAlarms = useCallback(async () => {
    if (!uid) return;

    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const currentMinute = formatHourMinute(now);
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
  }, [checkHorarioFixoAlarms, checkIntervaloAlarms, uid]);

  const checkHorarioFixoAlarms = useCallback(
    async (now, currentTime, currentDay) => {
      try {
        const snapshot = await firestore()
          .collection('alertas')
          .where('usuarioId', '==', uid)
          .where('tipoAlerta', '==', 'dias')
          .get();

        if (snapshot.empty) return;

        for (const doc of snapshot.docs) {
          const alarm = doc.data();

          if (
            alarm.horario &&
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
                remedioNome: remedioData?.nome || '',
                id: doc.id,
              };

              console.log('🚨 Disparando alarme de horário fixo:', alarmData);
              triggerAlarm(alarmData, 'horario');
              break;
            }
          }
        }
      } catch (e) {
        console.error('Erro em checkHorarioFixoAlarms:', e);
      }
    },
    [triggerAlarm, uid],
  );

  const checkIntervaloAlarms = useCallback(
    async now => {
      try {
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
          console.log(
            `\n🔍 Verificando alarme: ${alarm.remedioNome || 'Sem nome'}`,
          );

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
                remedioNome: remedioData?.nome || '',
                id: doc.id,
              };

              console.log('🚨 Disparando alarme de intervalo:', alarmData);
              triggerAlarm(alarmData, 'intervalo');
              break;
            }
          }
        }
      } catch (e) {
        console.error('Erro em checkIntervaloAlarms:', e);
      }
    },
    [checkIntervaloTiming, triggerAlarm, uid],
  );

  const checkIntervaloTiming = useCallback(
    async (alarm, now) => {
      try {
        if (!alarm || !alarm.horarioInicio || !alarm.intervaloHoras) {
          return false;
        }

        const currentTime = now.getTime();
        const intervaloMs = alarm.intervaloHoras * 60 * 60 * 1000;

        const [hora, minuto] = String(alarm.horarioInicio)
          .split(':')
          .map(Number);
        const horarioBase = new Date(now);
        horarioBase.setHours(hora, minuto || 0, 0, 0);

        const horarioBaseOntem = new Date(horarioBase);
        horarioBaseOntem.setDate(horarioBaseOntem.getDate() - 1);

        let horarioReferencia = horarioBase.getTime();
        if (currentTime < horarioBase.getTime()) {
          horarioReferencia = horarioBaseOntem.getTime();
        }

        const tempoDecorrido = currentTime - horarioReferencia;
        const dosesEsperadas = Math.floor(tempoDecorrido / intervaloMs);
        const proximoAlarmeTime =
          horarioReferencia + dosesEsperadas * intervaloMs;

        const diffMinutos = (currentTime - proximoAlarmeTime) / 1000 / 60;
        const dentroJanela = diffMinutos >= 0 && diffMinutos <= 5;

        if (!dentroJanela) {
          return false;
        }

        const hoje = new Date(now);
        hoje.setHours(0, 0, 0, 0);
        const diaHojeStr = hoje.toISOString().slice(0, 10);

        const horarioEsperado = new Date(proximoAlarmeTime)
          .toTimeString()
          .slice(0, 5);

        const tomadosSnapshot = await firestore()
          .collection('medicamentos_tomados')
          .where('usuarioId', '==', uid)
          .where('remedioId', '==', alarm.remedioId)
          .where('dia', '==', diaHojeStr)
          .get();

        const jaFoiTomado = tomadosSnapshot.docs.some(doc => {
          const data = doc.data();
          if (!data.horario) return false;

          const [hTomado, mTomado] = String(data.horario)
            .split(':')
            .map(Number);
          const [hEsperado, mEsperado] = String(horarioEsperado)
            .split(':')
            .map(Number);

          const minutosTomado = (hTomado || 0) * 60 + (mTomado || 0);
          const minutosEsperado = (hEsperado || 0) * 60 + (mEsperado || 0);

          const diferenca = Math.abs(minutosTomado - minutosEsperado);
          return diferenca <= 30;
        });

        if (jaFoiTomado) {
          console.log(`⏭️ Alarme de ${horarioEsperado} já foi tomado`);
          return false;
        }

        console.log(
          `⏰ Disparando alarme de intervalo no horário ${horarioEsperado}`,
        );
        return true;
      } catch (error) {
        console.error('Erro ao verificar timing de intervalo:', error);
        return false;
      }
    },
    [uid],
  );

  const playAlarmSound = useCallback(() => {
    if (alarmSound.current) {
      try {
        alarmSound.current.setNumberOfLoops(-1);
        if (alarmSound.current.setVolume) alarmSound.current.setVolume(1.0);
        alarmSound.current.play(success => {
          if (!success) {
            console.log('Erro ao tocar som');
          }
        });
      } catch (e) {
        console.error('Erro playAlarmSound:', e);
      }
    }
  }, []);

  const stopAlarmSound = useCallback(() => {
    try {
      if (alarmSound.current) {
        if (alarmSound.current.stop) alarmSound.current.stop();
      }
    } catch (e) {
      console.error('Erro stopAlarmSound:', e);
    }
    Vibration.cancel();
  }, []);

  const logMedicationTaken = useCallback(
    async notifData => {
      if (!uid) return;

      try {
        console.log('💊 Registrando medicamento tomado:', notifData);

        const now = new Date();
        const diaStr = now.toISOString().slice(0, 10);

        // CORREÇÃO: Usar FieldValue.serverTimestamp() ao invés de Timestamp.now()
        const dados = {
          usuarioId: uid,
          remedioId: notifData.remedioId,
          remedioNome: notifData.remedioNome || '',
          dosagem: notifData.dosagem || '',
          dia: diaStr,
          timestamp: firestore.FieldValue.serverTimestamp(), // FIX APLICADO
        };

        if (notifData.tipoAlerta === 'dias') {
          dados.horario = notifData.horario;
          dados.tipoAlerta = 'dias';
        } else if (notifData.tipoAlerta === 'intervalo') {
          dados.horario = notifData.horario || now.toTimeString().slice(0, 5);
          dados.tipoAlerta = 'intervalo';
          dados.intervaloHoras = notifData.intervaloHoras;
        }

        await firestore().collection('medicamentos_tomados').add(dados);

        console.log('✅ Medicamento registrado como tomado');

        setTimeout(() => {
          scheduleAllNotifications();
        }, 1000);
      } catch (error) {
        console.error('❌ Erro ao registrar medicamento:', error);
      }
    },
    [uid, scheduleAllNotifications],
  );

  const dismissAlarm = useCallback(
    async notifData => {
      console.log('✅ Usuário confirmou medicamento:', notifData);

      stopAlarmSound();
      Vibration.cancel();

      if (notifData) {
        await logMedicationTaken(notifData);
      }

      setShowAlarm(false);
      setTimeout(() => {
        setCurrentAlarm(null);
        setAlarmType(null);
      }, 500);

      // ✅ PARAR SERVIÇO NATIVO (Remove notificação não descartável)
      try {
        if (MedicationModule && MedicationModule.stopForegroundService) {
          console.log('🛑 Parando serviço nativo de foreground...');
          await MedicationModule.stopForegroundService();
          console.log('✅ Serviço nativo parado - Notificação removida');
        }

        // Também cancelar notificações do notifee (fallback)
        if (notifData?.id) {
          console.log('🔕 Cancelando notificação notifee:', notifData.id);
          await notifee.cancelNotification(notifData.id);
        }

        if (notifData?.remedioId) {
          const displayedNotifications =
            await notifee.getDisplayedNotifications();
          console.log(
            `🔍 Verificando ${displayedNotifications.length} notificações ativas`,
          );

          for (const notif of displayedNotifications) {
            const notifRemedioId = notif.notification?.data?.remedioId;
            if (notifRemedioId === notifData.remedioId) {
              console.log(
                `🔕 Cancelando notificação relacionada: ${notif.notification.id}`,
              );
              await notifee.cancelNotification(notif.notification.id);
            }
          }
        }

        console.log('✅ Todas as notificações foram removidas');
      } catch (e) {
        console.error('❌ Erro ao remover notificações:', e);
      }
    },
    [logMedicationTaken, stopAlarmSound],
  );

  const triggerAlarm = useCallback(
    async (alarmData, type) => {
      if (showAlarm) {
        console.log('⚠️ Alarme já está ativo');
        return;
      }

      console.log('🔔 Disparando alarme para:', alarmData);
      setCurrentAlarm(alarmData);
      setAlarmType(type);
      setShowAlarm(true);

      playAlarmSound();

      try {
        Vibration.vibrate([1000, 500, 1000, 500], true);
      } catch (e) {
        console.warn('❌ Erro ao ativar vibração:', e);
      }

      // ✅ USAR SERVIÇO NATIVO EM FOREGROUND - NOTIFICAÇÃO NÃO DESCARTÁVEL
      try {
        if (MedicationModule && MedicationModule.startForegroundService) {
          console.log('🚀 Iniciando serviço nativo de foreground...');

          const medicationData = {
            medicationName: alarmData.remedioNome || 'Medicamento',
            dosage: alarmData.dosagem || '',
            time: alarmData.horario || new Date().toTimeString().slice(0, 5),
            medicationId: alarmData.remedioId || '',
            alarmType: type || 'dias',
            intervalHours: alarmData.intervaloHoras
              ? String(alarmData.intervaloHoras)
              : '',
          };

          await MedicationModule.startForegroundService(medicationData);
          console.log(
            '✅ Serviço nativo iniciado - Notificação ABSOLUTAMENTE não descartável',
          );
        } else {
          console.warn('⚠️ MedicationModule não disponível, usando notifee');
          // Fallback para notifee se o módulo nativo não estiver disponível
          await showMedicationNotification(
            alarmData.id || 'default-alarm',
            '💊 Hora de tomar seu medicamento',
            `${alarmData.remedioNome || ''} - ${alarmData.dosagem || ''}`,
            alarmData,
          );
        }
      } catch (e) {
        console.error('❌ Erro ao iniciar serviço/notificação:', e);
      }
    },
    [playAlarmSound, showAlarm],
  );

  const cleanup = useCallback(() => {
    stopAlarmChecker();

    try {
      stopAlarmSound();
    } catch (e) {
      // ignore
    }

    if (alarmSound.current && alarmSound.current.release) {
      try {
        alarmSound.current.release();
      } catch (e) {
        // ignore
      }
      alarmSound.current = null;
    }

    try {
      Vibration.cancel();
    } catch (e) {}
  }, [stopAlarmChecker, stopAlarmSound]);

  // Inicializar handlers de notificação
  useEffect(() => {
    const handleConfirm = async notifData => {
      console.log(
        `👆 Usuário confirmou medicação pela notificação:`,
        notifData,
      );
      await dismissAlarm(notifData);
    };

    const cleanupHandlers = registerMedicationHandler(handleConfirm);

    // ✅ REGISTRAR LISTENER PARA EVENTOS DO MÓDULO NATIVO
    let nativeEventListener = null;
    if (MedicationModule) {
      console.log('📡 Registrando listener para eventos nativos...');
      nativeEventListener = DeviceEventEmitter.addListener(
        'onMedicationConfirmed',
        async data => {
          console.log(
            '📥 Evento nativo recebido - Medicamento confirmado:',
            data,
          );

          // Converter dados do formato nativo para o formato esperado
          const notifData = {
            id: data.medicationId,
            remedioId: data.medicationId,
            remedioNome: data.medicationName,
            dosagem: data.dosage,
            horario: data.time,
            tipoAlerta: data.alarmType,
            intervaloHoras: data.intervalHours,
          };

          await dismissAlarm(notifData);
        },
      );
    }

    return () => {
      console.log('🧹 Limpando handlers de notificação...');
      cleanupHandlers();

      // Remover listener nativo
      if (nativeEventListener) {
        nativeEventListener.remove();
      }
    };
  }, [dismissAlarm]);

  // Hook principal
  useEffect(() => {
    if (uid) {
      initializeAlarmSystem();
      scheduleAllNotifications();
    }

    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
      if (nextAppState === 'active' && uid) {
        checkForAlarms();
        scheduleAllNotifications();
      }
    });

    return () => {
      cleanup();
      if (subscription && subscription.remove) {
        subscription.remove();
      }
    };
  }, [
    uid,
    initializeAlarmSystem,
    scheduleAllNotifications,
    checkForAlarms,
    cleanup,
  ]);

  if (!uid) return null;

  return (
    <>
      <AlarmHorarioFixo
        visible={showAlarm && alarmType === 'horario'}
        onDismiss={() => dismissAlarm(currentAlarm)}
        alarmData={currentAlarm}
      />
      <AlarmIntervalo
        visible={showAlarm && alarmType === 'intervalo'}
        onDismiss={() => dismissAlarm(currentAlarm)}
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
    width: windowDimensions.width * 2,
    height: windowDimensions.width * 2,
    borderRadius: windowDimensions.width,
    backgroundColor: '#10B981',
    top: -windowDimensions.width * 0.8,
    left: -windowDimensions.width * 0.5,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: windowDimensions.width * 1.5,
    height: windowDimensions.width * 1.5,
    borderRadius: windowDimensions.width * 0.75,
    backgroundColor: '#10B981',
    bottom: -windowDimensions.width * 0.6,
    right: -windowDimensions.width * 0.4,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 100,
    zIndex: 1,
  },
  decorCircle1: {
    top: windowDimensions.height * 0.15,
    right: windowDimensions.width * 0.1,
    width: 80,
    height: 80,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  decorCircle2: {
    bottom: windowDimensions.height * 0.2,
    left: windowDimensions.width * 0.05,
    width: 60,
    height: 60,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  decorCircle3: {
    top: windowDimensions.height * 0.35,
    left: windowDimensions.width * 0.1,
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
    marginBottom: 8,
  },
  doseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    marginLeft: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo',
    letterSpacing: 1,
    marginLeft: 12,
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
    width: '100%',
    paddingHorizontal: 12,
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
    marginLeft: 12,
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
    marginBottom: 8,
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
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
});

export default AlarmSystem;
