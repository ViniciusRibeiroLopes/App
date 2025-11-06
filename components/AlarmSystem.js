// AlarmSystem.js - VERSÃO CORRIGIDA
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
  }, [visible, scaleAnim, pulseAnim, backgroundAnim, glowAnim, rotateAnim]);

  if (!visible || !alarmData) {
    return null;
  }

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
          <Animated.View
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
  const lembretesEnviados = useRef(new Set()); // ✅ NOVO: Controlar lembretes únicos
  const ultimaLimpezaCache = useRef(null); // ✅ NOVO: Controlar limpeza de cache

  const uid = auth().currentUser?.uid;

  // ⭐ FUNÇÃO: Verificar se medicamento já foi tomado
  const verificarSeMedicamentoFoiTomado = useCallback(
    async (remedioId, horario, diaStr) => {
      try {
        const registroSnapshot = await firestore()
          .collection('medicamentos_tomados')
          .where('usuarioId', '==', uid)
          .where('remedioId', '==', remedioId)
          .where('dia', '==', diaStr)
          .where('horarioAgendado', '==', horario)
          .where('status', '==', 'tomado')
          .get();

        return !registroSnapshot.empty;
      } catch (error) {
        console.error('❌ Erro ao verificar registro:', error);
        return false;
      }
    },
    [uid],
  );

  // ⭐ FUNÇÃO: Enviar notificação de lembrete (APENAS UMA VEZ)
  const enviarNotificacaoLembrete = useCallback(async (alerta, remedioNome) => {
    try {
      const now = new Date();
      const diaStr = now.toISOString().slice(0, 10);

      const horario =
        alerta.tipoAlerta === 'intervalo'
          ? alerta.horarioInicio
          : alerta.horario;

      // ✅ NOVO: Chave única para controlar se o lembrete já foi enviado
      const chaveLembrete = `${alerta.remedioId}-${horario}-${diaStr}-lembrete`;

      if (lembretesEnviados.current.has(chaveLembrete)) {
        console.log('⏭️ Lembrete já foi enviado para este medicamento hoje');
        return;
      }

      const channelId = await createNotificationChannel();

      await notifee.displayNotification({
        id: `reminder_${alerta.remedioId}_${horario.replace(
          ':',
          '',
        )}_${diaStr}`,
        title: '⚠️ Você ainda não tomou seu medicamento!',
        body: `${remedioNome} - ${alerta.dosagem} (${horario})`,
        android: {
          channelId,
          smallIcon: 'icon',
          category: AndroidCategory.ALARM,
          autoCancel: false,
          sound: 'default',
          importance: AndroidImportance.HIGH,
          color: '#F59E0B',
          vibrationPattern: [300, 500, 300, 500],
        },
        data: {
          remedioId: String(alerta.remedioId || ''),
          remedioNome: String(remedioNome || ''),
          dosagem: String(alerta.dosagem || ''),
          horario: String(horario || ''),
          tipoAlerta: String(alerta.tipoAlerta || ''),
          isReminder: 'true',
        },
      });

      // ✅ NOVO: Marcar que o lembrete foi enviado
      lembretesEnviados.current.add(chaveLembrete);

      console.log('✅ Notificação de lembrete enviada (ÚNICA):', remedioNome);
    } catch (error) {
      console.error('❌ Erro ao enviar lembrete:', error);
    }
  }, []);

  // ⭐ FUNÇÃO: Registrar medicamento como não tomado
  const registrarMedicamentoNaoTomado = useCallback(
    async (alerta, diaStr, remedioNome) => {
      try {
        const horarioQueDeveriaTerSido =
          alerta.tipoAlerta === 'intervalo'
            ? alerta.horarioInicio
            : alerta.horario;

        // ✅ Verificar se já existe QUALQUER registro para este medicamento no horário
        const registrosExistentes = await firestore()
          .collection('medicamentos_tomados')
          .where('usuarioId', '==', uid)
          .where('remedioId', '==', alerta.remedioId)
          .where('dia', '==', diaStr)
          .where('horarioAgendado', '==', horarioQueDeveriaTerSido)
          .get();

        if (!registrosExistentes.empty) {
          console.log(
            '⏭️ Já existe registro para este medicamento (tomado ou não tomado)',
          );
          return;
        }

        const dadosParaSalvar = {
          dia: diaStr,
          dosagem: alerta.dosagem,
          horario: horarioQueDeveriaTerSido,
          horarioAgendado: horarioQueDeveriaTerSido,
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

        console.log(
          '✅ Registrado como NÃO TOMADO:',
          remedioNome,
          horarioQueDeveriaTerSido,
        );
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

        // Verificar se ainda é hoje
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

  // ⭐ FUNÇÃO PRINCIPAL: Verificar medicamentos (HORÁRIO EXATO + ATRASADOS)
  const verificarMedicamentosNaoTomados = useCallback(async () => {
    if (!uid) return;

    try {
      const now = new Date();
      const currentTimeStr = now.toTimeString().slice(0, 5);
      const currentDay = diasSemana[now.getDay()].abrev;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diaStr = today.toISOString().slice(0, 10);

      // Limpar cache se mudou o dia
      if (ultimaLimpezaCache.current !== diaStr) {
        console.log('🗑️ Limpando cache - novo dia detectado:', diaStr);
        processadosHoje.current.clear();
        lembretesEnviados.current.clear();
        ultimaLimpezaCache.current = diaStr;
      }

      // Buscar todos os alertas ativos
      const todosAlertasSnapshot = await firestore()
        .collection('alertas')
        .where('usuarioId', '==', uid)
        .where('ativo', '==', true)
        .get();

      for (const doc of todosAlertasSnapshot.docs) {
        const alerta = doc.data();

        // Buscar nome do remédio
        const remedioDoc = await firestore()
          .collection('remedios')
          .doc(alerta.remedioId)
          .get();

        if (!remedioDoc.exists) continue;

        const remedioNome = remedioDoc.data().nome;

        // ========== PROCESSAR ALERTAS DE DIAS FIXOS ==========
        if (alerta.tipoAlerta === 'dias') {
          if (!alerta.dias || !Array.isArray(alerta.dias)) continue;
          if (!alerta.dias.includes(currentDay)) continue;

          const horarioAlerta = alerta.horario;
          const [hAlerta, mAlerta] = horarioAlerta.split(':').map(Number);
          const minutosAlerta = hAlerta * 60 + mAlerta;

          const [hAtual, mAtual] = currentTimeStr.split(':').map(Number);
          const minutosAtuais = hAtual * 60 + mAtual;

          const diferencaMinutos = minutosAtuais - minutosAlerta;

          // ✅ NOVO: Disparar alarme no HORÁRIO EXATO (0 a 1 minuto)
          if (diferencaMinutos >= 0 && diferencaMinutos <= 1) {
            const chaveHorarioExato = `${alerta.remedioId}-${horarioAlerta}-${diaStr}-exato`;

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
                processadosHoje.current.add(chaveHorarioExato);
              } else {
                processadosHoje.current.add(chaveHorarioExato);
              }
            }
          }

          // ✅ Se passou 10 minutos (lembrete de atraso) - APENAS UMA VEZ
          if (diferencaMinutos >= 10 && diferencaMinutos < 1440) {
            const chaveAtraso = `${alerta.remedioId}-${horarioAlerta}-${diaStr}-atraso`;

            if (!processadosHoje.current.has(chaveAtraso)) {
              console.log(
                `⚠️ Medicamento ${remedioNome} passou 10min (${diferencaMinutos}min)`,
              );

              const foiTomado = await verificarSeMedicamentoFoiTomado(
                alerta.remedioId,
                horarioAlerta,
                diaStr,
              );

              if (!foiTomado) {
                // Registrar como não tomado
                await registrarMedicamentoNaoTomado(
                  alerta,
                  diaStr,
                  remedioNome,
                );

                // Enviar notificação de lembrete (APENAS UMA VEZ)
                await enviarNotificacaoLembrete(alerta, remedioNome);
              } else {
                console.log(`✅ ${remedioNome} já foi tomado`);
              }

              // ✅ IMPORTANTE: Marcar como processado SEMPRE, independente se foi tomado ou não
              processadosHoje.current.add(chaveAtraso);
            }
          }
        }

        // ========== PROCESSAR ALERTAS DE INTERVALO ==========
        else if (alerta.tipoAlerta === 'intervalo') {
          const horarioAlerta = alerta.horarioInicio;
          const [hAlerta, mAlerta] = horarioAlerta.split(':').map(Number);
          const minutosAlerta = hAlerta * 60 + mAlerta;

          const [hAtual, mAtual] = currentTimeStr.split(':').map(Number);
          const minutosAtuais = hAtual * 60 + mAtual;

          const diferencaMinutos = minutosAtuais - minutosAlerta;

          // ✅ NOVO: Disparar alarme no HORÁRIO EXATO (0 a 1 minuto)
          if (diferencaMinutos >= 0 && diferencaMinutos <= 1) {
            const chaveHorarioExato = `${alerta.remedioId}-${horarioAlerta}-${diaStr}-intervalo-exato`;

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
                processadosHoje.current.add(chaveHorarioExato);
              } else {
                processadosHoje.current.add(chaveHorarioExato);
              }
            }
          }

          // ✅ MODIFICADO: Se passou 10 minutos (lembrete de atraso)
          if (diferencaMinutos >= 10 && diferencaMinutos <= 1440) {
            const chaveAtraso = `${alerta.remedioId}-${horarioAlerta}-${diaStr}-intervalo-atraso`;

            if (!processadosHoje.current.has(chaveAtraso)) {
              console.log(
                `⚠️ Medicamento INTERVALO ${remedioNome} passou 10min (${diferencaMinutos}min)`,
              );

              const foiTomado = await verificarSeMedicamentoFoiTomado(
                alerta.remedioId,
                horarioAlerta,
                diaStr,
              );

              if (!foiTomado) {
                // Registrar como não tomado
                await registrarMedicamentoNaoTomado(
                  alerta,
                  diaStr,
                  remedioNome,
                );

                // Enviar notificação de lembrete (APENAS UMA VEZ)
                await enviarNotificacaoLembrete(alerta, remedioNome);

                // Atualizar próximo horário
                await atualizarProximoHorarioIntervalo(alerta, doc.id);

                processadosHoje.current.add(chaveAtraso);
              } else {
                console.log(`✅ ${remedioNome} (intervalo) já foi tomado`);
                processadosHoje.current.add(chaveAtraso);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao verificar medicamentos não tomados:', error);
    }
  }, [
    uid,
    verificarSeMedicamentoFoiTomado,
    triggerAlarm,
    registrarMedicamentoNaoTomado,
    enviarNotificacaoLembrete,
    atualizarProximoHorarioIntervalo,
  ]);

  // ⭐ FUNÇÃO: Registrar medicamento tomado (tarde)
  const registrarMedicamentoTomadoTarde = useCallback(
    async notifData => {
      try {
        console.log('💊 Registrando medicamento tomado (atrasado):', notifData);

        const now = new Date();
        const diaStr = now.toISOString().slice(0, 10);
        const horarioAtual = now.toTimeString().slice(0, 5);

        const dados = {
          usuarioId: uid,
          remedioId: notifData.remedioId,
          remedioNome: notifData.remedioNome || '',
          dosagem: notifData.dosagem || '',
          dia: diaStr,
          horario: horarioAtual,
          horarioAgendado: notifData.horario,
          timestamp: firestore.FieldValue.serverTimestamp(),
          status: 'tomado',
          atrasado: true,
          tipoAlerta: notifData.tipoAlerta || 'dias',
        };

        await firestore().collection('medicamentos_tomados').add(dados);

        console.log('✅ Medicamento registrado como tomado (atrasado)');
      } catch (error) {
        console.error('❌ Erro ao registrar medicamento:', error);
      }
    },
    [uid],
  );

  // ⭐ INICIALIZAR SOM DO ALARME
  const initializeAlarmSound = useCallback(() => {
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

      console.log('🔔 Disparando alarme visual para:', alarmData);
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

  // ⭐ FECHAR ALARME
  const dismissAlarm = useCallback(async () => {
    console.log('✅ Fechando alarme');

    // ✅ Registrar como tomado
    if (currentAlarm) {
      const now = new Date();
      const diaStr = now.toISOString().slice(0, 10);
      const horarioAtual = now.toTimeString().slice(0, 5);
      const horarioAgendado =
        currentAlarm.horario || currentAlarm.horarioInicio;

      // Verificar se já existe registro para evitar duplicatas
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
          horarioAgendado: horarioAgendado,
          timestamp: firestore.FieldValue.serverTimestamp(),
          status: 'tomado',
          atrasado: false,
          tipoAlerta: currentAlarm.tipoAlerta,
        });

        console.log('✅ Medicamento registrado como tomado');
      } else {
        console.log('⚠️ Medicamento já estava registrado como tomado');
      }
    }

    stopAlarmSound();
    Vibration.cancel();
    setShowAlarm(false);

    setTimeout(() => {
      setCurrentAlarm(null);
      setAlarmType(null);
    }, 500);
  }, [stopAlarmSound, currentAlarm, uid]);

  // ⭐ INICIAR VERIFICAÇÃO PERIÓDICA
  const startPeriodicCheck = useCallback(() => {
    if (checkInterval.current) {
      return;
    }

    console.log('⏰ Iniciando verificação periódica...');

    // Verificação imediata
    verificarMedicamentosNaoTomados();

    // Verificação a cada 1 minuto
    checkInterval.current = BackgroundTimer.setInterval(() => {
      console.log('[INTERVALO] Verificando medicamentos...');
      verificarMedicamentosNaoTomados();
    }, 60000); // 60 segundos
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
  }, [stopPeriodicCheck, stopAlarmSound]);

  // ⭐ EFEITO: Registrar handlers de notificação
  useEffect(() => {
    console.log('📡 Registrando handlers de notificação...');

    // Handler de foreground (app aberto)
    const unsubscribeForeground = notifee.onForegroundEvent(
      async ({type, detail}) => {
        console.log('📱 [FOREGROUND] Evento:', type);

        // ✅ NOVO: Quando notificação for entregue, disparar alarme visual
        if (type === EventType.DELIVERED) {
          const notifData = detail.notification?.data;

          // Só disparar para notificações principais, não para lembretes
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

            // Cancelar notificação
            if (detail.notification?.id) {
              await notifee.cancelNotification(detail.notification.id);
            }

            // Cancelar todas as notificações relacionadas
            const displayedNotifications =
              await notifee.getDisplayedNotifications();
            for (const notif of displayedNotifications) {
              const notifRemedioId = notif.notification?.data?.remedioId;
              if (notifRemedioId === notifData.remedioId) {
                await notifee.cancelNotification(notif.notification.id);
              }
            }
          }
        }
      },
    );

    // Handler de background (app fechado)
    notifee.onBackgroundEvent(async ({type, detail}) => {
      console.log('🌙 [BACKGROUND] Evento:', type);

      if (
        type === EventType.ACTION_PRESS &&
        detail.pressAction?.id === 'confirm_late'
      ) {
        const notifData = detail.notification?.data;
        if (notifData && notifData.isReminder === 'true') {
          console.log('👆 [BACKGROUND] Usuário confirmou medicamento atrasado');

          // Registrar no Firestore
          const uid = auth().currentUser?.uid;
          if (!uid) return;

          const now = new Date();
          const diaStr = now.toISOString().slice(0, 10);
          const horarioAtual = now.toTimeString().slice(0, 5);

          const dados = {
            usuarioId: uid,
            remedioId: notifData.remedioId,
            remedioNome: notifData.remedioNome || '',
            dosagem: notifData.dosagem || '',
            dia: diaStr,
            horario: horarioAtual,
            horarioAgendado: notifData.horario,
            timestamp: firestore.FieldValue.serverTimestamp(),
            status: 'tomado',
            atrasado: true,
            tipoAlerta: notifData.tipoAlerta || 'dias',
          };

          await firestore().collection('medicamentos_tomados').add(dados);

          // Cancelar notificação
          if (detail.notification?.id) {
            await notifee.cancelNotification(detail.notification.id);
          }

          console.log('✅ [BACKGROUND] Medicamento registrado');
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
