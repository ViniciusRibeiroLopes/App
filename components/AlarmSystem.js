// AlarmSystem.js - DESIGN ATUALIZADO - NOTIFICAÇÃO ÚNICA POR SESSÃO
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

import notifee, {
  AndroidImportance,
  AndroidCategory,
  EventType,
} from '@notifee/react-native';

const { width, height } = Dimensions.get('window');

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
 * Tela de alarme para horário fixo (verde)
 */
const AlarmHorarioFixo = ({visible, onDismiss, alarmData}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
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
        ])
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
        ])
      );

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
        ])
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
  }, [visible, pulseAnim, backgroundAnim, glowAnim]);

  if (!visible || !alarmData) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.container}>
        {/* Círculos de fundo animados */}
        <Animated.View
          style={[
            styles.backgroundCircle,
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

        {/* Círculos decorativos */}
        <View style={[styles.decorativeCircle, styles.decorCircle1]} />
        <View style={[styles.decorativeCircle, styles.decorCircle2]} />
        <View style={[styles.decorativeCircle, styles.decorCircle3]} />

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Badge de status */}
          <View style={styles.topBadgeContainer}>
            <Icon name="notifications" size={20} color="#10B981" />
            <Text style={styles.topBadgeText}>HORA DO MEDICAMENTO</Text>
          </View>

          {/* Ícone principal */}
          <Animated.View style={{ transform: [{ scale: glowAnim }] }}>
            <Animated.View
              style={[
                styles.iconCircle,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Icon name="medical-outline" size={70} color="#10B981" />
            </Animated.View>
          </Animated.View>

          {/* Nome do medicamento */}
          <Text style={styles.medicationName}>{alarmData.remedioNome}</Text>

          {/* Container de dosagem */}
          <View style={styles.doseContainer}>
            <Icon name="fitness-outline" size={20} color="#10B981" />
            <Text style={styles.dosage}>{alarmData.dosagem}</Text>
          </View>

          {/* Container de horário */}
          <View style={styles.timeContainer}>
            <Icon name="time-outline" size={24} color="#10B981" />
            <Text style={styles.time}>{alarmData.horario}</Text>
          </View>

          {/* Botão de ação */}
          <Animated.View
            style={{ 
              transform: [{ scale: pulseAnim }], 
              width: '100%' 
            }}
          >
            <TouchableOpacity
              style={styles.button}
              onPress={async () => {
                try {
                  console.log('\n🔔 ========== BOTÃO ALARME PRESSIONADO ==========');
                  console.log('   📋 Medicamento:', alarmData.remedioNome);
                  console.log('   ⏰ Horário:', alarmData.horario);

                  // 1️⃣ FECHAR O ALARME (JÁ FAZ TUDO: cancela notifs + registra)
                  if (onDismiss) {
                    await onDismiss();
                  }

                  console.log('========== ALARME CONFIRMADO ==========\n');
                } catch (error) {
                  console.error('❌ Erro ao confirmar medicação:', error);
                }
              }}
              activeOpacity={0.9}
            >
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

          {/* Instrução */}
          <View style={styles.instructionContainer}>
            <Icon name="information-circle-outline" size={24} color="#10B981" />
            <Text style={styles.instructionText}>
              Confirme que tomou{'\n'}seu medicamento
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

/**
 * Tela de alarme para intervalo (roxo)
 */
const AlarmIntervalo = ({visible, onDismiss, alarmData}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
        ])
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
        ])
      );

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
        ])
      );

      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
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
  }, [visible, pulseAnim, backgroundAnim, glowAnim, rotateAnim]);

  if (!visible || !alarmData) {
    return null;
  }

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
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.container}>
        {/* Círculos de fundo animados - roxo */}
        <Animated.View
          style={[
            styles.backgroundCircle,
            styles.backgroundCirclePurple,
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
            styles.backgroundCirclePurple,
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

        {/* Círculos decorativos roxos */}
        <View style={[styles.decorativeCircle, styles.decorCircle1, styles.decorCirclePurple]} />
        <View style={[styles.decorativeCircle, styles.decorCircle2, styles.decorCirclePurple]} />
        <View style={[styles.decorativeCircle, styles.decorCircle3, styles.decorCirclePurple]} />

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Badge rotativo de intervalo */}
          <Animated.View
            style={[
              styles.intervalBadge,
              { transform: [{ rotate }] }
            ]}
          >
            <Icon name="timer-outline" size={20} color="#6366F1" />
          </Animated.View>

          {/* Texto de intervalo */}
          <View style={styles.intervalTextContainer}>
            <Text style={styles.intervalText}>
              A cada {alarmData.intervaloHoras}h
            </Text>
          </View>

          {/* Badge de status roxo */}
          <View style={[styles.topBadgeContainer, styles.topBadgeContainerPurple]}>
            <Icon name="notifications" size={20} color="#6366F1" />
            <Text style={styles.topBadgeText}>HORA DO MEDICAMENTO</Text>
          </View>

          {/* Ícone principal roxo */}
          <Animated.View style={{ transform: [{ scale: glowAnim }] }}>
            <Animated.View
              style={[
                styles.iconCircle,
                styles.iconCirclePurple,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Icon name="medical-outline" size={70} color="#6366F1" />
            </Animated.View>
          </Animated.View>

          {/* Nome do medicamento */}
          <Text style={styles.medicationName}>{alarmData.remedioNome}</Text>

          {/* Container de dosagem roxo */}
          <View style={[styles.doseContainer, styles.doseContainerPurple]}>
            <Icon name="fitness-outline" size={20} color="#6366F1" />
            <Text style={styles.dosage}>{alarmData.dosagem}</Text>
          </View>

          {/* Container de horário roxo */}
          <View style={[styles.timeContainer, styles.timeContainerPurple]}>
            <Icon name="time-outline" size={24} color="#6366F1" />
            <Text style={styles.time}>Próximo: {alarmData.horarioInicio}</Text>
          </View>

          {/* Botão de ação roxo */}
          <Animated.View
            style={{ 
              transform: [{ scale: pulseAnim }], 
              width: '100%' 
            }}
          >
            <TouchableOpacity
              style={[styles.button, styles.buttonPurple]}
              onPress={async () => {
                try {
                  console.log('\n🔔 ========== BOTÃO ALARME INTERVALO PRESSIONADO ==========');
                  console.log('   📋 Medicamento:', alarmData.remedioNome);
                  console.log('   ⏰ Horário início:', alarmData.horarioInicio);
                  console.log('   ⏱️ Intervalo:', alarmData.intervaloHoras, 'horas');

                  // 1️⃣ FECHAR O ALARME (JÁ FAZ TUDO: cancela notifs + registra)
                  if (onDismiss) {
                    await onDismiss();
                  }

                  console.log('========== ALARME INTERVALO CONFIRMADO ==========\n');
                } catch (error) {
                  console.error('❌ Erro ao confirmar medicação:', error);
                }
              }}
              activeOpacity={0.9}
            >
              <View style={styles.buttonContent}>
                <Icon name="checkmark-circle" size={28} color="#FFFFFF" />
                <Text style={styles.buttonText}>TOMEI</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Indicadores roxos */}
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

          {/* Instrução roxa */}
          <View style={[styles.instructionContainer, styles.instructionContainerPurple]}>
            <Icon name="information-circle-outline" size={24} color="#6366F1" />
            <Text style={styles.instructionText}>
              Confirme que tomou{'\n'}seu medicamento
            </Text>
          </View>
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
  const verificacaoEmAndamento = useRef(false);
  const lembretesMostradosNaSessao = useRef(new Set()); // 🆕 Controla lembretes já mostrados nesta sessão

  const uid = auth().currentUser?.uid;

  // ⭐ FUNÇÃO: Verificar se medicamento já foi tomado (com cache otimizado)
  const verificarSeMedicamentoFoiTomado = useCallback(
    async (remedioId, horario, diaStr) => {
      try {
        const horarioNormalizado = normalizarHorario(horario);

        // Cache local primeiro
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

  // ⭐ CANCELAR TODAS AS NOTIFICAÇÕES DE UM MEDICAMENTO (MELHORADO)
  const cancelarTodasNotificacoesMedicamento = useCallback(
    async (remedioId, horario, diaStr) => {
      try {
        console.log('\n🧹 ========== CANCELANDO NOTIFICAÇÕES ==========');
        console.log('   📋 Remédio ID:', remedioId);
        console.log('   ⏰ Horário:', horario);
        console.log('   📅 Dia:', diaStr);

        const horarioNormalizado = normalizarHorario(horario);
        const horarioSemDoisPontos = horarioNormalizado.replace(':', '');

        // Lista de IDs de notificações para cancelar
        const notificationIds = [
          // Notificação principal (horário exato) - PADRÃO DO FormAlerta.js
          `alarm_${remedioId}_${horarioSemDoisPontos}_${diaStr}`,
          // Notificação de lembrete (10 minutos depois) - PADRÃO DO FormAlerta.js
          `alarm_${remedioId}_${horarioSemDoisPontos}_${diaStr}_reminder`,
          // Variações antigas (compatibilidade)
          `reminder_${remedioId}_${horarioSemDoisPontos}_${diaStr}`,
          `reminder_late_${remedioId}_${horarioSemDoisPontos}_${diaStr}`,
          `medication_${remedioId}_${horarioSemDoisPontos}_${diaStr}`,
          `interval_${remedioId}_${horarioSemDoisPontos}_${diaStr}`,
          `interval_${remedioId}_${horarioSemDoisPontos}_${diaStr}_reminder`,
        ];

        console.log('   🎯 IDs para cancelar:', notificationIds.length);

        let canceladas = 0;

        // Cancelar notificações por ID específico
        for (const notifId of notificationIds) {
          try {
            await notifee.cancelNotification(notifId);
            await notifee.cancelTriggerNotification(notifId);
            canceladas++;
            console.log(`   ✅ Cancelada: ${notifId}`);
          } catch (error) {
            // Silencioso - notificação pode não existir
          }
        }

        // Cancelar TODAS as notificações exibidas deste medicamento
        const displayedNotifications = await notifee.getDisplayedNotifications();
        console.log(`   📊 Notificações exibidas no sistema: ${displayedNotifications.length}`);

        for (const notif of displayedNotifications) {
          const notifRemedioId = notif.notification?.data?.remedioId;
          const notifHorario = notif.notification?.data?.horario;
          const notifDia = notif.notification?.data?.dia || diaStr;
          const notifId = notif.notification?.id || '';

          // Cancelar se for do mesmo remédio
          if (notifRemedioId === remedioId) {
            // Verificar horário se disponível
            if (notifHorario) {
              const notifHorarioNorm = normalizarHorario(notifHorario);
              if (notifHorarioNorm === horarioNormalizado && notifDia === diaStr) {
                await notifee.cancelNotification(notifId);
                canceladas++;
                console.log(`   ✅ Cancelada (exibida): ${notifId}`);
              }
            } else {
              // Se não tem horário, cancelar mesmo assim (pode ser notificação antiga)
              await notifee.cancelNotification(notifId);
              canceladas++;
              console.log(`   ✅ Cancelada (sem horário): ${notifId}`);
            }
          }

          // 🆕 CANCELAR TAMBÉM SE O ID CONTIVER O REMÉDIO E HORÁRIO
          if (notifId.includes(remedioId) && notifId.includes(horarioSemDoisPontos)) {
            await notifee.cancelNotification(notifId);
            canceladas++;
            console.log(`   ✅ Cancelada (por padrão ID): ${notifId}`);
          }
        }

        // Cancelar notificações agendadas (triggers)
        const triggerNotifications = await notifee.getTriggerNotifications();
        console.log(`   📊 Notificações agendadas: ${triggerNotifications.length}`);

        for (const trigger of triggerNotifications) {
          const triggerRemedioId = trigger.notification?.data?.remedioId;
          const triggerHorario = trigger.notification?.data?.horario;
          const triggerDia = trigger.notification?.data?.dia || diaStr;
          const triggerId = trigger.notification?.id || '';

          // Cancelar se for do mesmo remédio
          if (triggerRemedioId === remedioId) {
            if (triggerHorario) {
              const triggerHorarioNorm = normalizarHorario(triggerHorario);
              if (triggerHorarioNorm === horarioNormalizado && triggerDia === diaStr) {
                await notifee.cancelTriggerNotification(triggerId);
                canceladas++;
                console.log(`   ✅ Cancelada (agendada): ${triggerId}`);
              }
            } else {
              await notifee.cancelTriggerNotification(triggerId);
              canceladas++;
              console.log(`   ✅ Cancelada (agendada sem horário): ${triggerId}`);
            }
          }

          // 🆕 CANCELAR TAMBÉM SE O ID CONTIVER O REMÉDIO E HORÁRIO
          if (triggerId.includes(remedioId) && triggerId.includes(horarioSemDoisPontos)) {
            await notifee.cancelTriggerNotification(triggerId);
            canceladas++;
            console.log(`   ✅ Cancelada (agendada por padrão ID): ${triggerId}`);
          }
        }

        console.log(`   🎉 TOTAL: ${canceladas} notificação(ões) cancelada(s)`);
        console.log('========== FIM DO CANCELAMENTO ==========\n');
      } catch (error) {
        console.error('❌ Erro ao cancelar notificações:', error);
      }
    },
    [],
  );

  // FUNÇÃO: Enviar notificação de lembrete (APENAS NA PRIMEIRA VEZ DA SESSÃO)
  const enviarNotificacaoLembrete = useCallback(
    async (alerta, remedioNome) => {
      try {
        const now = new Date();
        const diaStr = now.toISOString().slice(0, 10);

        const horario = alerta.tipoAlerta === 'intervalo' ? alerta.horarioInicio : alerta.horario;
        const horarioNormalizado = normalizarHorario(horario);

        const foiTomadoAgora = await verificarSeMedicamentoFoiTomado(
          alerta.remedioId,
          horarioNormalizado,
          diaStr,
        );

        if (foiTomadoAgora) {
          console.log(`🚫 [LEMBRETE CANCELADO] ${remedioNome} já foi tomado`);
          await cancelarTodasNotificacoesMedicamento(
            alerta.remedioId,
            horarioNormalizado,
            diaStr,
          );
          return;
        }

        const chaveLembrete = `lembrete-${alerta.remedioId}-${horarioNormalizado}-${diaStr}`;

        // 🆕 VERIFICAR SE JÁ MOSTROU NESTA SESSÃO
        if (lembretesMostradosNaSessao.current.has(chaveLembrete)) {
          console.log('⏭️ [SESSÃO] Lembrete já foi mostrado ao abrir o app');
          return;
        }

        if (lembretesEnviados.current.has(chaveLembrete)) {
          console.log('⏭️ Lembrete já foi enviado anteriormente');
          return;
        }

        const channelId = await createNotificationChannel();
        const notifId = `reminder_${alerta.remedioId}_${horarioNormalizado.replace(':', '')}_${diaStr}`;

        lembretesEnviados.current.add(chaveLembrete);
        lembretesMostradosNaSessao.current.add(chaveLembrete); // 🆕 Marca como mostrado nesta sessão
        console.log('✅ Lembrete enviado (PRIMEIRA VEZ NA SESSÃO):', remedioNome);
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
        const horarioQueDeveriaTerSido = alerta.tipoAlerta === 'intervalo' ? alerta.horarioInicio : alerta.horario;
        const horarioNormalizado = normalizarHorario(horarioQueDeveriaTerSido);

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

        await firestore().collection('medicamentos_tomados').add(dadosParaSalvar);
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
        const novoHorario = `${String(proximaHora).padStart(2, '0')}:${String(proximoMinuto).padStart(2, '0')}`;

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

  // ⭐ FUNÇÃO PRINCIPAL: Verificar medicamentos
  const verificarMedicamentosNaoTomados = useCallback(async () => {
    if (!uid) return;

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

      if (ultimaLimpezaCache.current !== diaStr) {
        console.log('🗑️ Limpando cache - novo dia:', diaStr);
        processadosHoje.current.clear();
        lembretesEnviados.current.clear();
        lembretesMostradosNaSessao.current.clear(); // 🆕 Limpa também os lembretes da sessão
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

        // ALERTAS DE DIAS FIXOS
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
              console.log(`🔔 HORÁRIO EXATO: ${remedioNome} às ${horarioAlerta}`);

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

              const foiTomado = await verificarSeMedicamentoFoiTomado(
                alerta.remedioId,
                horarioAlerta,
                diaStr,
              );

              if (foiTomado) {
                console.log(`✅ ${remedioNome} já foi tomado - BLOQUEANDO lembrete`);
                processadosHoje.current.add(chaveAtraso);

                const chaveLembrete = `lembrete-${alerta.remedioId}-${normalizarHorario(horarioAlerta)}-${diaStr}`;
                lembretesEnviados.current.add(chaveLembrete);

                await cancelarTodasNotificacoesMedicamento(
                  alerta.remedioId,
                  horarioAlerta,
                  diaStr,
                );
                continue;
              }

              const chaveLembrete = `lembrete-${alerta.remedioId}-${normalizarHorario(horarioAlerta)}-${diaStr}`;
              if (lembretesEnviados.current.has(chaveLembrete)) {
                console.log(`⏭️ Lembrete de ${remedioNome} já foi enviado anteriormente`);
                processadosHoje.current.add(chaveAtraso);
                continue;
              }

              await registrarMedicamentoNaoTomado(alerta, diaStr, remedioNome);
              await enviarNotificacaoLembrete(alerta, remedioNome);
              processadosHoje.current.add(chaveAtraso);
            }
          }
        }

        // ALERTAS DE INTERVALO
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
              console.log(`🔔 HORÁRIO EXATO (INTERVALO): ${remedioNome} às ${horarioAlerta}`);

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
              console.log(`⚠️ ${remedioNome} (intervalo) atrasado ${diferencaMinutos}min`);

              const foiTomado = await verificarSeMedicamentoFoiTomado(
                alerta.remedioId,
                horarioAlerta,
                diaStr,
              );

              if (foiTomado) {
                console.log(`✅ ${remedioNome} (intervalo) já foi tomado - BLOQUEANDO lembrete`);
                processadosHoje.current.add(chaveAtraso);

                const chaveLembrete = `lembrete-${alerta.remedioId}-${normalizarHorario(horarioAlerta)}-${diaStr}`;
                lembretesEnviados.current.add(chaveLembrete);

                await cancelarTodasNotificacoesMedicamento(
                  alerta.remedioId,
                  horarioAlerta,
                  diaStr,
                );
                continue;
              }

              const chaveLembrete = `lembrete-${alerta.remedioId}-${normalizarHorario(horarioAlerta)}-${diaStr}`;
              if (lembretesEnviados.current.has(chaveLembrete)) {
                console.log(`⏭️ Lembrete de ${remedioNome} (intervalo) já foi enviado`);
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

  // ⭐ FUNÇÃO: Registrar medicamento tomado (tarde) - COM CANCELAMENTO
  const registrarMedicamentoTomadoTarde = useCallback(
    async notifData => {
      try {
        console.log('\n💊 ========== REGISTRANDO MEDICAMENTO ATRASADO ==========');
        console.log('   📋 Medicamento:', notifData.remedioNome);
        console.log('   ⏰ Horário agendado:', notifData.horario);

        const now = new Date();
        const diaStr = now.toISOString().slice(0, 10);
        const horarioAtual = now.toTimeString().slice(0, 5);
        const horarioAgendadoNormalizado = normalizarHorario(notifData.horario);

        // 1️⃣ CANCELAR NOTIFICAÇÕES PRIMEIRO
        console.log('🧹 Cancelando notificações...');
        await cancelarTodasNotificacoesMedicamento(
          notifData.remedioId,
          horarioAgendadoNormalizado,
          diaStr,
        );

        // 2️⃣ ATUALIZAR CACHES
        const cacheKey = `tomado-${notifData.remedioId}-${horarioAgendadoNormalizado}-${diaStr}`;
        processadosHoje.current.add(cacheKey);

        const chaveAtraso = `atraso-${notifData.remedioId}-${horarioAgendadoNormalizado}-${diaStr}`;
        processadosHoje.current.add(chaveAtraso);

        if (notifData.tipoAlerta === 'intervalo') {
          const chaveAtrasoIntervalo = `atraso-intervalo-${notifData.remedioId}-${horarioAgendadoNormalizado}-${diaStr}`;
          processadosHoje.current.add(chaveAtrasoIntervalo);
        }

        const chaveLembrete = `lembrete-${notifData.remedioId}-${horarioAgendadoNormalizado}-${diaStr}`;
        lembretesEnviados.current.add(chaveLembrete);

        console.log('🔒 Caches atualizados');

        // 3️⃣ VERIFICAR SE JÁ EXISTE REGISTRO
        const registroExistente = await firestore()
          .collection('medicamentos_tomados')
          .where('usuarioId', '==', uid)
          .where('remedioId', '==', notifData.remedioId)
          .where('dia', '==', diaStr)
          .where('horarioAgendado', '==', horarioAgendadoNormalizado)
          .get();

        if (!registroExistente.empty) {
          console.log('⚠️ Medicamento já estava registrado');
          console.log('========== FIM DO REGISTRO ==========\n');
          return;
        }

        // 4️⃣ REGISTRAR NO FIRESTORE
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

        console.log('✅ Medicamento registrado como tomado (atrasado)');
        console.log('========== FIM DO REGISTRO ==========\n');
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

  // ⭐ FECHAR ALARME (COM CANCELAMENTO COMPLETO)
  const dismissAlarm = useCallback(async () => {
    console.log('\n✅ ========== CONFIRMANDO MEDICAMENTO ==========');

    if (currentAlarm) {
      const now = new Date();
      const diaStr = now.toISOString().slice(0, 10);
      const horarioAtual = now.toTimeString().slice(0, 5);
      const horarioAgendado = normalizarHorario(
        currentAlarm.horario || currentAlarm.horarioInicio,
      );

      console.log('   💊 Medicamento:', currentAlarm.remedioNome);
      console.log('   ⏰ Horário agendado:', horarioAgendado);
      console.log('   ⏰ Horário real:', horarioAtual);

      // 1️⃣ CANCELAR NOTIFICAÇÕES PRIMEIRO (antes de registrar)
      console.log('\n🧹 Cancelando notificações...');
      await cancelarTodasNotificacoesMedicamento(
        currentAlarm.remedioId,
        horarioAgendado,
        diaStr,
      );

      // 2️⃣ VERIFICAR SE JÁ EXISTE REGISTRO
      const registroExistente = await firestore()
        .collection('medicamentos_tomados')
        .where('usuarioId', '==', uid)
        .where('remedioId', '==', currentAlarm.remedioId)
        .where('dia', '==', diaStr)
        .where('horarioAgendado', '==', horarioAgendado)
        .get();

      if (registroExistente.empty) {
        // 3️⃣ REGISTRAR NO FIRESTORE
        console.log('💾 Registrando medicamento como tomado...');
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

        console.log('✅ Medicamento registrado com sucesso!');
      } else {
        console.log('⚠️ Medicamento já estava registrado');
      }

      // 4️⃣ ATUALIZAR CACHES LOCAIS
      const cacheKey = `tomado-${currentAlarm.remedioId}-${horarioAgendado}-${diaStr}`;
      processadosHoje.current.add(cacheKey);

      const chaveAtraso = `atraso-${currentAlarm.remedioId}-${horarioAgendado}-${diaStr}`;
      processadosHoje.current.add(chaveAtraso);

      if (currentAlarm.tipoAlerta === 'intervalo') {
        const chaveAtrasoIntervalo = `atraso-intervalo-${currentAlarm.remedioId}-${horarioAgendado}-${diaStr}`;
        processadosHoje.current.add(chaveAtrasoIntervalo);
      }

      const chaveLembrete = `lembrete-${currentAlarm.remedioId}-${horarioAgendado}-${diaStr}`;
      lembretesEnviados.current.add(chaveLembrete);

      console.log('🔒 Caches atualizados');
    }

    console.log('========== FIM DA CONFIRMAÇÃO ==========\n');

    // 5️⃣ PARAR SOM E VIBRAÇÃO
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

  // ⭐ EFEITO: Registrar handlers de notificação
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

            const type = notifData.tipoAlerta === 'intervalo' ? 'intervalo' : 'horario';
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
          const horarioAgendadoNormalizado = normalizarHorario(notifData.horario);

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

          const displayedNotifications = await notifee.getDisplayedNotifications();
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

    const subscription = AppState.addEventListener('change', handleAppStateChange);

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
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    position: 'relative',
  },
  backgroundCircle: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    borderRadius: width,
    backgroundColor: '#3B82F6',
    top: -width * 0.8,
    left: -width * 0.5,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: '#3B82F6',
    bottom: -width * 0.6,
    right: -width * 0.4,
  },
  backgroundCirclePurple: {
    backgroundColor: '#6366F1',
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
  decorCirclePurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    zIndex: 10,
  },
  topBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  topBadgeContainerPurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: 'rgba(99, 102, 241, 0.25)',
    shadowColor: '#6366F1',
  },
  topBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 10,
    letterSpacing: 1,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 12,
  },
  intervalTextContainer: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    marginBottom: 16,
  },
  intervalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#A5B4FC',
    letterSpacing: 0.5,
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    marginBottom: 20,
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
    marginBottom: 12,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  doseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  doseContainerPurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  dosage: {
    fontSize: 20,
    fontWeight: '600',
    color: '#D1D5DB',
    marginLeft: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
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
    marginLeft: 12,
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 20,
    paddingHorizontal: 50,
    borderRadius: 25,
    width: '100%',
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    marginBottom: 20,
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
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginLeft: 12,
  },
  indicators: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  instructionContainerPurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  instructionText: {
    fontSize: 16,
    color: '#D1D5DB',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default AlarmSystem;