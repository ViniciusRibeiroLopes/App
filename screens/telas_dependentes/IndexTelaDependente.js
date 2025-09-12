import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Alert,
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

/**
 * Obtém as dimensões da tela do dispositivo
 * @constant {Object} dimensions - Largura e altura da tela
 */
const { width, height } = Dimensions.get('window');

/**
 * Verifica se a tela é pequena (menos de 360px de largura)
 * @constant {boolean} isSmallScreen
 */
const isSmallScreen = width < 360;

/**
 * Verifica se a tela é média (entre 360px e 400px de largura)
 * @constant {boolean} isMediumScreen
 */
const isMediumScreen = width >= 360 && width < 400;

/**
 * Verifica se a tela é grande (400px ou mais de largura)
 * @constant {boolean} isLargeScreen
 */
const isLargeScreen = width >= 400;

/**
 * Array com os dias da semana em formato abreviado e completo
 * @constant {Array<Object>} diasSemana - Configuração dos dias da semana
 */
const diasSemana = [
  { abrev: 'Dom', completo: 'Domingo' },
  { abrev: 'Seg', completo: 'Segunda' },
  { abrev: 'Ter', completo: 'Terça' },
  { abrev: 'Qua', completo: 'Quarta' },
  { abrev: 'Qui', completo: 'Quinta' },
  { abrev: 'Sex', completo: 'Sexta' },
  { abrev: 'Sáb', completo: 'Sábado' }
];

/**
 * Componente de tela para exibir e gerenciar o próximo medicamento
 * Permite ao usuário visualizar detalhes do próximo medicamento e marcá-lo como tomado
 * @component
 * @returns {JSX.Element} Componente de tela do próximo medicamento
 */
