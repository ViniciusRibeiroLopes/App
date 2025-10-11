/**
 * @fileoverview Sistema completo de notificações para PillCheck
 * Gerencia notificações locais, agendadas e em tempo real
 * @version 2.0.0
 */

import {useEffect, useRef, useCallback} from 'react';
import notifee, {
  AndroidImportance,
  AndroidCategory,
  AndroidVisibility,
  TriggerType,
  RepeatFrequency,
  EventType,
} from '@notifee/react-native';
import PushNotification from 'react-native-push-notification';
import {Platform, AppState} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

/**
 * Inicializa e configura canais de notificação do Android
 * Deve ser chamado no início da aplicação
 */
export const initializeNotificationChannels = async () => {
  try {
    // Canal para alarmes de medicamentos
    await notifee.createChannel({
      id: 'alarm-channel',
      name: 'Alarmes de Medicação',
      description: 'Notificações de lembretes de medicamentos',
      importance: AndroidImportance.MAX,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
      lights: true,
      lightColor: '#4D97DB',
      vibration: true,
    });

    // Canal para notificações urgentes
    await notifee.createChannel({
      id: 'urgent-channel',
      name: 'Notificações Urgentes',
      description: 'Alertas urgentes do sistema',
      importance: AndroidImportance.MAX,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
      lights: true,
      lightColor: '#E53E3E',
      vibration: true,
    });

    // Canal para notificações gerais
    await notifee.createChannel({
      id: 'general-channel',
      name: 'Notificações Gerais',
      description: 'Notificações gerais do PillCheck',
      importance: AndroidImportance.DEFAULT,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
    });

    console.log('✅ Canais de notificação inicializados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar canais:', error);
  }
};

/**
 * Configura listeners para eventos de notificação (cliques, ações, etc)
 * @param {Function} onNotificationOpen - Callback quando notificação é aberta
 */
export const setupNotificationListeners = onNotificationOpen => {
  // Listener para quando o usuário interage com a notificação
  const unsubscribe = notifee.onForegroundEvent(({type, notification}) => {
    console.log('Evento de notificação em foreground:', type);

    if (type === EventType.PRESS) {
      console.log('Notificação pressionada:', notification.body);
      if (onNotificationOpen) {
        onNotificationOpen(notification);
      }
    }

    if (type === EventType.ACTION_PRESS) {
      const actionId = notification.data?.actionId;
      console.log('Ação de notificação:', actionId);
      // Processar ações customizadas se houver
    }
  });

  // Listener para notificações em background/closed
  notifee.onBackgroundEvent(async ({type, notification}) => {
    console.log('Evento de notificação em background:', type);

    if (type === EventType.PRESS) {
      console.log('Notificação pressionada em background');
      // Processo no background quando necessário
    }
  });

  return unsubscribe;
};

/**
 * Agenda uma notificação de medicamento para uma hora específica
 * @param {Object} medicamento - Dados do medicamento
 * @param {string} medicamento.id - ID do medicamento
 * @param {string} medicamento.nome - Nome do medicamento
 * @param {string} medicamento.dosagem - Dosagem do medicamento
 * @param {string} medicamento.horario - Horário (HH:MM)
 * @param {Array} medicamento.dias - Dias da semana [seg, ter, etc]
 */
export const agendarNotificacaoMedicamento = async medicamento => {
  try {
    if (!medicamento || !medicamento.horario) {
      console.warn('Dados do medicamento inválidos');
      return null;
    }

    const [hora, minuto] = medicamento.horario.split(':').map(Number);
    const proximaData = new Date();

    // Calcular próximo dia de administração
    const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const hojeIndex = proximaData.getDay();
    let proximoDiaIndex = null;

    for (let i = 1; i <= 7; i++) {
      const idx = (hojeIndex + i) % 7;
      const abrev = diasSemana[idx];
      const diasMedicamento = Array.isArray(medicamento.dias)
        ? medicamento.dias.map(d => d.toLowerCase())
        : medicamento.dias
            .toLowerCase()
            .split(',')
            .map(d => d.trim());

      if (diasMedicamento.includes(abrev)) {
        proximoDiaIndex = idx;
        break;
      }
    }

    if (proximoDiaIndex === null) {
      console.warn('Nenhum dia válido encontrado para o medicamento');
      return null;
    }

    proximaData.setDate(
      proximaData.getDate() + ((proximoDiaIndex - hojeIndex + 7) % 7) || 7,
    );
    proximaData.setHours(hora, minuto, 0, 0);

    const notificacaoId = `med_${medicamento.id}_${proximaData.getTime()}`;

    const trigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: proximaData.getTime(),
      repeatFrequency: RepeatFrequency.WEEKLY,
    };

    await notifee.createTriggerNotification(
      {
        id: notificacaoId,
        title: '💊 Hora de tomar seu medicamento',
        body: `${medicamento.nome} - Dosagem: ${medicamento.dosagem}`,
        data: {
          medicamentoId: medicamento.id,
          medicamentoNome: medicamento.nome,
          dosagem: medicamento.dosagem,
          horario: medicamento.horario,
          type: 'medicamento',
        },
        android: {
          channelId: 'alarm-channel',
          category: AndroidCategory.ALARM,
          largeIcon: 'https://via.placeholder.com/128?text=Pill',
          importance: AndroidImportance.MAX,
          visibility: AndroidVisibility.PUBLIC,
          autoCancel: true,
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          fullScreenAction: {
            id: 'default',
          },
          sound: 'default',
          priority: AndroidImportance.MAX,
          ongoing: false,
          actions: [
            {
              title: '✓ Medicamento Tomado',
              pressAction: {id: 'confirm'},
            },
            {
              title: '⏰ Lembrar depois',
              pressAction: {id: 'snooze'},
            },
          ],
        },
      },
      trigger,
    );

    console.log(
      `✅ Notificação agendada para ${proximaData.toLocaleString('pt-BR')}`,
    );
    return notificacaoId;
  } catch (error) {
    console.error('❌ Erro ao agendar notificação:', error);
    return null;
  }
};

