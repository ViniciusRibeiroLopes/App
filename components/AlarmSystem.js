// AlarmSystem.js - VERSÃO MELHORADA E CORRIGIDA
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
  Platform,
} from 'react-native';

import Sound from 'react-native-sound';
import BackgroundTimer from 'react-native-background-timer';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import Icon2 from 'react-native-vector-icons/FontAwesome5';

import notifee, {
  AndroidImportance,
  AndroidCategory,
  EventType,
} from '@notifee/react-native';

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

function normalizarHorario(horario) {
  if (!horario) return '';
  const [h, m] = horario.split(':').map(Number);
  const hora = h.toString().padStart(2, '0');
  const minuto = m.toString().padStart(2, '0');
  return `${hora}:${minuto}`;
}

/**
 * Tela minimalista para alarme de horário fixo
 */
const AlarmHorarioFixo = ({visible, onDismiss, alarmData}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
      );

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

      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1.2,
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

      const float = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
      );

      pulse.start();
      background.start();
      glow.start();
      float.start();

      return () => {
        pulse.stop();
        background.stop();
        glow.stop();
        float.stop();
      };
    }
  }, [
    visible,
    scaleAnim,
    pulseAnim,
    backgroundAnim,
    glowAnim,
    slideAnim,
    opacityAnim,
    floatAnim,
  ]);

  if (!visible || !alarmData) {
    return null;
  }

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
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
        {/* Gradiente de fundo animado */}
        <Animated.View
          style={[
            styles.gradientBackground,
            {
              transform: [
                {
                  scale: backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  }),
                },
              ],
              opacity: 0.25,
            },
          ]}
        />

        {/* Linhas decorativas animadas */}
        <Animated.View
          style={[
            styles.decorLine,
            styles.decorLine1,
            {
              transform: [
                {
                  translateX: backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 20],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorLine,
            styles.decorLine2,
            {
              transform: [
                {
                  translateX: backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -20],
                  }),
                },
              ],
            },
          ]}
        />

        {/* Pontos flutuantes */}
        <Animated.View
          style={[
            styles.floatingDot,
            styles.dot1,
            {
              transform: [
                {translateY: floatTranslate},
                {
                  scale: backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.floatingDot,
            styles.dot2,
            {
              transform: [
                {translateY: floatTranslate},
                {
                  scale: backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1.2, 1],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.contentNew,
            {
              transform: [{scale: scaleAnim}],
              opacity: opacityAnim,
            },
          ]}>
          {/* Header com ícone */}
          <Animated.View
            style={[styles.header, {transform: [{translateY: slideAnim}]}]}>
            <Animated.View
              style={{
                transform: [{scale: glowAnim}, {translateY: floatTranslate}],
              }}>
              <View style={styles.iconContainer}>
                <View style={styles.iconBackground}>
                  <Animated.View
                    style={[
                      styles.iconPulse,
                      {
                        transform: [{scale: pulseAnim}],
                      },
                    ]}
                  />
                  <View style={styles.iconInnerGlow} />
                  <Icon2 name="pills" size={80} color="#10B981" />
                </View>
              </View>
            </Animated.View>

            <View style={styles.statusBadge}>
              <Animated.View
                style={[
                  styles.statusDot,
                  {
                    transform: [{scale: pulseAnim}],
                  },
                ]}
              />
              <Text style={styles.statusText}>Hora do Medicamento</Text>
            </View>
          </Animated.View>

          {/* Card principal */}
          <Animated.View
            style={[styles.mainCard, {transform: [{translateY: slideAnim}]}]}>
            <View style={styles.cardGlow} />

            {/* Nome do medicamento */}
            <View style={styles.medicationHeader}>
              <Text style={styles.medicationLabel}>MEDICAMENTO</Text>
              <Text style={styles.medicationNameNew}>
                {alarmData.remedioNome}
              </Text>
            </View>

            {/* Separador com gradiente */}
            <View style={styles.separatorContainer}>
              <View style={styles.separator} />
              <View style={styles.separatorDot} />
              <View style={styles.separator} />
            </View>

            {/* Grid de informações */}
            <View style={styles.infoGrid}>
              <View style={styles.infoBox}>
                <View style={styles.infoBoxIcon}>
                  <View style={styles.iconGlowSmall} />
                  <Icon name="water" size={32} color="#10B981" />
                </View>
                <Text style={styles.infoBoxLabel}>Dosagem</Text>
                <Text style={styles.infoBoxValue}>{alarmData.dosagem}</Text>
              </View>

              <View style={styles.infoBoxDivider} />

              <View style={styles.infoBox}>
                <View style={styles.infoBoxIcon}>
                  <View style={styles.iconGlowSmall} />
                  <Icon name="alarm" size={32} color="#10B981" />
                </View>
                <Text style={styles.infoBoxLabel}>Horário</Text>
                <Text style={styles.infoBoxValue}>{alarmData.horario}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Botão de ação */}
          <Animated.View
            style={[
              styles.actionContainer,
              {
                transform: [{scale: pulseAnim}, {translateY: slideAnim}],
              },
            ]}>
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.85}
              onPress={async () => {
                try {
                  if (onDismiss) {
                    await onDismiss();
                  }

                  const now = new Date();
                  const diaStr = now.toISOString().slice(0, 10);
                  const horarioNormalizado = normalizarHorario(
                    alarmData.horario,
                  );

                  // Cancelar todas as notificações relacionadas
                  const notifId = `reminder_${
                    alarmData.remedioId
                  }_${horarioNormalizado.replace(':', '')}_${diaStr}`;
                  await notifee.cancelNotification(notifId);
                  await notifee.cancelTriggerNotification(notifId);

                  // Cancelar também possíveis variações do ID
                  const displayedNotifications =
                    await notifee.getDisplayedNotifications();
                  for (const notif of displayedNotifications) {
                    const notifRemedioId = notif.notification?.data?.remedioId;
                    if (notifRemedioId === alarmData.remedioId) {
                      await notifee.cancelNotification(notif.notification.id);
                    }
                  }

                  console.log('🧹 Todas as notificações canceladas:', notifId);
                } catch (error) {
                  console.error('❌ Erro ao confirmar medicação:', error);
                }
              }}>
              <View style={styles.actionButtonGlow} />
              <Animated.View
                style={[
                  styles.actionButtonInner,
                  {
                    transform: [{scale: pulseAnim}],
                  },
                ]}>
                <Icon name="checkmark-circle" size={36} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Confirmar Medicação</Text>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer com indicador */}
          <Animated.View style={[styles.footer, {opacity: opacityAnim}]}>
            <View style={styles.footerIndicators}>
              <Animated.View
                style={[
                  styles.footerDot,
                  {
                    opacity: pulseAnim,
                    backgroundColor: '#10B981',
                    transform: [{scale: pulseAnim}],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.footerDot,
                  {
                    opacity: pulseAnim.interpolate({
                      inputRange: [1, 1.08],
                      outputRange: [0.5, 1],
                    }),
                    backgroundColor: '#10B981',
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.footerDot,
                  {
                    opacity: pulseAnim,
                    backgroundColor: '#10B981',
                    transform: [{scale: pulseAnim}],
                  },
                ]}
              />
            </View>
            <Text style={styles.footerText}>Toque para confirmar</Text>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

/**
 * Tela minimalista para alarme de intervalo
 */
const AlarmIntervalo = ({visible, onDismiss, alarmData}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
      );

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

      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1.2,
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

      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
      );

      const float = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
      );

      pulse.start();
      background.start();
      glow.start();
      rotate.start();
      float.start();

      return () => {
        pulse.stop();
        background.stop();
        glow.stop();
        rotate.stop();
        float.stop();
      };
    }
  }, [
    visible,
    scaleAnim,
    pulseAnim,
    backgroundAnim,
    glowAnim,
    rotateAnim,
    slideAnim,
    opacityAnim,
    floatAnim,
  ]);

  if (!visible || !alarmData) {
    return null;
  }

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
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
        {/* Gradiente de fundo animado - roxo */}
        <Animated.View
          style={[
            styles.gradientBackground,
            styles.gradientBackgroundPurple,
            {
              transform: [
                {
                  scale: backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  }),
                },
              ],
              opacity: 0.25,
            },
          ]}
        />

        {/* Linhas decorativas roxas */}
        <Animated.View
          style={[
            styles.decorLine,
            styles.decorLinePurple1,
            {
              transform: [
                {
                  translateX: backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 20],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorLine,
            styles.decorLinePurple2,
            {
              transform: [
                {
                  translateX: backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -20],
                  }),
                },
              ],
            },
          ]}
        />

        {/* Pontos flutuantes roxos */}
        <Animated.View
          style={[
            styles.floatingDot,
            styles.dotPurple1,
            {
              transform: [
                {translateY: floatTranslate},
                {
                  scale: backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.floatingDot,
            styles.dotPurple2,
            {
              transform: [
                {translateY: floatTranslate},
                {
                  scale: backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1.2, 1],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.contentNew,
            {
              transform: [{scale: scaleAnim}],
              opacity: opacityAnim,
            },
          ]}>
          {/* Header com ícone */}
          <Animated.View
            style={[styles.header, {transform: [{translateY: slideAnim}]}]}>
            {/* Badge rotativo de intervalo */}
            <Animated.View
              style={[
                styles.intervalRotatingBadge,
                {
                  transform: [{rotate: rotateInterpolate}],
                  opacity: pulseAnim,
                },
              ]}>
              <Icon name="refresh" size={28} color="#6366F1" />
            </Animated.View>

            <Animated.View
              style={{
                transform: [{scale: glowAnim}, {translateY: floatTranslate}],
              }}>
              <View style={styles.iconContainer}>
                <View
                  style={[styles.iconBackground, styles.iconBackgroundPurple]}>
                  <Animated.View
                    style={[
                      styles.iconPulse,
                      styles.iconPulsePurple,
                      {
                        transform: [{scale: pulseAnim}],
                      },
                    ]}
                  />
                  <View
                    style={[styles.iconInnerGlow, styles.iconInnerGlowPurple]}
                  />
                  <Icon name="repeat" size={80} color="#6366F1" />
                </View>
              </View>
            </Animated.View>

            <View style={[styles.statusBadge, styles.statusBadgePurple]}>
              <Animated.View
                style={[
                  styles.statusDot,
                  styles.statusDotPurple,
                  {
                    transform: [{scale: pulseAnim}],
                  },
                ]}
              />
              <Text style={styles.statusText}>
                A cada {alarmData.intervaloHoras}h
              </Text>
            </View>
          </Animated.View>

          {/* Card principal */}
          <Animated.View
            style={[
              styles.mainCard,
              styles.mainCardPurple,
              {transform: [{translateY: slideAnim}]},
            ]}>
            <View style={[styles.cardGlow, styles.cardGlowPurple]} />

            {/* Nome do medicamento */}
            <View style={styles.medicationHeader}>
              <Text style={styles.medicationLabel}>MEDICAMENTO</Text>
              <Text style={styles.medicationNameNew}>
                {alarmData.remedioNome}
              </Text>
            </View>

            {/* Separador com gradiente */}
            <View style={styles.separatorContainer}>
              <View style={[styles.separator, styles.separatorPurple]} />
              <View style={[styles.separatorDot, styles.separatorDotPurple]} />
              <View style={[styles.separator, styles.separatorPurple]} />
            </View>

            {/* Grid de informações */}
            <View style={styles.infoGrid}>
              <View style={styles.infoBox}>
                <View style={[styles.infoBoxIcon, styles.infoBoxIconPurple]}>
                  <View
                    style={[styles.iconGlowSmall, styles.iconGlowSmallPurple]}
                  />
                  <Icon name="water" size={32} color="#6366F1" />
                </View>
                <Text style={styles.infoBoxLabel}>Dosagem</Text>
                <Text style={styles.infoBoxValue}>{alarmData.dosagem}</Text>
              </View>

              <View
                style={[styles.infoBoxDivider, styles.infoBoxDividerPurple]}
              />

              <View style={styles.infoBox}>
                <View style={[styles.infoBoxIcon, styles.infoBoxIconPurple]}>
                  <View
                    style={[styles.iconGlowSmall, styles.iconGlowSmallPurple]}
                  />
                  <Icon name="time" size={32} color="#6366F1" />
                </View>
                <Text style={styles.infoBoxLabel}>Próximo</Text>
                <Text style={styles.infoBoxValue}>
                  {alarmData.horarioInicio}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Botão de ação */}
          <Animated.View
            style={[
              styles.actionContainer,
              {
                transform: [{scale: pulseAnim}, {translateY: slideAnim}],
              },
            ]}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPurple]}
              activeOpacity={0.85}
              onPress={async () => {
                try {
                  if (onDismiss) {
                    await onDismiss();
                  }

                  const now = new Date();
                  const diaStr = now.toISOString().slice(0, 10);
                  const horarioNormalizado = normalizarHorario(
                    alarmData.horarioInicio,
                  );

                  // Cancelar todas as notificações relacionadas
                  const notifId = `reminder_${
                    alarmData.remedioId
                  }_${horarioNormalizado.replace(':', '')}_${diaStr}`;
                  await notifee.cancelNotification(notifId);
                  await notifee.cancelTriggerNotification(notifId);

                  // Cancelar também possíveis variações do ID
                  const displayedNotifications =
                    await notifee.getDisplayedNotifications();
                  for (const notif of displayedNotifications) {
                    const notifRemedioId = notif.notification?.data?.remedioId;
                    if (notifRemedioId === alarmData.remedioId) {
                      await notifee.cancelNotification(notif.notification.id);
                    }
                  }

                  console.log('🧹 Todas as notificações canceladas:', notifId);
                } catch (error) {
                  console.error('❌ Erro ao confirmar medicação:', error);
                }
              }}>
              <View
                style={[styles.actionButtonGlow, styles.actionButtonGlowPurple]}
              />
              <Animated.View
                style={[
                  styles.actionButtonInner,
                  {
                    transform: [{scale: pulseAnim}],
                  },
                ]}>
                <Icon name="checkmark-circle" size={36} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Confirmar Medicação</Text>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer com indicador */}
          <Animated.View style={[styles.footer, {opacity: opacityAnim}]}>
            <View style={styles.footerIndicators}>
              <Animated.View
                style={[
                  styles.footerDot,
                  {
                    opacity: pulseAnim,
                    backgroundColor: '#6366F1',
                    transform: [{scale: pulseAnim}],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.footerDot,
                  {
                    opacity: pulseAnim.interpolate({
                      inputRange: [1, 1.08],
                      outputRange: [0.5, 1],
                    }),
                    backgroundColor: '#6366F1',
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.footerDot,
                  {
                    opacity: pulseAnim,
                    backgroundColor: '#6366F1',
                    transform: [{scale: pulseAnim}],
                  },
                ]}
              />
            </View>
            <Text style={styles.footerText}>Toque para confirmar</Text>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ===== FUNÇÕES DE NOTIFICAÇÃO =====

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

/**
 * Componente AlarmSystem - Monitora medicamentos e exibe alarmes
 */
const AlarmSystem = () => {
  const [showAlarm, setShowAlarm] = useState(false);
  const [currentAlarm, setCurrentAlarm] = useState(null);
  const [alarmType, setAlarmType] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);

  const alarmSound = useRef(null);
  const checkInterval = useRef(null);
  const processadosHoje = useRef(new Set());
  const lembretesEnviados = useRef(new Set());
  const ultimaLimpezaCache = useRef(null);
  const verificacaoEmAndamento = useRef(false); // 🆕 Prevenir verificações simultâneas

  const uid = auth().currentUser?.uid;

  // ⭐ FUNÇÃO: Verificar se medicamento já foi tomado (com cache otimizado)
  const verificarSeMedicamentoFoiTomado = useCallback(
    async (remedioId, horario, diaStr) => {
      try {
        const horarioNormalizado = normalizarHorario(horario);

        // 🆕 Cache local primeiro
        const cacheKey = `tomado-${remedioId}-${horarioNormalizado}-${diaStr}`;
        if (processadosHoje.current.has(cacheKey)) {
          console.log('✅ [CACHE] Medicamento já confirmado:', remedioId);
          return true;
        }

        const registroSnapshot = await firestore()
          .collection('medicamentos_tomados')
          .where('usuarioId', '==', uid)
          .where('remedioId', '==', remedioId)
          .where('dia', '==', diaStr)
          .where('status', '==', 'tomado')
          .get();

        if (registroSnapshot.empty) return false;

        const encontrado = registroSnapshot.docs.some(doc => {
          const hBanco = normalizarHorario(doc.data().horarioAgendado);
          return hBanco === horarioNormalizado;
        });

        // 🆕 Adicionar ao cache se encontrado
        if (encontrado) {
          processadosHoje.current.add(cacheKey);
        }

        return encontrado;
      } catch (error) {
        console.error('❌ Erro ao verificar registro:', error);
        return false;
      }
    },
    [uid],
  );

  // 🆕 FUNÇÃO: Cancelar TODAS as notificações de um medicamento
  const cancelarTodasNotificacoesMedicamento = useCallback(
    async (remedioId, horario, diaStr) => {
      try {
        const horarioNormalizado = normalizarHorario(horario);

        // Cancelar notificação principal
        const notifId = `reminder_${remedioId}_${horarioNormalizado.replace(
          ':',
          '',
        )}_${diaStr}`;
        await notifee.cancelNotification(notifId);
        await notifee.cancelTriggerNotification(notifId);

        // Cancelar TODAS as notificações exibidas deste medicamento
        const displayedNotifications =
          await notifee.getDisplayedNotifications();
        let canceladas = 0;

        for (const notif of displayedNotifications) {
          const notifRemedioId = notif.notification?.data?.remedioId;
          const notifHorario = notif.notification?.data?.horario;
          const notifDia = notif.notification?.data?.dia || diaStr;

          // Cancelar se for do mesmo remédio, horário e dia
          if (
            notifRemedioId === remedioId &&
            normalizarHorario(notifHorario || '') === horarioNormalizado &&
            notifDia === diaStr
          ) {
            await notifee.cancelNotification(notif.notification.id);
            canceladas++;
          }
        }

        console.log(
          `🧹 ${canceladas} notificação(ões) cancelada(s) para ${remedioId}`,
        );
      } catch (error) {
        console.error('❌ Erro ao cancelar notificações:', error);
      }
    },
    [],
  );

  // FUNÇÃO: Enviar notificação de lembrete (CORRIGIDA)
  const enviarNotificacaoLembrete = useCallback(
    async (alerta, remedioNome) => {
      try {
        const now = new Date();
        const diaStr = now.toISOString().slice(0, 10);

        const horario =
          alerta.tipoAlerta === 'intervalo'
            ? alerta.horarioInicio
            : alerta.horario;

        const horarioNormalizado = normalizarHorario(horario);

        // 🆕 VERIFICAÇÃO TRIPLA antes de enviar
        const foiTomadoAgora = await verificarSeMedicamentoFoiTomado(
          alerta.remedioId,
          horarioNormalizado,
          diaStr,
        );

        if (foiTomadoAgora) {
          console.log(`🚫 [LEMBRETE CANCELADO] ${remedioNome} já foi tomado`);
          // Cancelar qualquer notificação que possa existir
          await cancelarTodasNotificacoesMedicamento(
            alerta.remedioId,
            horarioNormalizado,
            diaStr,
          );
          return;
        }

        // Chave única para controlar lembretes
        const chaveLembrete = `lembrete-${alerta.remedioId}-${horarioNormalizado}-${diaStr}`;

        if (lembretesEnviados.current.has(chaveLembrete)) {
          console.log('⏭️ Lembrete já foi enviado anteriormente');
          return;
        }

        const channelId = await createNotificationChannel();
        const notifId = `reminder_${
          alerta.remedioId
        }_${horarioNormalizado.replace(':', '')}_${diaStr}`;

        await notifee.displayNotification({
          id: notifId,
          title: '⚠️ Você ainda não tomou seu medicamento!',
          body: `${remedioNome} - ${alerta.dosagem} (${horarioNormalizado})`,
          android: {
            channelId,
            smallIcon: 'icon',
            category: AndroidCategory.ALARM,
            autoCancel: false,
            sound: 'default',
            importance: AndroidImportance.HIGH,
            color: '#F59E0B',
            vibrationPattern: [300, 500, 300, 500],
            actions: [
              {
                title: '✓ Já Tomei',
                pressAction: {id: 'confirm_late'},
              },
            ],
          },
          data: {
            notificationId: notifId,
            remedioId: String(alerta.remedioId || ''),
            remedioNome: String(remedioNome || ''),
            dosagem: String(alerta.dosagem || ''),
            horario: String(horarioNormalizado || ''),
            dia: String(diaStr || ''),
            tipoAlerta: String(alerta.tipoAlerta || ''),
            isReminder: 'true',
          },
        });

        lembretesEnviados.current.add(chaveLembrete);
        console.log('✅ Lembrete enviado (ÚNICO):', remedioNome);
      } catch (error) {
        console.error('❌ Erro ao enviar lembrete:', error);
      }
    },
    [verificarSeMedicamentoFoiTomado, cancelarTodasNotificacoesMedicamento],
  );

  // ⭐ FUNÇÃO: Registrar medicamento como não tomado
  const registrarMedicamentoNaoTomado = useCallback(
    async (alerta, diaStr, remedioNome) => {
      try {
        const horarioQueDeveriaTerSido =
          alerta.tipoAlerta === 'intervalo'
            ? alerta.horarioInicio
            : alerta.horario;

        const horarioNormalizado = normalizarHorario(horarioQueDeveriaTerSido);

        // Verificar se já existe registro
        const registrosExistentes = await firestore()
          .collection('medicamentos_tomados')
          .where('usuarioId', '==', uid)
          .where('remedioId', '==', alerta.remedioId)
          .where('dia', '==', diaStr)
          .where('horarioAgendado', '==', horarioNormalizado)
          .get();

        if (!registrosExistentes.empty) {
          console.log('⏭️ Já existe registro para este medicamento');
          return;
        }

        const dadosParaSalvar = {
          dia: diaStr,
          dosagem: alerta.dosagem,
          horario: horarioQueDeveriaTerSido,
          horarioAgendado: horarioNormalizado,
          remedioId: alerta.remedioId,
          remedioNome: remedioNome,
          usuarioId: uid,
          tipoAlerta: alerta.tipoAlerta || 'dias',
          status: 'nao_tomado',
          timestamp: firestore.FieldValue.serverTimestamp(),
        };

        await firestore()
          .collection('medicamentos_tomados')
          .add(dadosParaSalvar);

        console.log('✅ Registrado como NÃO TOMADO:', remedioNome);
      } catch (error) {
        console.error('❌ Erro ao registrar não tomado:', error);
      }
    },
    [uid],
  );

  // ⭐ FUNÇÃO: Atualizar próximo horário de intervalo
  const atualizarProximoHorarioIntervalo = useCallback(
    async (alerta, alertaId) => {
      try {
        console.log('\n🔄 Atualizando próximo horário (intervalo)...');

        const now = new Date();
        const horaAtual = now.getHours();
        const minutoAtual = now.getMinutes();

        const intervaloMinutos = alerta.intervaloHoras * 60;
        const minutosAtuais = horaAtual * 60 + minutoAtual;
        const proximosMinutos = minutosAtuais + intervaloMinutos;

        if (proximosMinutos > 23 * 60 + 59) {
          console.log('⏭️ Próximo horário seria amanhã - não atualizando');
          return;
        }

        const proximaHora = Math.floor(proximosMinutos / 60);
        const proximoMinuto = proximosMinutos % 60;
        const novoHorario = `${String(proximaHora).padStart(2, '0')}:${String(
          proximoMinuto,
        ).padStart(2, '0')}`;

        await firestore().collection('alertas').doc(alertaId).update({
          horarioInicio: novoHorario,
          ultimaAtualizacao: firestore.FieldValue.serverTimestamp(),
        });

        console.log('✅ Próximo horário atualizado para:', novoHorario);
      } catch (error) {
        console.error('❌ Erro ao atualizar próximo horário:', error);
      }
    },
    [],
  );

  // ⭐ FUNÇÃO PRINCIPAL: Verificar medicamentos (CORRIGIDA)
  const verificarMedicamentosNaoTomados = useCallback(async () => {
    if (!uid) return;

    // 🆕 Prevenir execuções simultâneas
    if (verificacaoEmAndamento.current) {
      console.log('⏭️ Verificação já em andamento, pulando...');
      return;
    }

    verificacaoEmAndamento.current = true;

    try {
      const now = new Date();
      const currentTimeStr = now.toTimeString().slice(0, 5);
      const currentDay = diasSemana[now.getDay()].abrev;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diaStr = today.toISOString().slice(0, 10);

      // Limpar cache se mudou o dia
      if (ultimaLimpezaCache.current !== diaStr) {
        console.log('🗑️ Limpando cache - novo dia:', diaStr);
        processadosHoje.current.clear();
        lembretesEnviados.current.clear();
        ultimaLimpezaCache.current = diaStr;
      }

      const todosAlertasSnapshot = await firestore()
        .collection('alertas')
        .where('usuarioId', '==', uid)
        .where('ativo', '==', true)
        .get();

      for (const doc of todosAlertasSnapshot.docs) {
        const alerta = doc.data();

        const remedioDoc = await firestore()
          .collection('remedios')
          .doc(alerta.remedioId)
          .get();

        if (!remedioDoc.exists) continue;

        const remedioNome = remedioDoc.data().nome;

        // ========== ALERTAS DE DIAS FIXOS ==========
        if (alerta.tipoAlerta === 'dias') {
          if (!alerta.dias || !Array.isArray(alerta.dias)) continue;
          if (!alerta.dias.includes(currentDay)) continue;

          const horarioAlerta = alerta.horario;
          const [hAlerta, mAlerta] = horarioAlerta.split(':').map(Number);
          const minutosAlerta = hAlerta * 60 + mAlerta;

          const [hAtual, mAtual] = currentTimeStr.split(':').map(Number);
          const minutosAtuais = hAtual * 60 + mAtual;

          const diferencaMinutos = minutosAtuais - minutosAlerta;

          // HORÁRIO EXATO (0 a 1 minuto)
          if (diferencaMinutos >= 0 && diferencaMinutos <= 1) {
            const chaveHorarioExato = `exato-${alerta.remedioId}-${horarioAlerta}-${diaStr}`;

            if (!processadosHoje.current.has(chaveHorarioExato)) {
              console.log(
                `🔔 HORÁRIO EXATO: ${remedioNome} às ${horarioAlerta}`,
              );

              const foiTomado = await verificarSeMedicamentoFoiTomado(
                alerta.remedioId,
                horarioAlerta,
                diaStr,
              );

              if (!foiTomado) {
                const alarmData = {
                  remedioId: alerta.remedioId,
                  remedioNome: remedioNome,
                  dosagem: alerta.dosagem,
                  horario: horarioAlerta,
                  tipoAlerta: 'dias',
                };
                triggerAlarm(alarmData, 'horario');
              }

              processadosHoje.current.add(chaveHorarioExato);
            }
          }

          // LEMBRETE DE ATRASO (10+ minutos)
          if (diferencaMinutos >= 10 && diferencaMinutos < 1440) {
            const chaveAtraso = `atraso-${alerta.remedioId}-${horarioAlerta}-${diaStr}`;

            if (!processadosHoje.current.has(chaveAtraso)) {
              console.log(`⚠️ ${remedioNome} atrasado ${diferencaMinutos}min`);

              // 🆕 VERIFICAÇÃO TRIPLA ANTES DE PROCESSAR
              const foiTomado = await verificarSeMedicamentoFoiTomado(
                alerta.remedioId,
                horarioAlerta,
                diaStr,
              );

              if (foiTomado) {
                console.log(
                  `✅ ${remedioNome} já foi tomado - BLOQUEANDO lembrete`,
                );
                processadosHoje.current.add(chaveAtraso);

                // 🆕 Adicionar também ao cache de lembrete
                const chaveLembrete = `lembrete-${
                  alerta.remedioId
                }-${normalizarHorario(horarioAlerta)}-${diaStr}`;
                lembretesEnviados.current.add(chaveLembrete);

                // Cancelar qualquer notificação existente
                await cancelarTodasNotificacoesMedicamento(
                  alerta.remedioId,
                  horarioAlerta,
                  diaStr,
                );
                continue;
              }

              // 🆕 VERIFICAR SE LEMBRETE JÁ FOI ENVIADO
              const chaveLembrete = `lembrete-${
                alerta.remedioId
              }-${normalizarHorario(horarioAlerta)}-${diaStr}`;
              if (lembretesEnviados.current.has(chaveLembrete)) {
                console.log(
                  `⏭️ Lembrete de ${remedioNome} já foi enviado anteriormente`,
                );
                processadosHoje.current.add(chaveAtraso);
                continue;
              }

              await registrarMedicamentoNaoTomado(alerta, diaStr, remedioNome);
              await enviarNotificacaoLembrete(alerta, remedioNome);
              processadosHoje.current.add(chaveAtraso);
            }
          }
        }

        // ========== ALERTAS DE INTERVALO ==========
        else if (alerta.tipoAlerta === 'intervalo') {
          const horarioAlerta = alerta.horarioInicio;
          const [hAlerta, mAlerta] = horarioAlerta.split(':').map(Number);
          const minutosAlerta = hAlerta * 60 + mAlerta;

          const [hAtual, mAtual] = currentTimeStr.split(':').map(Number);
          const minutosAtuais = hAtual * 60 + mAtual;

          const diferencaMinutos = minutosAtuais - minutosAlerta;

          // HORÁRIO EXATO (0 a 1 minuto)
          if (diferencaMinutos >= 0 && diferencaMinutos <= 1) {
            const chaveHorarioExato = `exato-intervalo-${alerta.remedioId}-${horarioAlerta}-${diaStr}`;

            if (!processadosHoje.current.has(chaveHorarioExato)) {
              console.log(
                `🔔 HORÁRIO EXATO (INTERVALO): ${remedioNome} às ${horarioAlerta}`,
              );

              const foiTomado = await verificarSeMedicamentoFoiTomado(
                alerta.remedioId,
                horarioAlerta,
                diaStr,
              );

              if (!foiTomado) {
                const alarmData = {
                  remedioId: alerta.remedioId,
                  remedioNome: remedioNome,
                  dosagem: alerta.dosagem,
                  horarioInicio: horarioAlerta,
                  intervaloHoras: alerta.intervaloHoras,
                  tipoAlerta: 'intervalo',
                };
                triggerAlarm(alarmData, 'intervalo');
              }

              processadosHoje.current.add(chaveHorarioExato);
            }
          }

          // LEMBRETE DE ATRASO (10+ minutos)
          if (diferencaMinutos >= 10 && diferencaMinutos <= 1440) {
            const chaveAtraso = `atraso-intervalo-${alerta.remedioId}-${horarioAlerta}-${diaStr}`;

            if (!processadosHoje.current.has(chaveAtraso)) {
              console.log(
                `⚠️ ${remedioNome} (intervalo) atrasado ${diferencaMinutos}min`,
              );

              // 🆕 VERIFICAÇÃO TRIPLA ANTES DE PROCESSAR
              const foiTomado = await verificarSeMedicamentoFoiTomado(
                alerta.remedioId,
                horarioAlerta,
                diaStr,
              );

              if (foiTomado) {
                console.log(
                  `✅ ${remedioNome} (intervalo) já foi tomado - BLOQUEANDO lembrete`,
                );
                processadosHoje.current.add(chaveAtraso);

                // 🆕 Adicionar também ao cache de lembrete
                const chaveLembrete = `lembrete-${
                  alerta.remedioId
                }-${normalizarHorario(horarioAlerta)}-${diaStr}`;
                lembretesEnviados.current.add(chaveLembrete);

                // Cancelar qualquer notificação existente
                await cancelarTodasNotificacoesMedicamento(
                  alerta.remedioId,
                  horarioAlerta,
                  diaStr,
                );
                continue;
              }

              // 🆕 VERIFICAR SE LEMBRETE JÁ FOI ENVIADO
              const chaveLembrete = `lembrete-${
                alerta.remedioId
              }-${normalizarHorario(horarioAlerta)}-${diaStr}`;
              if (lembretesEnviados.current.has(chaveLembrete)) {
                console.log(
                  `⏭️ Lembrete de ${remedioNome} (intervalo) já foi enviado`,
                );
                processadosHoje.current.add(chaveAtraso);
                continue;
              }

              await registrarMedicamentoNaoTomado(alerta, diaStr, remedioNome);
              await enviarNotificacaoLembrete(alerta, remedioNome);
              await atualizarProximoHorarioIntervalo(alerta, doc.id);
              processadosHoje.current.add(chaveAtraso);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao verificar medicamentos:', error);
    } finally {
      verificacaoEmAndamento.current = false;
    }
  }, [
    uid,
    verificarSeMedicamentoFoiTomado,
    cancelarTodasNotificacoesMedicamento,
    triggerAlarm,
    registrarMedicamentoNaoTomado,
    enviarNotificacaoLembrete,
    atualizarProximoHorarioIntervalo,
  ]);

  // ⭐ FUNÇÃO: Registrar medicamento tomado (tarde)
  const registrarMedicamentoTomadoTarde = useCallback(
    async notifData => {
      try {
        console.log('💊 Registrando medicamento tomado (atrasado)');

        const now = new Date();
        const diaStr = now.toISOString().slice(0, 10);
        const horarioAtual = now.toTimeString().slice(0, 5);
        const horarioAgendadoNormalizado = normalizarHorario(notifData.horario);

        // 🆕 ATUALIZAR TODOS OS CACHES PRIMEIRO
        const cacheKey = `tomado-${notifData.remedioId}-${horarioAgendadoNormalizado}-${diaStr}`;
        processadosHoje.current.add(cacheKey);

        const chaveAtraso = `atraso-${notifData.remedioId}-${horarioAgendadoNormalizado}-${diaStr}`;
        processadosHoje.current.add(chaveAtraso);

        // 🆕 ADICIONAR TAMBÉM COM PREFIXO DE INTERVALO (SE FOR INTERVALO)
        if (notifData.tipoAlerta === 'intervalo') {
          const chaveAtrasoIntervalo = `atraso-intervalo-${notifData.remedioId}-${horarioAgendadoNormalizado}-${diaStr}`;
          processadosHoje.current.add(chaveAtrasoIntervalo);
        }

        const chaveLembrete = `lembrete-${notifData.remedioId}-${horarioAgendadoNormalizado}-${diaStr}`;
        lembretesEnviados.current.add(chaveLembrete);

        console.log('🔒 Caches atualizados (atrasado):', {
          cacheKey,
          chaveAtraso,
          chaveLembrete,
        });

        // Verificar se já existe registro
        const registroExistente = await firestore()
          .collection('medicamentos_tomados')
          .where('usuarioId', '==', uid)
          .where('remedioId', '==', notifData.remedioId)
          .where('dia', '==', diaStr)
          .where('horarioAgendado', '==', horarioAgendadoNormalizado)
          .get();

        if (!registroExistente.empty) {
          console.log('⚠️ Medicamento já estava registrado');

          // Cancelar notificações mesmo assim
          await cancelarTodasNotificacoesMedicamento(
            notifData.remedioId,
            horarioAgendadoNormalizado,
            diaStr,
          );
          return;
        }

        const dados = {
          usuarioId: uid,
          remedioId: notifData.remedioId,
          remedioNome: notifData.remedioNome || '',
          dosagem: notifData.dosagem || '',
          dia: diaStr,
          horario: horarioAtual,
          horarioAgendado: horarioAgendadoNormalizado,
          timestamp: firestore.FieldValue.serverTimestamp(),
          status: 'tomado',
          atrasado: true,
          tipoAlerta: notifData.tipoAlerta || 'dias',
        };

        await firestore().collection('medicamentos_tomados').add(dados);

        // Cancelar TODAS as notificações relacionadas
        await cancelarTodasNotificacoesMedicamento(
          notifData.remedioId,
          horarioAgendadoNormalizado,
          diaStr,
        );

        console.log('✅ Medicamento registrado como tomado (atrasado)');
      } catch (error) {
        console.error('❌ Erro ao registrar medicamento:', error);
      }
    },
    [uid, cancelarTodasNotificacoesMedicamento],
  );

  // ⭐ INICIALIZAR SOM DO ALARME
  const initializeAlarmSound = useCallback(() => {
    try {
      if (Sound && Sound.setCategory) {
        try {
          if (Platform.OS === 'ios') {
            Sound.setCategory('Playback');
          }
        } catch (e) {}
      }

      alarmSound.current = new Sound('alarm.mp3', Sound.MAIN_BUNDLE, error => {
        if (error) {
          console.log('Erro ao carregar som:', error);
          alarmSound.current = null;
        } else {
          console.log('Som carregado com sucesso');
        }
      });
    } catch (e) {
      console.error('Erro ao inicializar som:', e);
    }
  }, []);

  // ⭐ TOCAR SOM DO ALARME
  const playAlarmSound = useCallback(() => {
    if (alarmSound.current) {
      try {
        alarmSound.current.setNumberOfLoops(-1);
        if (alarmSound.current.setVolume) {
          alarmSound.current.setVolume(1.0);
        }
        alarmSound.current.play(success => {
          if (!success) {
            console.log('Erro ao tocar som');
          }
        });
      } catch (e) {
        console.error('Erro ao tocar som:', e);
      }
    }
  }, []);

  // ⭐ PARAR SOM DO ALARME
  const stopAlarmSound = useCallback(() => {
    try {
      if (alarmSound.current) {
        if (alarmSound.current.stop) {
          alarmSound.current.stop();
        }
      }
    } catch (e) {
      console.error('Erro ao parar som:', e);
    }
    Vibration.cancel();
  }, []);

  // ⭐ DISPARAR ALARME VISUAL
  const triggerAlarm = useCallback(
    (alarmData, type) => {
      if (showAlarm) {
        console.log('⚠️ Alarme já está ativo');
        return;
      }

      console.log('🔔 Disparando alarme visual:', alarmData);
      setCurrentAlarm(alarmData);
      setAlarmType(type);
      setShowAlarm(true);

      playAlarmSound();

      try {
        Vibration.vibrate([1000, 500, 1000, 500], true);
      } catch (e) {
        console.warn('❌ Erro ao ativar vibração:', e);
      }
    },
    [playAlarmSound, showAlarm],
  );

  // ⭐ FECHAR ALARME (CORRIGIDO)
  const dismissAlarm = useCallback(async () => {
    console.log('✅ Fechando alarme');

    if (currentAlarm) {
      const now = new Date();
      const diaStr = now.toISOString().slice(0, 10);
      const horarioAtual = now.toTimeString().slice(0, 5);
      const horarioAgendado = normalizarHorario(
        currentAlarm.horario || currentAlarm.horarioInicio,
      );

      // Verificar duplicata
      const registroExistente = await firestore()
        .collection('medicamentos_tomados')
        .where('usuarioId', '==', uid)
        .where('remedioId', '==', currentAlarm.remedioId)
        .where('dia', '==', diaStr)
        .where('horarioAgendado', '==', horarioAgendado)
        .get();

      if (registroExistente.empty) {
        await firestore().collection('medicamentos_tomados').add({
          usuarioId: uid,
          remedioId: currentAlarm.remedioId,
          remedioNome: currentAlarm.remedioNome,
          dosagem: currentAlarm.dosagem,
          dia: diaStr,
          horario: horarioAtual,
          horarioAgendado,
          timestamp: firestore.FieldValue.serverTimestamp(),
          status: 'tomado',
          atrasado: false,
          tipoAlerta: currentAlarm.tipoAlerta,
        });

        console.log('✅ Medicamento registrado como tomado');
      } else {
        console.log('⚠️ Medicamento já estava registrado');
      }

      // 🆕 Adicionar aos caches locais
      const cacheKey = `tomado-${currentAlarm.remedioId}-${horarioAgendado}-${diaStr}`;
      processadosHoje.current.add(cacheKey);

      const chaveAtraso = `atraso-${currentAlarm.remedioId}-${horarioAgendado}-${diaStr}`;
      processadosHoje.current.add(chaveAtraso);

      const chaveLembrete = `lembrete-${currentAlarm.remedioId}-${horarioAgendado}-${diaStr}`;
      lembretesEnviados.current.add(chaveLembrete);

      // 🆕 Cancelar TODAS as notificações relacionadas
      await cancelarTodasNotificacoesMedicamento(
        currentAlarm.remedioId,
        horarioAgendado,
        diaStr,
      );
    }

    stopAlarmSound();
    Vibration.cancel();
    setShowAlarm(false);

    setTimeout(() => {
      setCurrentAlarm(null);
      setAlarmType(null);
    }, 500);
  }, [stopAlarmSound, currentAlarm, uid, cancelarTodasNotificacoesMedicamento]);

  // ⭐ INICIAR VERIFICAÇÃO PERIÓDICA
  const startPeriodicCheck = useCallback(() => {
    if (checkInterval.current) {
      return;
    }

    console.log('⏰ Iniciando verificação periódica...');

    verificarMedicamentosNaoTomados();

    checkInterval.current = BackgroundTimer.setInterval(() => {
      console.log('[INTERVALO] Verificando medicamentos...');
      verificarMedicamentosNaoTomados();
    }, 60000);
  }, [verificarMedicamentosNaoTomados]);

  // ⭐ PARAR VERIFICAÇÃO PERIÓDICA
  const stopPeriodicCheck = useCallback(() => {
    if (checkInterval.current) {
      BackgroundTimer.clearInterval(checkInterval.current);
      checkInterval.current = null;
      console.log('⏸️ Verificação periódica parada');
    }
  }, []);

  // ⭐ CLEANUP
  const cleanup = useCallback(() => {
    stopPeriodicCheck();

    try {
      stopAlarmSound();
    } catch (e) {}

    if (alarmSound.current && alarmSound.current.release) {
      try {
        alarmSound.current.release();
      } catch (e) {}
      alarmSound.current = null;
    }

    try {
      Vibration.cancel();
    } catch (e) {}
  }, [stopPeriodicCheck, stopAlarmSound]);

  // ⭐ EFEITO: Registrar handlers de notificação (CORRIGIDO)
  useEffect(() => {
    console.log('📡 Registrando handlers de notificação...');

    const unsubscribeForeground = notifee.onForegroundEvent(
      async ({type, detail}) => {
        console.log('📱 [FOREGROUND] Evento:', type);

        if (type === EventType.DELIVERED) {
          const notifData = detail.notification?.data;

          if (notifData && notifData.isReminder !== 'true') {
            console.log('🔔 Notificação entregue - Disparando alarme visual');

            const alarmData = {
              remedioId: notifData.remedioId,
              remedioNome: notifData.remedioNome,
              dosagem: notifData.dosagem,
              horario: notifData.horario,
              horarioInicio: notifData.horarioInicio,
              intervaloHoras: notifData.intervaloHoras,
              tipoAlerta: notifData.tipoAlerta,
            };

            const type =
              notifData.tipoAlerta === 'intervalo' ? 'intervalo' : 'horario';
            triggerAlarm(alarmData, type);
          }
        }

        if (
          type === EventType.ACTION_PRESS &&
          detail.pressAction?.id === 'confirm_late'
        ) {
          const notifData = detail.notification?.data;
          if (notifData && notifData.isReminder === 'true') {
            console.log('👆 Usuário confirmou medicamento atrasado');
            await registrarMedicamentoTomadoTarde(notifData);
          }
        }
      },
    );

    notifee.onBackgroundEvent(async ({type, detail}) => {
      console.log('🌙 [BACKGROUND] Evento:', type);

      if (
        type === EventType.ACTION_PRESS &&
        detail.pressAction?.id === 'confirm_late'
      ) {
        const notifData = detail.notification?.data;
        if (notifData && notifData.isReminder === 'true') {
          console.log('👆 [BACKGROUND] Confirmando medicamento atrasado');

          const uid = auth().currentUser?.uid;
          if (!uid) return;

          const now = new Date();
          const diaStr = now.toISOString().slice(0, 10);
          const horarioAtual = now.toTimeString().slice(0, 5);
          const horarioAgendadoNormalizado = normalizarHorario(
            notifData.horario,
          );

          // Verificar duplicata
          const registroExistente = await firestore()
            .collection('medicamentos_tomados')
            .where('usuarioId', '==', uid)
            .where('remedioId', '==', notifData.remedioId)
            .where('dia', '==', diaStr)
            .where('horarioAgendado', '==', horarioAgendadoNormalizado)
            .get();

          if (registroExistente.empty) {
            const dados = {
              usuarioId: uid,
              remedioId: notifData.remedioId,
              remedioNome: notifData.remedioNome || '',
              dosagem: notifData.dosagem || '',
              dia: diaStr,
              horario: horarioAtual,
              horarioAgendado: horarioAgendadoNormalizado,
              timestamp: firestore.FieldValue.serverTimestamp(),
              status: 'tomado',
              atrasado: true,
              tipoAlerta: notifData.tipoAlerta || 'dias',
            };

            await firestore().collection('medicamentos_tomados').add(dados);
            console.log('✅ [BACKGROUND] Medicamento registrado');
          }

          // Cancelar TODAS as notificações relacionadas
          const displayedNotifications =
            await notifee.getDisplayedNotifications();
          for (const notif of displayedNotifications) {
            const notifRemedioId = notif.notification?.data?.remedioId;
            const notifHorario = notif.notification?.data?.horario;
            const notifDia = notif.notification?.data?.dia || diaStr;
            const notifHorarioNorm = normalizarHorario(notifHorario || '');

            if (
              notifRemedioId === notifData.remedioId &&
              notifHorarioNorm === horarioAgendadoNormalizado &&
              notifDia === diaStr
            ) {
              await notifee.cancelNotification(notif.notification.id);
            }
          }
        }
      }
    });

    return () => {
      console.log('🧹 Limpando handlers de notificação...');
      unsubscribeForeground();
    };
  }, [registrarMedicamentoTomadoTarde, triggerAlarm]);

  // ⭐ EFEITO PRINCIPAL: Inicializar sistema
  useEffect(() => {
    if (!uid) return;

    console.log('🚀 Inicializando AlarmSystem...');

    initializeAlarmSound();
    startPeriodicCheck();

    const handleAppStateChange = nextAppState => {
      console.log('📱 App state mudou:', appState, '→', nextAppState);

      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('✅ App voltou para foreground');
        startPeriodicCheck();
        verificarMedicamentosNaoTomados();
      }

      if (nextAppState.match(/inactive|background/)) {
        console.log('⏸️ App foi para background');
        stopPeriodicCheck();
      }

      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      cleanup();
      if (subscription && subscription.remove) {
        subscription.remove();
      }
    };
  }, [
    uid,
    appState,
    initializeAlarmSound,
    startPeriodicCheck,
    stopPeriodicCheck,
    verificarMedicamentosNaoTomados,
    cleanup,
  ]);

  if (!uid) {
    return null;
  }

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
    backgroundColor: '#0A0E1A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    position: 'relative',
    overflow: 'hidden',
  },

  // ===== FUNDO ANIMADO =====
  gradientBackground: {
    position: 'absolute',
    width: windowDimensions.width * 2,
    height: windowDimensions.height * 2,
    borderRadius: windowDimensions.width,
    backgroundColor: '#10B981',
    top: -windowDimensions.height * 0.5,
    left: -windowDimensions.width * 0.5,
  },
  gradientBackgroundPurple: {
    backgroundColor: '#6366F1',
  },

  // ===== LINHAS DECORATIVAS =====
  decorLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#10B981',
    opacity: 0.15,
  },
  decorLine1: {
    width: windowDimensions.width * 0.6,
    top: '20%',
    left: -100,
    transform: [{rotate: '-15deg'}],
  },
  decorLine2: {
    width: windowDimensions.width * 0.8,
    bottom: '25%',
    right: -150,
    transform: [{rotate: '20deg'}],
  },
  decorLine3: {
    width: windowDimensions.width * 0.5,
    top: '60%',
    left: -80,
    transform: [{rotate: '-25deg'}],
  },
  decorLinePurple1: {
    backgroundColor: '#6366F1',
  },
  decorLinePurple2: {
    backgroundColor: '#6366F1',
  },
  decorLinePurple3: {
    backgroundColor: '#6366F1',
  },

  // ===== PONTOS FLUTUANTES =====
  floatingDot: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: '#10B981',
  },
  dot1: {
    width: 120,
    height: 120,
    top: '15%',
    right: '10%',
    opacity: 0.2,
  },
  dot2: {
    width: 80,
    height: 80,
    bottom: '20%',
    left: '5%',
    opacity: 0.15,
  },
  dot3: {
    width: 60,
    height: 60,
    top: '45%',
    left: '8%',
    opacity: 0.12,
  },
  dotPurple1: {
    backgroundColor: '#6366F1',
  },
  dotPurple2: {
    backgroundColor: '#6366F1',
  },
  dotPurple3: {
    backgroundColor: '#6366F1',
  },

  // ===== CONTEÚDO PRINCIPAL =====
  contentNew: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    zIndex: 10,
  },

  // ===== HEADER =====
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconBackground: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 20},
    shadowOpacity: 0.6,
    shadowRadius: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  iconBackgroundPurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    shadowColor: '#6366F1',
  },
  iconPulse: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    borderRadius: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  iconPulsePurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  iconInnerGlow: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    borderRadius: 80,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  iconInnerGlowPurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusBadgePurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    marginRight: 10,
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusDotPurple: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // ===== BADGE ROTATIVO (INTERVALO) =====
  intervalRotatingBadge: {
    position: 'absolute',
    top: -20,
    right: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    shadowColor: '#6366F1',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    zIndex: 10,
  },

  // ===== CARD PRINCIPAL =====
  mainCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 15},
    shadowOpacity: 0.3,
    shadowRadius: 25,
    marginBottom: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  mainCardPurple: {
    borderColor: 'rgba(99, 102, 241, 0.2)',
    shadowColor: '#6366F1',
  },
  cardGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  cardGlowPurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  medicationHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  medicationLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 2,
    marginBottom: 10,
  },
  medicationNameNew: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 42,
  },

  // ===== SEPARADOR =====
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  separator: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  separatorPurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  separatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginHorizontal: 12,
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  separatorDotPurple: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
  },

  // ===== GRID DE INFORMAÇÕES =====
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoBox: {
    flex: 1,
    alignItems: 'center',
  },
  infoBoxIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    position: 'relative',
    overflow: 'hidden',
  },
  infoBoxIconPurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  iconGlowSmall: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 35,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  iconGlowSmallPurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  infoBoxLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  infoBoxValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  infoBoxDivider: {
    width: 1,
    height: 80,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    marginHorizontal: 20,
  },
  infoBoxDividerPurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },

  // ===== BOTÃO DE AÇÃO =====
  actionContainer: {
    width: '100%',
    marginBottom: 30,
  },
  actionButton: {
    width: '100%',
    backgroundColor: '#10B981',
    borderRadius: 28,
    paddingVertical: 4,
    paddingHorizontal: 4,
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 15},
    shadowOpacity: 0.5,
    shadowRadius: 25,
    position: 'relative',
    overflow: 'hidden',
  },
  actionButtonPurple: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
  },
  actionButtonGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 28,
  },
  actionButtonGlowPurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
  },
  actionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 30,
  },
  actionButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginLeft: 14,
    letterSpacing: 0.5,
  },

  // ===== FOOTER =====
  footer: {
    alignItems: 'center',
  },
  footerIndicators: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  footerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default AlarmSystem;
