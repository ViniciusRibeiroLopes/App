import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  StatusBar,
  Dimensions,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Animated,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import notifee, {
  AndroidImportance,
  AndroidCategory,
  TriggerType,
  AndroidStyle,
  EventType,
  AlarmType,
} from '@notifee/react-native';

const {width, height} = Dimensions.get('window');

const isSmallScreen = width < 360;

const diasSemana = [
  {abrev: 'Dom', completo: 'Domingo'},
  {abrev: 'Seg', completo: 'Segunda'},
  {abrev: 'Ter', completo: 'Terça'},
  {abrev: 'Qua', completo: 'Quarta'},
  {abrev: 'Qui', completo: 'Quinta'},
  {abrev: 'Sex', completo: 'Sexta'},
  {abrev: 'Sáb', completo: 'Sábado'},
];

// ===== FUNÇÕES DE NOTIFICAÇÃO =====

async function createNotificationChannel() {
  try {
    const channelId = await notifee.createChannel({
      id: 'alarm-channel-dependente',
      name: 'Alarmes de Medicação - Dependentes',
      sound: 'default',
      importance: AndroidImportance.HIGH,
      vibration: true,
      lights: true,
      bypassDnd: true,
    });
    return channelId;
  } catch (error) {
    console.error('Erro ao criar canal:', error);
    return 'alarm-channel-dependente';
  }
}

async function scheduleNotification(id, title, body, triggerDate, alarmData) {
  try {
    console.log(`  📲 Criando notificação: ${id}`);
    console.log(`     Horário: ${triggerDate.toLocaleString('pt-BR')}`);

    const channelId = await createNotificationChannel();

    const trigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerDate.getTime(),
      alarmManager: {
        type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
        allowWhileIdle: true,
      },
    };

    const notificationConfig = {
      id,
      title,
      body,
      android: {
        channelId,
        smallIcon: 'icon',
        category: AndroidCategory.ALARM,
        autoCancel: false,
        sound: 'default',
        importance: AndroidImportance.HIGH,
        visibility: 1,
        showTimestamp: true,
        timestamp: Date.now(),
        fullScreenAction: {
          id: 'default',
          launchActivity: 'default',
        },
        pressAction: {
          id: 'default',
        },
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
        horarioInicio: String(alarmData?.horarioInicio || ''),
        alertaId: String(alarmData?.alertaId || ''),
        usuarioId: String(alarmData?.usuarioId || ''),
        dependenteId: String(alarmData?.dependenteId || ''),
        dependenteNome: String(alarmData?.dependenteNome || ''),
      },
    };

    await notifee.createTriggerNotification(notificationConfig, trigger);
    console.log(`     ✅ Notificação principal criada`);

    // Agendar notificação de lembrete 10 minutos depois
    const reminderDate = new Date(triggerDate.getTime() + 10 * 60 * 1000);
    const reminderId = `${id}_reminder`;

    const reminderTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: reminderDate.getTime(),
      alarmManager: {
        type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
        allowWhileIdle: true,
      },
    };

    const reminderConfig = {
      id: reminderId,
      title: `⚠️ Lembrete: ${alarmData?.dependenteNome || 'Dependente'}`,
      body: `Ainda não tomou: ${body}`,
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        category: AndroidCategory.ALARM,
        autoCancel: false,
        sound: 'default',
        importance: AndroidImportance.HIGH,
        visibility: 1,
        showTimestamp: true,
        timestamp: Date.now(),
        fullScreenAction: {
          id: 'default',
          launchActivity: 'default',
        },
        pressAction: {
          id: 'default',
        },
        actions: [
          {
            title: '✅ Tomou agora',
            pressAction: {
              id: 'confirm',
            },
          },
        ],
        style: {
          type: AndroidStyle.BIGTEXT,
          text: `Lembrete: ${body}`,
        },
      },
      data: {
        ...notificationConfig.data,
        isReminder: 'true',
        originalNotificationId: String(id),
      },
    };

    await notifee.createTriggerNotification(reminderConfig, reminderTrigger);
    console.log(
      `     ⏰ Lembrete agendado para ${reminderDate.toLocaleTimeString(
        'pt-BR',
      )}`,
    );
  } catch (error) {
    console.error('❌ Erro ao agendar notificação:', error);
    console.error('   Detalhes:', error.message);
    console.error('   Stack:', error.stack);
    throw error;
  }
}