const NextMedicationScreen = () => {
  // Estados do componente
  /**
   * Estado do próximo medicamento a ser tomado
   * @type {[Object|null, Function]} nextMedication - Dados do próximo medicamento ou null se não houver
   */
  const [nextMedication, setNextMedication] = useState(null);
  
  /**
   * Estado do horário atual
   * @type {[Date, Function]} currentTime - Data/hora atual atualizada periodicamente
   */
  const [currentTime, setCurrentTime] = useState(new Date());
  
  /**
   * Estado que indica se o horário está correto para tomar o medicamento
   * @type {[boolean, Function]} isTimeCorrect - True se está na janela de tempo permitida (-5min a +30min)
   */
  const [isTimeCorrect, setIsTimeCorrect] = useState(false);
  
  /**
   * Estado de carregamento da busca por medicamentos
   * @type {[boolean, Function]} loading - Indica se está carregando dados do Firestore
   */
  const [loading, setLoading] = useState(true);
  
  // Referências para animações
  /**
   * Referência para animação de pulsação
   * @type {React.MutableRefObject<Animated.Value>} pulseAnim
   */
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  /**
   * Referência para animação de entrada (bounce)
   * @type {React.MutableRefObject<Animated.Value>} bounceAnim
   */
  const bounceAnim = useRef(new Animated.Value(0)).current;
  
  /**
   * Referência para animação de rotação
   * @type {React.MutableRefObject<Animated.Value>} rotateAnim
   */
  const rotateAnim = useRef(new Animated.Value(0)).current;

  /**
   * UID do usuário autenticado atual
   * @type {string|undefined} uid
   */
  const uid = auth().currentUser?.uid;

  /**
   * Efeito executado na montagem do componente
   * Inicia as animações e busca medicamentos se o usuário estiver autenticado
   */
  useEffect(() => {
    console.log('=== USEEFFECT INICIAL ===');
    console.log('UID do usuário:', uid);
    
    if (uid) {
      console.log('UID encontrado, buscando medicamentos...');
      fetchNextMedication();
      startTimeUpdater();
    } else {
      console.log('⚠️ UID não encontrado! Usuário não autenticado.');
    }

    // Animação de pulsação
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // Animação de entrada
    const bounceAnimation = Animated.spring(bounceAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    });

    // Animação de rotação sutil
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    );

    pulseAnimation.start();
    bounceAnimation.start();
    rotateAnimation.start();

    return () => {
      pulseAnimation.stop();
      rotateAnimation.stop();
    };
  }, [uid]);

  /**
   * Efeito executado quando o horário atual ou próximo medicamento mudam
   * Verifica se está no horário correto para tomar o medicamento
   */
  useEffect(() => {
    console.log('=== VERIFICANDO HORÁRIO ===');
    console.log('Horário atual:', currentTime);
    console.log('Próximo medicamento:', nextMedication);
    checkTimeCorrectness();
  }, [currentTime, nextMedication]);

  /**
   * Inicia o atualizador automático de horário
   * Atualiza o horário atual a cada 30 segundos
   * @function startTimeUpdater
   * @returns {Function} Função de cleanup para limpar o interval
   */
  const startTimeUpdater = () => {
    console.log('⏰ Iniciando atualizador de horário...');
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(interval);
  };

  /**
   * Busca o próximo medicamento a ser tomado no Firestore
   * Verifica alertas do usuário, filtra por dia atual e horários futuros
   * @async
   * @function fetchNextMedication
   */
  const fetchNextMedication = async () => {
    console.log('=== BUSCANDO PRÓXIMO MEDICAMENTO ===');
    if (!uid) {
      console.log('❌ Não foi possível buscar - UID não encontrado');
      return;
    }

    try {
      setLoading(true);
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const currentDay = diasSemana[now.getDay()].abrev;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diaStr = today.toISOString().slice(0, 10);

      console.log('🕐 Horário atual:', currentTime);
      console.log('📅 Dia atual:', currentDay);
      console.log('📅 Data string:', diaStr);

      console.log('🔍 Buscando alertas no Firestore...');
      const alertasSnapshot = await firestore()
        .collection('alertas_dependentes')
        .where('dependenteId', '==', uid)
        .get();

      console.log('📋 Quantidade de alertas encontrados:', alertasSnapshot.docs.length);

      if (alertasSnapshot.docs.length === 0) {
        console.log('⚠️ Nenhum alerta encontrado para este usuário');
      }

      let nextMed = null;
      let closestTime = null;
      let processedCount = 0;
      let validAlertsToday = 0;
      let alreadyTakenCount = 0;

      for (const doc of alertasSnapshot.docs) {
        const alerta = doc.data();
        processedCount++;
        
        console.log(`\n--- PROCESSANDO ALERTA ${processedCount} ---`);
        console.log('ID do documento:', doc.id);
        console.log('Dados do alerta:', alerta);
        console.log('Dias do alerta:', alerta.dias);
        console.log('Dia atual para verificação:', currentDay);
        console.log('Inclui dia atual?', alerta.dias.includes(currentDay));
        
        if (!alerta.dias.includes(currentDay)) {
          console.log('❌ Alerta não é para hoje, pulando...');
          continue;
        }

        validAlertsToday++;
        console.log('✅ Alerta válido para hoje!');

        console.log('🔍 Verificando se já foi tomado...');
        const tomadoSnapshot = await firestore()
          .collection('medicamentos_tomados_dependentes')
          .where('dependenteId', '==', alerta.dependenteId)
          .where('remedioId', '==', alerta.remedioId)
          .where('horario', '==', alerta.horario)
          .where('dia', '==', diaStr)
          .get();

        console.log('Quantidade de registros "já tomado":', tomadoSnapshot.docs.length);

        if (!tomadoSnapshot.empty) {
          alreadyTakenCount++;
          console.log('💊 Medicamento já foi tomado hoje, pulando...');
          continue;
        }

        console.log('🔍 Buscando dados do remédio...');
        const remedioDoc = await firestore()
          .collection('remedios')
          .doc(alerta.remedioId)
          .get();

        console.log('Remédio existe?', remedioDoc.exists);

        if (remedioDoc.exists) {
          const remedioData = remedioDoc.data();
          console.log('Dados do remédio:', remedioData);
          
          const medicationData = {
            ...alerta,
            remedioNome: remedioData.nome,
            alertaId: doc.id
          };

          console.log('Horário do alerta:', alerta.horario);
          console.log('Horário atual:', currentTime);
          console.log('Alerta é para horário futuro?', alerta.horario >= currentTime);

          if (alerta.horario >= currentTime) {
            console.log('⏰ Medicamento é para horário futuro');
            if (!closestTime || alerta.horario < closestTime) {
              console.log('🎯 Este é o próximo medicamento mais próximo!');
              closestTime = alerta.horario;
              nextMed = medicationData;
            } else {
              console.log('⏰ Existe outro medicamento mais próximo');
            }
          } else {
            console.log('⏰ Medicamento é para horário passado');
          }
        } else {
          console.log('❌ Dados do remédio não encontrados');
        }
      }

      console.log('\n=== RESUMO DA BUSCA ===');
      console.log('Total de alertas processados:', processedCount);
      console.log('Alertas válidos para hoje:', validAlertsToday);
      console.log('Medicamentos já tomados:', alreadyTakenCount);
      console.log('Próximo medicamento encontrado:', nextMed ? 'SIM' : 'NÃO');
      
      if (nextMed) {
        console.log('📋 Próximo medicamento:', nextMed);
      }

      setNextMedication(nextMed);
    } catch (error) {
      console.error('❌ ERRO ao buscar próximo medicamento:', error);
      console.error('Stack trace:', error.stack);
      Alert.alert('Erro', 'Não foi possível carregar as informações do medicamento.');
    } finally {
      setLoading(false);
      console.log('✅ Busca finalizada, loading = false');
    }
  };

  /**
   * Verifica se o horário atual está dentro da janela permitida para tomar o medicamento
   * Janela: de 5 minutos antes até 30 minutos depois do horário marcado
   * @function checkTimeCorrectness
   */
  const checkTimeCorrectness = () => {
    console.log('\n=== VERIFICANDO SE PODE TOMAR MEDICAMENTO ===');
    
    if (!nextMedication) {
      console.log('❌ Não há próximo medicamento para verificar');
      setIsTimeCorrect(false);
      return;
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const [targetHour, targetMinute] = nextMedication.horario.split(':').map(Number);
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);

    const targetTotalMinutes = targetHour * 60 + targetMinute;
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    
    const timeDiff = currentTotalMinutes - targetTotalMinutes;
    const canTake = timeDiff >= -5 && timeDiff <= 30;
    
    console.log('Horário alvo:', nextMedication.horario);
    console.log('Horário atual:', currentTime);
    console.log('Diferença em minutos:', timeDiff);
    console.log('Pode tomar? (entre -5 e +30 min):', canTake);
    
    setIsTimeCorrect(canTake);
  };

  /**
   * Marca o medicamento como tomado no Firestore
   * Salva o registro na coleção 'medicamentos_tomados_dependentes' e recarrega a lista
   * @async
   * @function markMedicationTaken
   */
  const markMedicationTaken = async () => {
    console.log('\n=== MARCANDO MEDICAMENTO COMO TOMADO ===');
    
    if (!nextMedication || !isTimeCorrect) {
      console.log('❌ Não pode marcar como tomado:');
      console.log('- Tem próximo medicamento?', !!nextMedication);
      console.log('- Horário correto?', isTimeCorrect);
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diaStr = today.toISOString().slice(0, 10);

      const dadosParaSalvar = {
        dia: diaStr,
        dosagem: nextMedication.dosagem,
        horario: nextMedication.horario,
        remedioId: nextMedication.remedioId,
        remedioNome: nextMedication.remedioNome,
        dependenteId: nextMedication.dependenteId,
      };

      console.log('💾 Salvando no Firestore:', dadosParaSalvar);

      await firestore().collection('medicamentos_tomados_dependentes').add(dadosParaSalvar);

      console.log('✅ Medicamento salvo com sucesso!');

      Alert.alert(
        'Sucesso!', 
        `Medicamento de ${nextMedication.dependenteNome} registrado como tomado.`,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('🔄 Recarregando lista de medicamentos...');
              fetchNextMedication();
            }
          }
        ]
      );

    } catch (error) {
      console.error('❌ ERRO ao registrar medicamento:', error);
      console.error('Stack trace:', error.stack);
      Alert.alert('Erro', 'Não foi possível registrar o medicamento. Tente novamente.');
    }
  };

  /**
   * Manipula o logout do usuário
   * Exibe confirmação e faz logout via Firebase Auth
   * @function handleLogout
   */
  const handleLogout = () => {
    console.log('🚪 Iniciando processo de logout...');
    
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => console.log('❌ Logout cancelado pelo usuário')
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔓 Fazendo logout...');
              await auth().signOut();
              console.log('✅ Logout realizado com sucesso');
            } catch (error) {
              console.error('❌ ERRO ao fazer logout:', error);
              console.error('Stack trace:', error.stack);
              Alert.alert('Erro', 'Não foi possível sair da conta.');
            }
          },
        },
      ]
    );
  };

  /**
   * Formata uma data para exibir apenas hora e minuto
   * @function formatarHorario
   * @param {Date} date - Data a ser formatada
   * @returns {string} Horário formatado no padrão HH:MM
   */
  const formatarHorario = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  /**
   * Calcula e formata o tempo restante até o próximo medicamento
   * @function getTimeUntilNext
   * @returns {string} Tempo restante formatado (ex: "em 2h 30min" ou "em 15 minutos")
   */
  const getTimeUntilNext = () => {
    if (!nextMedication) return '';
    
    const now = new Date();
    const [hour, minute] = nextMedication.horario.split(':').map(Number);
    const nextTime = new Date();
    nextTime.setHours(hour, minute, 0, 0);
    
    if (nextTime <= now) {
      nextTime.setDate(nextTime.getDate() + 1);
    }
    
    const diff = nextTime - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `em ${hours}h ${minutes}min`;
    } else {
      return `em ${minutes} minutos`;
    }
  };

  /**
   * Interpola a animação de rotação para uso em componentes
   * @constant {Animated.AnimatedInterpolation} rotate
   */
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Renderização durante carregamento
  if (loading) {
    console.log('⏳ Componente em estado de loading');
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        
        {/* Botão de Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="log-out-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        {/* Efeito de fundo pulsante */}
        <Animated.View 
          style={[
            styles.pulseEffect,
            { transform: [{ scale: pulseAnim }] }
          ]} 
        />
        
        {/* Círculos decorativos */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />

        <View style={styles.loadingContainer}>
          <Animated.View style={[
            styles.iconWrapper,
            { transform: [{ rotate }] }
          ]}>
            <Icon name="hourglass-outline" size={60} color="#FFFFFF" />
          </Animated.View>
          <Text style={styles.loadingText}>Carregando medicamentos...</Text>
        </View>
      </View>
    );
  }

  // Renderização quando não há próximo medicamento
  if (!nextMedication) {
    console.log('✅ Nenhum próximo medicamento - todos foram tomados');
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        
        {/* Botão de Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="log-out-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        {/* Efeito de fundo pulsante */}
        <Animated.View 
          style={[
            styles.pulseEffect,
            { transform: [{ scale: pulseAnim }] }
          ]} 
        />
        
        {/* Círculos decorativos */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />

        <Animated.View 
          style={[
            styles.contentContainer,
            { transform: [{ scale: bounceAnim }] }
          ]}
        >
          <View style={styles.successContainer}>
            <View style={styles.successIconContainer}>
              <Icon name="checkmark-circle" size={isSmallScreen ? 80 : isMediumScreen ? 90 : 100} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>PARABÉNS!</Text>
            <Text style={styles.successSubtitle}>Todos os medicamentos de hoje foram tomados</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  // Renderização principal com próximo medicamento
  console.log('🎯 Renderizando tela com próximo medicamento:', nextMedication.remedioNome);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Botão de Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="log-out-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      {/* Efeito de fundo pulsante */}
      <Animated.View 
        style={[
          styles.pulseEffect,
          { transform: [{ scale: pulseAnim }] }
        ]} 
      />
      
      {/* Círculos decorativos */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />

      <Animated.View 
        style={[
          styles.contentContainer,
          { transform: [{ scale: bounceAnim }] }
        ]}
      >
        <View style={styles.medicationIconContainer}>
          <Text style={styles.medicationTitle}>PRÓXIMO MEDICAMENTO</Text>
          <Text style={styles.medicationSubtitle}>Mantenha-se em dia com o tratamento</Text>
        </View>

        <View style={styles.timeContainer}>
          <Text style={styles.currentTime}>
            {formatarHorario(currentTime)}
          </Text>
          <Text style={styles.timeLabel}>Horário atual</Text>
        </View>

        <View style={styles.dependentCard}>
          <View style={styles.dependentHeader}>
            <Icon name="person" size={20} color="#6366F1" />
            <Text style={styles.dependentTitle}>Paciente</Text>
          </View>
          <Text style={styles.dependentName}>
            {nextMedication.dependenteNome}
          </Text>
        </View>

        <View style={styles.medicationCard}>
          <View style={styles.medicationHeader}>
            <MaterialIcons name="medication" size={24} color="#4D97DB" />
            <Text style={styles.medicationCardTitle}>Medicamento</Text>
          </View>
          
          <View style={styles.medicationDetails}>
            <View style={styles.medicationRow}>
              <Icon name="medical" size={16} color="#10B981" />
              <Text style={styles.medicationName}>
                {nextMedication.remedioNome}
              </Text>
            </View>
            
            <View style={styles.medicationRow}>
              <Icon name="fitness" size={16} color="#F59E0B" />
              <Text style={styles.medicationDose}>
                {nextMedication.dosagem}
              </Text>
            </View>
            
            <View style={styles.medicationRow}>
              <Icon name="time" size={16} color="#6366F1" />
              <Text style={styles.medicationTime}>
                Horário: {nextMedication.horario}
              </Text>
            </View>
          </View>

          {!isTimeCorrect && (
            <View style={styles.countdownContainer}>
              <Icon name="hourglass-outline" size={16} color="#F59E0B" />
              <Text style={styles.countdownText}>
                {getTimeUntilNext()}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.takeButton,
            !isTimeCorrect && styles.takeButtonDisabled
          ]}
          onPress={markMedicationTaken}
          disabled={!isTimeCorrect}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <Icon 
              name={isTimeCorrect ? "checkmark-circle" : "time-outline"} 
              size={24} 
              color="#FFFFFF" 
            />
            <Text style={styles.takeButtonText}>
              {isTimeCorrect ? 'MEDICAMENTO TOMADO' : 'AGUARDE O HORÁRIO'}
            </Text>
          </View>
        </TouchableOpacity>

        {isTimeCorrect && (
          <View style={styles.canTakeContainer}>
            <Icon name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.canTakeText}>
              Horário correto! Pode tomar o medicamento
            </Text>
          </View>
        )}

        {/* Indicadores pulsantes */}
        <View style={styles.indicators}>
          <Animated.View style={[styles.indicator, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.indicator, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.indicator, { opacity: pulseAnim }]} />
        </View>
      </Animated.View>
    </View>
  );
};