/**
 * Remove uma notificação agendada
 * @param {string} notificacaoId - ID da notificação a remover
 */
export const cancelarNotificacao = async notificacaoId => {
  try {
    await notifee.cancelNotification(notificacaoId);
    console.log(`✅ Notificação ${notificacaoId} cancelada`);
  } catch (error) {
    console.error('❌ Erro ao cancelar notificação:', error);
  }
};

/**
 * Exibe uma notificação imediata
 * @param {Object} opcoes - Opções da notificação
 */
export const mostrarNotificacaoImediata = async opcoes => {
  try {
    const {
      titulo = 'PillCheck',
      mensagem = 'Nova notificação',
      tipo = 'general', // general, alarm, urgent
      dados = {},
    } = opcoes;

    const canais = {
      general: 'general-channel',
      alarm: 'alarm-channel',
      urgent: 'urgent-channel',
    };

    await notifee.displayNotification({
      title: titulo,
      body: mensagem,
      data: dados,
      android: {
        channelId: canais[tipo],
        importance:
          tipo === 'urgent' ? AndroidImportance.MAX : AndroidImportance.DEFAULT,
        visibility: AndroidVisibility.PUBLIC,
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        autoCancel: true,
      },
    });

    console.log('✅ Notificação imediata exibida');
  } catch (error) {
    console.error('❌ Erro ao exibir notificação:', error);
  }
};

/**
 * Hook customizado para gerenciar todas as notificações do app
 * Sincroniza notificações com alertas do Firestore
 */
export const useNotificationManager = () => {
  const notificationIdsRef = useRef(new Map());
  const appStateRef = useRef(AppState.currentState);
  const unsubscribeRef = useRef(null);
  const user = auth().currentUser;

  /**
   * Sincroniza notificações com alertas do Firestore
   */
  const sincronizarNotificacoes = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔄 Sincronizando notificações...');

      const snapshot = await firestore()
        .collection('alertas')
        .where('usuarioId', '==', user.uid)
        .where('ativo', '==', true)
        .get();

      if (!snapshot.docs.length) {
        console.log('Nenhum alerta ativo encontrado');
        return;
      }

      for (const doc of snapshot.docs) {
        const alerta = doc.data();
        const remedioDoc = await firestore()
          .collection('remedios')
          .doc(alerta.remedioId)
          .get();

        if (remedioDoc.exists) {
          const remedio = remedioDoc.data();
          const notificacaoId = await agendarNotificacaoMedicamento({
            id: alerta.remedioId,
            nome: remedio.nome,
            dosagem: alerta.dosagem,
            horario: alerta.horario,
            dias: alerta.dias,
          });

          if (notificacaoId) {
            notificationIdsRef.current.set(alerta.remedioId, notificacaoId);
          }
        }
      }

      console.log('✅ Notificações sincronizadas com sucesso');
    } catch (error) {
      console.error('❌ Erro ao sincronizar notificações:', error);
    }
  }, [user]);

  /**
   * Inicializa o sistema de notificações
   */
  const inicializar = useCallback(async () => {
    try {
      console.log('🚀 Iniciando sistema de notificações...');

      await initializeNotificationChannels();

      unsubscribeRef.current = setupNotificationListeners(notification => {
        console.log('Notificação aberta:', notification);
        // Aqui você pode navegar para a tela apropriada
      });

      await sincronizarNotificacoes();

      console.log('✅ Sistema de notificações iniciado');
    } catch (error) {
      console.error('❌ Erro ao inicializar sistema de notificações:', error);
    }
  }, [sincronizarNotificacoes]);

  /**
   * Listener para mudanças de estado do app
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App voltou do background - ressincronizar notificações
        console.log('📱 App retornou ao foreground, ressincronizando...');
        sincronizarNotificacoes();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [sincronizarNotificacoes]);

  /**
   * Limpar recursos
   */
  const limpar = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    notificationIdsRef.current.clear();
  }, []);

  return {
    inicializar,
    sincronizarNotificacoes,
    agendarNotificacao: agendarNotificacaoMedicamento,
    cancelarNotificacao,
    mostrarNotificacaoImediata,
    limpar,
  };
};

export default {
  initializeNotificationChannels,
  setupNotificationListeners,
  agendarNotificacaoMedicamento,
  cancelarNotificacao,
  mostrarNotificacaoImediata,
  useNotificationManager,
};