async function agendarNotificacoesHorarioFixo(
  alerta,
  alertaId,
  remedioNome,
  dependenteNome,
) {
  try {
    console.log(
      '\n📅 ========== AGENDANDO HORÁRIO FIXO (DEPENDENTE) ==========',
    );
    console.log('Dependente:', dependenteNome);
    console.log('Medicamento:', remedioNome);
    console.log('Horário:', alerta.horario);
    console.log('Dias:', alerta.dias.join(', '));

    const now = new Date();
    console.log('Hora atual:', now.toLocaleString('pt-BR'));

    const [hora, minuto] = alerta.horario.split(':').map(Number);

    let agendados = 0;

    for (let i = 0; i < 30; i++) {
      const dataFutura = new Date(now);
      dataFutura.setDate(now.getDate() + i);
      dataFutura.setHours(hora, minuto, 0, 0);

      const diaSemana = diasSemana[dataFutura.getDay()].abrev;

      if (alerta.dias.includes(diaSemana) && dataFutura > now) {
        const notifId = `alarm_dep_${alertaId}_${dataFutura.getTime()}`;

        console.log(
          `→ Agendando: ${diaSemana} ${dataFutura.toLocaleDateString(
            'pt-BR',
          )} ${alerta.horario}`,
        );

        await scheduleNotification(
          notifId,
          `💊 Medicamento para ${dependenteNome}`,
          `${remedioNome} - ${alerta.dosagem}`,
          dataFutura,
          {
            remedioId: alerta.remedioId,
            remedioNome: remedioNome,
            dosagem: alerta.dosagem,
            tipoAlerta: 'dias',
            horario: alerta.horario,
            alertaId: alertaId,
            usuarioId: alerta.usuarioId,
            dependenteId: alerta.dependenteId,
            dependenteNome: dependenteNome,
          },
        );

        agendados++;
      }
    }

    console.log(`🎯 Total agendado: ${agendados} notificações`);
    console.log('==========================================\n');

    return agendados;
  } catch (error) {
    console.error('❌ Erro ao agendar horário fixo:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
}

async function agendarNotificacoesIntervalo(
  alerta,
  alertaId,
  remedioNome,
  dependenteNome,
) {
  try {
    console.log('\n⏰ ========== AGENDANDO INTERVALO (DEPENDENTE) ==========');
    console.log('Dependente:', dependenteNome);
    console.log('Medicamento:', remedioNome);
    console.log('Intervalo:', alerta.intervaloHoras, 'horas');
    console.log('Início:', alerta.horarioInicio);

    const now = new Date();
    const [hora, minuto] = alerta.horarioInicio.split(':').map(Number);
    const intervaloMs = alerta.intervaloHoras * 60 * 60 * 1000;

    let agendados = 0;

    for (let dia = 0; dia < 7; dia++) {
      const diaAtual = new Date(now);
      diaAtual.setDate(now.getDate() + dia);
      diaAtual.setHours(hora, minuto, 0, 0);

      const fimDia = new Date(diaAtual);
      fimDia.setHours(23, 59, 59, 999);

      let proximaDose = new Date(diaAtual);

      while (proximaDose <= fimDia) {
        if (proximaDose > now) {
          const horarioFormatado = proximaDose.toTimeString().slice(0, 5);
          const notifId = `interval_dep_${alertaId}_${proximaDose.getTime()}`;

          console.log(
            `✅ ${proximaDose.toLocaleDateString(
              'pt-BR',
            )} às ${horarioFormatado}`,
          );

          await scheduleNotification(
            notifId,
            `💊 Medicamento para ${dependenteNome}`,
            `${remedioNome} - ${alerta.dosagem} (A cada ${alerta.intervaloHoras}h)`,
            proximaDose,
            {
              remedioId: alerta.remedioId,
              remedioNome: remedioNome,
              dosagem: alerta.dosagem,
              tipoAlerta: 'intervalo',
              horario: horarioFormatado,
              horarioInicio: alerta.horarioInicio,
              intervaloHoras: alerta.intervaloHoras,
              alertaId: alertaId,
              usuarioId: alerta.usuarioId,
              dependenteId: alerta.dependenteId,
              dependenteNome: dependenteNome,
            },
          );

          agendados++;
        }

        proximaDose = new Date(proximaDose.getTime() + intervaloMs);
      }
    }

    console.log(`🎯 Total agendado: ${agendados} notificações`);
    console.log('==========================================\n');
  } catch (error) {
    console.error('❌ Erro ao agendar intervalo:', error);
    console.error('Stack:', error.stack);
  }
}

// ===== COMPONENTE PRINCIPAL =====

const FormAlertaDependente = ({navigation, route}) => {
  const [remedios, setRemedios] = useState([]);
  const [dependente, setDependente] = useState(null);
  const [remedioSelecionado, setRemedioSelecionado] = useState('');
  const [dosagem, setDosagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRemedios, setLoadingRemedios] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [showPickerModal, setShowPickerModal] = useState(false);

  const [tipoAlerta, setTipoAlerta] = useState('dias');

  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [horario, setHorario] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [intervaloHoras, setIntervaloHoras] = useState('');
  const [horarioInicio, setHorarioInicio] = useState(new Date());
  const [showTimePickerInicio, setShowTimePickerInicio] = useState(false);

  const [usarDataLimite, setUsarDataLimite] = useState(false);
  const [dataLimite, setDataLimite] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const {dependenteId} = route.params || {};

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function requestPermissions() {
      try {
        const settings = await notifee.requestPermission();

        if (settings.authorizationStatus !== 1) {
          Alert.alert(
            '⚠️ Permissão Necessária',
            'O app precisa de permissão para enviar notificações.',
            [
              {text: 'Cancelar', style: 'cancel'},
              {
                text: 'Abrir Configurações',
                onPress: () => notifee.openNotificationSettings(),
              },
            ],
          );
          return;
        }

        await createNotificationChannel();

        // Registrar handler de background
        notifee.onBackgroundEvent(async ({type, detail}) => {
          console.log('🔔 Evento em background (dependente):', type);

          if (
            type === EventType.ACTION_PRESS &&
            detail.pressAction?.id === 'confirm'
          ) {
            const notifData = detail.notification?.data;
            if (notifData) {
              await registrarMedicamentoTomado(notifData);
              await notifee.cancelNotification(detail.notification.id);

              const originalId =
                notifData.isReminder === 'true'
                  ? notifData.originalNotificationId
                  : detail.notification.id;
              const reminderId = `${originalId}_reminder`;
              await notifee.cancelNotification(reminderId);
            }
          }

          if (type === EventType.DELIVERED) {
            console.log('✅ Notificação entregue:', detail.notification?.id);
          }
        });
      } catch (error) {
        console.error('Erro ao solicitar permissões:', error);
        Alert.alert('Erro', 'Falha ao configurar permissões: ' + error.message);
      }
    }

    requestPermissions();
  }, []);

  useEffect(() => {
    // APENAS listener de FOREGROUND (quando app está aberto)
    const unsubscribeForeground = notifee.onForegroundEvent(
      async ({type, detail}) => {
        console.log('🔔 [FOREGROUND] Evento (dependente):', type);

        if (
          type === EventType.ACTION_PRESS &&
          detail.pressAction?.id === 'confirm'
        ) {
          const notifData = detail.notification?.data;
          if (notifData) {
            await registrarMedicamentoTomado(notifData);
            await notifee.cancelNotification(detail.notification.id);

            // Cancelar o lembrete de 10 minutos se existir
            const originalId =
              notifData.isReminder === 'true'
                ? notifData.originalNotificationId
                : detail.notification.id;
            const reminderId = `${originalId}_reminder`;
            await notifee.cancelNotification(reminderId);

            console.log('✅ [FOREGROUND] Medicamento registrado (dependente)');
          }
        }
      },
    );

    return () => {
      unsubscribeForeground();
    };
  }, []);

  const registrarMedicamentoTomado = async notifData => {
    try {
      const user = auth().currentUser;
      if (!user) return;

      const now = new Date();
      const diaStr = now.toISOString().slice(0, 10);

      const dados = {
        usuarioId: user.uid,
        dependenteId: notifData.dependenteId,
        dependenteNome: notifData.dependenteNome,
        remedioId: notifData.remedioId,
        remedioNome: notifData.remedioNome,
        dosagem: notifData.dosagem,
        dia: diaStr,
        horario: notifData.horario,
        timestamp: firestore.FieldValue.serverTimestamp(),
        status: 'tomado',
        tipoAlerta: notifData.tipoAlerta,
      };

      if (notifData.tipoAlerta === 'intervalo') {
        dados.intervaloHoras = notifData.intervaloHoras;
      }

      await firestore()
        .collection('medicamentos_tomados_dependentes')
        .add(dados);
    } catch (error) {
      console.error('Erro ao registrar:', error);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    const backgroundAnimation = Animated.loop(
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
    backgroundAnimation.start();

    return () => backgroundAnimation.stop();
  }, [backgroundAnim, fadeAnim, slideUpAnim]);

  useEffect(() => {
    const getCurrentUser = () => {
      const user = auth().currentUser;
      if (user) {
        setUserInfo(user);
      } else {
        Alert.alert('Erro', 'Usuário não autenticado.');
        navigation.goBack();
      }
    };

    const unsubscribeAuth = auth().onAuthStateChanged(user => {
      if (user) {
        setUserInfo(user);
      } else {
        setUserInfo(null);
      }
    });

    getCurrentUser();
    return () => unsubscribeAuth();
  }, [navigation]);

  useEffect(() => {
    if (!userInfo?.uid || !dependenteId) {
      if (!dependenteId) {
        Alert.alert('Erro', 'Dependente não encontrado.');
        navigation.goBack();
      }
      return;
    }

    const inicializar = async () => {
      try {
        setLoadingRemedios(true);

        const dependenteDoc = await firestore()
          .collection('users_dependentes')
          .doc(dependenteId)
          .get();

        if (dependenteDoc.exists) {
          const dependenteData = {
            id: dependenteDoc.id,
            ...dependenteDoc.data(),
          };
          setDependente(dependenteData);
        } else {
          Alert.alert('Erro', 'Dependente não encontrado.');
          navigation.goBack();
          return;
        }

        const remediosSnapshot = await firestore()
          .collection('remedios')
          .where('usuarioId', '==', userInfo.uid)
          .get();

        const lista = remediosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRemedios(lista);
      } catch (error) {
        console.error('Erro ao inicializar:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados.');
        navigation.goBack();
      } finally {
        setLoadingRemedios(false);
      }
    };

    inicializar();
  }, [userInfo, dependenteId, navigation]);

  useEffect(() => {
    if (!userInfo?.uid) return;

    const unsubscribe = firestore()
      .collection('remedios')
      .where('usuarioId', '==', userInfo.uid)
      .onSnapshot(
        snapshot => {
          if (!snapshot.empty) {
            const lista = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }));
            setRemedios(lista);
          } else {
            setRemedios([]);
          }
          setLoadingRemedios(false);
        },
        error => {
          console.error('Erro no listener:', error);
          setLoadingRemedios(false);
        },
      );

    return () => unsubscribe();
  }, [userInfo]);

  const formatarHorario = date => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatarData = date => {
    return date.toLocaleDateString('pt-BR');
  };

  const toggleDia = dia => {
    setDiasSelecionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia],
    );
  };

  const validarCampos = () => {
    if (!remedioSelecionado) {
      Alert.alert('Atenção', 'Selecione um medicamento');
      return false;
    }

    if (!dosagem.trim()) {
      Alert.alert('Atenção', 'Informe a dosagem');
      return false;
    }

    if (tipoAlerta === 'dias') {
      if (diasSelecionados.length === 0) {
        Alert.alert('Atenção', 'Selecione pelo menos um dia da semana');
        return false;
      }
    } else {
      const intervalo = parseInt(intervaloHoras);
      if (
        !intervaloHoras ||
        isNaN(intervalo) ||
        intervalo < 1 ||
        intervalo > 24
      ) {
        Alert.alert(
          'Atenção',
          'Informe um intervalo válido entre 1 e 24 horas',
        );
        return false;
      }
    }

    return true;
  };

  const salvarAviso = async () => {
    if (!validarCampos()) return;
    if (!userInfo?.uid || !dependenteId) {
      Alert.alert('Erro', 'Usuário ou dependente não identificado.');
      return;
    }

    setLoading(true);

    try {
      console.log('🎯 Iniciando salvamento do alerta (dependente)...');

      const alertaBase = {
        usuarioId: userInfo.uid,
        dependenteId: dependenteId,
        remedioId: remedioSelecionado,
        dosagem: dosagem.trim(),
        ativo: true,
        criadoEm: firestore.FieldValue.serverTimestamp(),
        tipoAlerta: tipoAlerta,
        usarDataLimite: usarDataLimite,
      };

      if (usarDataLimite) {
        alertaBase.dataLimite = dataLimite.toISOString();
      }

      if (tipoAlerta === 'dias') {
        alertaBase.dias = diasSelecionados;
        alertaBase.horario = horario.toTimeString().slice(0, 5);
        console.log('📅 Tipo: Dias específicos');
        console.log('   Dias:', diasSelecionados);
        console.log('   Horário:', alertaBase.horario);
      } else {
        alertaBase.intervaloHoras = parseInt(intervaloHoras);
        alertaBase.horarioInicio = horarioInicio.toTimeString().slice(0, 5);
        console.log('⏰ Tipo: Intervalo');
        console.log('   Intervalo:', alertaBase.intervaloHoras, 'horas');
        console.log('   Início:', alertaBase.horarioInicio);
      }

      const alertaRef = await firestore()
        .collection('alertas_dependentes')
        .add(alertaBase);
      console.log('✅ Alerta salvo no Firestore:', alertaRef.id);

      const remedio = remedios.find(r => r.id === remedioSelecionado);
      const remedioNome = remedio?.nome || 'Medicamento';
      const dependenteNome = dependente?.nome || 'Dependente';
      console.log('💊 Medicamento:', remedioNome);
      console.log('👤 Dependente:', dependenteNome);

      console.log('\n📅 Agendando notificações...');

      if (tipoAlerta === 'dias') {
        const agendados = await agendarNotificacoesHorarioFixo(
          alertaBase,
          alertaRef.id,
          remedioNome,
          dependenteNome,
        );
        console.log(`✅ ${agendados} notificações agendadas`);
      } else {
        await agendarNotificacoesIntervalo(
          alertaBase,
          alertaRef.id,
          remedioNome,
          dependenteNome,
        );
        console.log('✅ Notificações de intervalo agendadas');
      }

      const scheduled = await notifee.getTriggerNotifications();
      console.log(`\n📋 Total de notificações no sistema: ${scheduled.length}`);

      Alert.alert('Sucesso! 🎉', `Alarme registrado para ${dependenteNome}!`, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      console.error('Stack:', error.stack);
      Alert.alert(
        'Erro',
        `Não foi possível salvar o alerta.\n\n${
          error.message || 'Erro desconhecido'
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  const getRemedioNome = () => {
    const remedio = remedios.find(r => r.id === remedioSelecionado);
    return remedio ? remedio.nome : 'Selecionar medicamento';
  };

  const renderPickerModal = () => (
    <Modal
      visible={showPickerModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPickerModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.pickerModalContent}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Selecionar Medicamento</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPickerModal(false)}>
              <Icon name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {loadingRemedios ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Carregando...</Text>
            </View>
          ) : remedios.length === 0 ? (
            <View style={styles.noRemediosContainer}>
              <View style={styles.emptyStateIconContainer}>
                <MaterialIcons name="medication" size={48} color="#64748b" />
              </View>
              <Text style={styles.emptyStateTitle}>
                Nenhum medicamento cadastrado
              </Text>
              <Text style={styles.emptyStateDescription}>
                Cadastre um medicamento antes de criar alertas
              </Text>
              <TouchableOpacity
                style={styles.addRemedioButton}
                onPress={() => {
                  setShowPickerModal(false);
                  navigation.navigate('AdicionarRemedio');
                }}>
                <Icon name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addRemedioButtonText}>
                  Cadastrar Medicamento
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.customPickerScrollView}>
              {remedios.map(remedio => (
                <TouchableOpacity
                  key={remedio.id}
                  style={[
                    styles.customPickerItem,
                    remedioSelecionado === remedio.id &&
                      styles.customPickerItemSelected,
                  ]}
                  onPress={() => {
                    setRemedioSelecionado(remedio.id);
                    setShowPickerModal(false);
                  }}>
                  <View style={styles.customPickerItemContent}>
                    <MaterialIcons
                      name="medication"
                      size={20}
                      color="#3B82F6"
                    />
                    <Text style={styles.customPickerItemText}>
                      {remedio.nome}
                    </Text>
                  </View>
                  {remedioSelecionado === remedio.id && (
                    <Icon name="checkmark-circle" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderDiasGrid = () => {
    const itemsPerRow = isSmallScreen ? 4 : 7;
    const rows = [];
    for (let i = 0; i < diasSemana.length; i += itemsPerRow) {
      rows.push(diasSemana.slice(i, i + itemsPerRow));
    }

    return (
      <View style={styles.diasGrid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.diasRow}>
            {row.map(dia => (
              <TouchableOpacity
                key={dia.abrev}
                style={[
                  styles.diaButton,
                  diasSelecionados.includes(dia.abrev) && styles.diaSelecionado,
                ]}
                onPress={() => toggleDia(dia.abrev)}>
                <Text
                  style={[
                    styles.diaTexto,
                    diasSelecionados.includes(dia.abrev) &&
                      styles.diaTextoSelecionado,
                  ]}>
                  {dia.abrev}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  if (loadingRemedios && !dependente) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <Animated.View
        style={[
          styles.backgroundCircle,
          {
            opacity: backgroundAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.03, 0.08],
            }),
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
          },
        ]}
      />

      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          },
        ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Novo Alerta</Text>
          <Text style={styles.headerSubtitle}>
            {dependente?.nome || 'Configure seu lembrete'}
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          }}>
          {/* Medicamento */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="medication" size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Medicamento</Text>
            </View>

            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setShowPickerModal(true)}>
              <View style={styles.inputContent}>
                <Text
                  style={[
                    styles.inputText,
                    !remedioSelecionado && styles.inputPlaceholder,
                  ]}>
                  {getRemedioNome()}
                </Text>
                <Icon name="chevron-down" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Dosagem */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="fitness" size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Dosagem</Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: 1 comprimido, 30mg, 5ml..."
                placeholderTextColor="#64748b"
                value={dosagem}
                onChangeText={setDosagem}
              />
            </View>
          </View>

          {/* Tipo de Alerta */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="options" size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Tipo de Alerta</Text>
            </View>

            <View style={styles.tipoAlertaContainer}>
              <TouchableOpacity
                style={[
                  styles.tipoAlertaButton,
                  tipoAlerta === 'dias' && styles.tipoAlertaButtonSelected,
                ]}
                onPress={() => setTipoAlerta('dias')}>
                <Icon
                  name="calendar"
                  size={24}
                  color={tipoAlerta === 'dias' ? '#3B82F6' : '#64748b'}
                />
                <Text
                  style={[
                    styles.tipoAlertaText,
                    tipoAlerta === 'dias' && styles.tipoAlertaTextSelected,
                  ]}>
                  Dias Específicos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tipoAlertaButton,
                  tipoAlerta === 'intervalo' && styles.tipoAlertaButtonSelected,
                ]}
                onPress={() => setTipoAlerta('intervalo')}>
                <Icon
                  name="time"
                  size={24}
                  color={tipoAlerta === 'intervalo' ? '#3B82F6' : '#64748b'}
                />
                <Text
                  style={[
                    styles.tipoAlertaText,
                    tipoAlerta === 'intervalo' && styles.tipoAlertaTextSelected,
                  ]}>
                  Por Intervalo
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Configurações por tipo */}
          {tipoAlerta === 'dias' ? (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="time" size={20} color="#3B82F6" />
                  <Text style={styles.sectionTitle}>Horário</Text>
                </View>

                <TouchableOpacity
                  style={styles.timeContainer}
                  onPress={() => setShowTimePicker(true)}>
                  <Text style={styles.timeText}>
                    {formatarHorario(horario)}
                  </Text>
                  <Icon name="alarm" size={24} color="#3B82F6" />
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="calendar" size={20} color="#3B82F6" />
                  <Text style={styles.sectionTitle}>Dias da Semana</Text>
                </View>

                {renderDiasGrid()}

                {diasSelecionados.length > 0 && (
                  <View style={styles.diasSelecionadosInfo}>
                    <Text style={styles.diasSelecionadosText}>
                      {diasSelecionados.length === 7
                        ? 'Todos os dias'
                        : `${diasSelecionados.length} dia${
                            diasSelecionados.length > 1 ? 's' : ''
                          } selecionado${
                            diasSelecionados.length > 1 ? 's' : ''
                          }`}
                    </Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="time" size={20} color="#3B82F6" />
                  <Text style={styles.sectionTitle}>Horário de Início</Text>
                </View>

                <TouchableOpacity
                  style={styles.timeContainer}
                  onPress={() => setShowTimePickerInicio(true)}>
                  <Text style={styles.timeText}>
                    {formatarHorario(horarioInicio)}
                  </Text>
                  <Icon name="play-circle" size={24} color="#3B82F6" />
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="hourglass" size={20} color="#3B82F6" />
                  <Text style={styles.sectionTitle}>Intervalo</Text>
                </View>

                <View style={styles.intervaloContainer}>
                  <TextInput
                    style={styles.intervaloInput}
                    placeholder="Ex: 6, 8, 12..."
                    placeholderTextColor="#64748b"
                    value={intervaloHoras}
                    onChangeText={setIntervaloHoras}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                  <Text style={styles.intervaloLabel}>horas</Text>
                </View>

                {intervaloHoras && parseInt(intervaloHoras) > 0 && (
                  <View style={styles.intervaloInfo}>
                    <Icon name="information-circle" size={16} color="#3B82F6" />
                    <Text style={styles.intervaloInfoText}>
                      Alerta a cada {intervaloHoras} hora
                      {parseInt(intervaloHoras) > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Botão Salvar */}
          <TouchableOpacity
            style={[
              styles.salvarButton,
              loading && styles.salvarButtonDisabled,
            ]}
            onPress={salvarAviso}
            disabled={loading}>
            {loading ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.salvarButtonText}>Agendando...</Text>
              </>
            ) : (
              <>
                <Icon name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.salvarButtonText}>Ativar Alerta</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {showTimePicker && (
        <DateTimePicker
          value={horario}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, selectedDate) => {
            setShowTimePicker(Platform.OS === 'ios');
            if (selectedDate) setHorario(selectedDate);
          }}
        />
      )}

      {showTimePickerInicio && (
        <DateTimePicker
          value={horarioInicio}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, selectedDate) => {
            setShowTimePickerInicio(Platform.OS === 'ios');
            if (selectedDate) setHorarioInicio(selectedDate);
          }}
        />
      )}

      {renderPickerModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
  header: {
    backgroundColor: 'rgba(20, 30, 48, 0.95)',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 55,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 25,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  inputContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    padding: 16,
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontSize: 16,
    color: '#f8fafc',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  inputPlaceholder: {
    color: '#64748b',
  },
  textInput: {
    fontSize: 16,
    color: '#f8fafc',
    padding: 0,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  tipoAlertaContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  tipoAlertaButton: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  tipoAlertaButtonSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
  },
  tipoAlertaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  tipoAlertaTextSelected: {
    color: '#3B82F6',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    padding: 20,
  },
  timeText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -1.5,
  },
  intervaloContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    padding: 16,
    gap: 12,
  },
  intervaloInput: {
    flex: 1,
    fontSize: 16,
    color: '#f8fafc',
    padding: 0,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  intervaloLabel: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  intervaloInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  intervaloInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#3B82F6',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  diasGrid: {
    gap: 12,
  },
  diasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  diaButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  diaSelecionado: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  diaTexto: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  diaTextoSelecionado: {
    color: '#FFFFFF',
  },
  diasSelecionadosInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  diasSelecionadosText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  salvarButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  salvarButtonDisabled: {
    backgroundColor: '#64748b',
  },
  salvarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: height * 0.7,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.6)',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customPickerScrollView: {
    maxHeight: 400,
    padding: 20,
  },
  customPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.3)',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    marginBottom: 8,
  },
  customPickerItemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  customPickerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  customPickerItemText: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  noRemediosContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  addRemedioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addRemedioButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default FormAlertaDependente;