/**
 * Estilos do componente NextMedicationScreen
 * @constant {Object} styles - Objeto contendo todos os estilos do componente
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121A29',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoutButton: {
    position: 'absolute',
    top: isSmallScreen ? 40 : isMediumScreen ? 45 : 50,
    right: 20,
    backgroundColor: 'rgba(77, 151, 219, 0.2)',
    width: isSmallScreen ? 45 : isMediumScreen ? 48 : 50,
    height: isSmallScreen ? 45 : isMediumScreen ? 48 : 50,
    borderRadius: isSmallScreen ? 22.5 : isMediumScreen ? 24 : 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.4)',
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
    width: isSmallScreen ? 60 : isMediumScreen ? 70 : 80,
    height: isSmallScreen ? 60 : isMediumScreen ? 70 : 80,
    borderRadius: isSmallScreen ? 30 : isMediumScreen ? 35 : 40,
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: height * 0.15,
    left: width * 0.1,
    width: isSmallScreen ? 40 : isMediumScreen ? 50 : 60,
    height: isSmallScreen ? 40 : isMediumScreen ? 50 : 60,
    borderRadius: isSmallScreen ? 20 : isMediumScreen ? 25 : 30,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: height * 0.3,
    left: width * 0.05,
    width: isSmallScreen ? 30 : isMediumScreen ? 40 : 50,
    height: isSmallScreen ? 30 : isMediumScreen ? 40 : 50,
    borderRadius: isSmallScreen ? 15 : isMediumScreen ? 20 : 25,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 20 : isMediumScreen ? 25 : 30,
    zIndex: 10,
    width: '100%',
  },
  medicationIconContainer: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? 25 : isMediumScreen ? 28 : 30,
  },
  iconWrapper: {
    width: isSmallScreen ? 120 : isMediumScreen ? 130 : 140,
    height: isSmallScreen ? 120 : isMediumScreen ? 130 : 140,
    borderRadius: isSmallScreen ? 60 : isMediumScreen ? 65 : 70,
    backgroundColor: 'rgba(77, 151, 219, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(77, 151, 219, 0.4)',
  },
  medicationTitle: {
    fontSize: isSmallScreen ? 18 : isMediumScreen ? 20 : 22,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  medicationSubtitle: {
    fontSize: isSmallScreen ? 13 : isMediumScreen ? 14 : 15,
    color: '#8A8A8A',
    fontWeight: '500',
    textAlign: 'center',
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? 20 : isMediumScreen ? 22 : 25,
    backgroundColor: 'rgba(77, 151, 219, 0.1)',
    paddingVertical: isSmallScreen ? 15 : isMediumScreen ? 18 : 20,
    paddingHorizontal: isSmallScreen ? 25 : isMediumScreen ? 28 : 30,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.3)',
  },
  currentTime: {
    fontSize: isSmallScreen ? 28 : isMediumScreen ? 32 : 36,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontWeight: '300',
    letterSpacing: -1,
  },
  timeLabel: {
    fontSize: isSmallScreen ? 11 : isMediumScreen ? 12 : 13,
    color: '#4D97DB',
    fontWeight: '500',
    marginTop: 4,
  },
  dependentCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 15,
    padding: isSmallScreen ? 15 : 18,
    marginBottom: isSmallScreen ? 15 : 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  dependentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  dependentTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#6366F1',
    fontWeight: '600',
  },
  dependentName: {
    fontSize: isSmallScreen ? 16 : 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  medicationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: isSmallScreen ? 18 : 22,
    marginBottom: isSmallScreen ? 25 : 30,
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
  medicationCardTitle: {
    fontSize: isSmallScreen ? 15 : 17,
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
    fontSize: isSmallScreen ? 15 : 17,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },
  medicationDose: {
    fontSize: isSmallScreen ? 13 : 15,
    color: '#D1D5DB',
    fontWeight: '500',
    flex: 1,
  },
  medicationTime: {
    fontSize: isSmallScreen ? 13 : 15,
    color: '#D1D5DB',
    fontWeight: '500',
    flex: 1,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  countdownText: {
    fontSize: isSmallScreen ? 13 : 15,
    color: '#F59E0B',
    fontWeight: '600',
  },
  takeButton: {
    backgroundColor: '#10B981',
    paddingVertical: isSmallScreen ? 16 : 20,
    paddingHorizontal: isSmallScreen ? 25 : 35,
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
  takeButtonDisabled: {
    backgroundColor: '#6B7280',
    borderColor: 'rgba(107, 114, 128, 0.3)',
    elevation: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  takeButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 15 : isMediumScreen ? 16 : 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  canTakeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: isSmallScreen ? 15 : isMediumScreen ? 18 : 20,
  },
  canTakeText: {
    fontSize: isSmallScreen ? 13 : isMediumScreen ? 14 : 15,
    color: '#10B981',
    fontWeight: '600',
  },
  indicators: {
    flexDirection: 'row',
    marginTop: isSmallScreen ? 20 : isMediumScreen ? 22 : 25,
    gap: 12,
  },
  indicator: {
    width: isSmallScreen ? 8 : isMediumScreen ? 9 : 10,
    height: isSmallScreen ? 8 : isMediumScreen ? 9 : 10,
    borderRadius: isSmallScreen ? 4 : isMediumScreen ? 4.5 : 5,
    backgroundColor: '#4D97DB',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    fontSize: isSmallScreen ? 16 : 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  successIconContainer: {
    width: isSmallScreen ? 140 : 160,
    height: isSmallScreen ? 140 : 160,
    borderRadius: isSmallScreen ? 70 : 80,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  successTitle: {
    fontSize: isSmallScreen ? 24 : 28,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: isSmallScreen ? 10 : 15,
    color: '#c7c7c7ff',
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
});

export default NextMedicationScreen;