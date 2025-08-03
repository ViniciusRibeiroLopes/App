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

const NextMedicationScreen = () => {
  const [nextMedication, setNextMedication] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTimeCorrect, setIsTimeCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const uid = auth().currentUser?.uid;

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

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    const bounceAnimation = Animated.spring(bounceAnim, {
      toValue: 1,
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    });

    pulseAnimation.start();
    bounceAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [uid]);

  useEffect(() => {
    console.log('=== VERIFICANDO HORÁRIO ===');
    console.log('Horário atual:', currentTime);
    console.log('Próximo medicamento:', nextMedication);
    checkTimeCorrectness();
  }, [currentTime, nextMedication]);

  const startTimeUpdater = () => {
    console.log('⏰ Iniciando atualizador de horário...');
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(interval);
  };

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

  const formatarHorario = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

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

  if (loading) {
    console.log('⏳ Componente em estado de loading');
    return (
      <View style={styles.container}>
        {/* Botão de Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
        
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </View>
    );
  }

  if (!nextMedication) {
    console.log('✅ Nenhum próximo medicamento - todos foram tomados');
    return (
      <View style={styles.container}>
        {/* Botão de Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
        
        <View style={styles.noMedicationContainer}>
          <Text style={styles.noMedicationIcon}>✅</Text>
          <Text style={styles.noMedicationTitle}>Parabéns!</Text>
          <Text style={styles.noMedicationText}>
            Todos os medicamentos de hoje já foram tomados.
          </Text>
        </View>
      </View>
    );
  }

  console.log('🎯 Renderizando tela com próximo medicamento:', nextMedication.remedioNome);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1976d2" />
      
      {/* Botão de Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sair</Text>
      </TouchableOpacity>
      
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
        <View style={styles.headerContainer}>
          <Text style={styles.headerIcon}>💊</Text>
          <Text style={styles.headerTitle}>PRÓXIMO MEDICAMENTO</Text>
        </View>

        <View style={styles.medicationInfo}>
          <Text style={styles.dependentName}>
            👤 {nextMedication.dependenteNome}
          </Text>
          
          <View style={styles.medicationCard}>
            <Text style={styles.medicationName}>
              💊 {nextMedication.remedioNome}
            </Text>
            <Text style={styles.medicationDose}>
              📋 {nextMedication.dosagem}
            </Text>
            <Text style={styles.medicationTime}>
              🕐 {nextMedication.horario}
            </Text>
          </View>
        </View>

        <View style={styles.timeInfo}>
          <Text style={styles.currentTime}>
            Agora: {formatarHorario(currentTime)}
          </Text>
          {!isTimeCorrect && (
            <Text style={styles.timeUntil}>
              Próximo medicamento {getTimeUntilNext()}
            </Text>
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
          <Text style={[
            styles.takeButtonText,
            !isTimeCorrect && styles.takeButtonTextDisabled
          ]}>
            {isTimeCorrect ? '✓ MEDICAMENTO TOMADO' : '⏱️ AGUARDE O HORÁRIO'}
          </Text>
        </TouchableOpacity>

        {isTimeCorrect && (
          <Text style={styles.canTakeText}>
            ✨ Horário correto! Pode tomar o medicamento
          </Text>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  logoutButtonText: {
    fontSize: 24,
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
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerIcon: {
    fontSize: 80,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
  },
  medicationInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  dependentName: {
    fontSize: 28,
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
  timeInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  currentTime: {
    fontSize: 20,
    color: '#ffffff',
    fontFamily: 'monospace',
    marginBottom: 10,
    opacity: 0.9,
  },
  timeUntil: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.8,
    textAlign: 'center',
  },
  takeButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 25,
    minWidth: width * 0.8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  takeButtonDisabled: {
    backgroundColor: '#757575',
    elevation: 2,
  },
  takeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  takeButtonTextDisabled: {
    opacity: 0.7,
  },
  canTakeText: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 20,
    textAlign: 'center',
    opacity: 0.9,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  noMedicationContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  noMedicationIcon: {
    fontSize: 100,
    marginBottom: 20,
  },
  noMedicationTitle: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  noMedicationText: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
});

export default NextMedicationScreen;