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
  Modal,
  TextInput,
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';

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

const NextMedicationScreen = ({ navigation }) => {
  const [nextMedication, setNextMedication] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTimeCorrect, setIsTimeCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [senhaAdmin, setSenhaAdmin] = useState('');
  const [senhaDigits, setSenhaDigits] = useState(['', '', '', '', '', '']);
  const [userId, setUserId] = useState(null);
  const [adminUid, setAdminUid] = useState(null);
  
  const inputRefs = useRef([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  const uid = auth().currentUser?.uid;

  useEffect(() => {
    console.log('=== INICIANDO TELA ===');
    console.log('UID:', uid);
    
    if (uid) {
      setUserId(uid);
      buscarSenhaAdmin(uid);
      fetchNextMedication();
      startTimeUpdater();
    }

    // Animação de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsação sutil no botão
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
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

    // Rotação suave do ícone de loading
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );

    // Animação do fundo
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
      ])
    );

    pulseAnimation.start();
    rotateAnimation.start();
    backgroundAnimation.start();

    return () => {
      pulseAnimation.stop();
      rotateAnimation.stop();
      backgroundAnimation.stop();
    };
  }, []);

  useEffect(() => {
    checkTimeCorrectness();
  }, [currentTime, nextMedication]);

  const buscarSenhaAdmin = async (userUid) => {
    try {
      console.log('🔍 Buscando senha admin para dependente UID:', userUid);
      
      // Primeiro, busca o documento do dependente
      const dependenteDoc = await firestore()
        .collection('users_dependentes')
        .doc(userUid)
        .get();
      
      console.log('📄 Documento dependente existe?', dependenteDoc.exists);
      
      if (dependenteDoc.exists) {
        const dependenteData = dependenteDoc.data();
        console.log('📋 Dados do dependente:', dependenteData);
        
        const adminUid = dependenteData.usuarioId;
        console.log('👤 UID do administrador:', adminUid);
        
        if (adminUid) {
          setAdminUid(adminUid); // Salva o UID do admin
          
          // Agora busca o documento do administrador
          const adminDoc = await firestore()
            .collection('users')
            .doc(adminUid)
            .get();
          
          console.log('📄 Documento admin existe?', adminDoc.exists);
          
          if (adminDoc.exists) {
            const adminData = adminDoc.data();
            console.log('📋 Dados do admin:', adminData);
            
            const senha = adminData.adminPassword || '';
            setSenhaAdmin(senha);
            console.log('✅ Senha admin carregada:', senha ? `Configurada (${senha.length} dígitos)` : 'Não configurada');
          } else {
            console.log('❌ Documento do administrador não encontrado');
          }
        } else {
          console.log('❌ usuarioId não encontrado no documento do dependente');
        }
      } else {
        console.log('❌ Documento do dependente não encontrado');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar senha admin:', error);
      console.error('Detalhes do erro:', error.message);
    }
  };

  const startTimeUpdater = () => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(interval);
  };

  const fetchNextMedication = async () => {
    if (!uid) {
      console.log('❌ UID não encontrado');
      return;
    }

    try {
      setLoading(true);
      const now = new Date();
      const currentTimeStr = now.toTimeString().slice(0, 5);
      const currentDay = diasSemana[now.getDay()].abrev;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diaStr = today.toISOString().slice(0, 10);

      console.log('📅 Buscando medicamentos para:', currentDay, currentTimeStr);

      const alertasSnapshot = await firestore()
        .collection('alertas_dependentes')
        .where('dependenteId', '==', uid)
        .get();

      console.log('📋 Alertas encontrados:', alertasSnapshot.docs.length);

      let nextMed = null;
      let closestTime = null;

      for (const doc of alertasSnapshot.docs) {
        const alerta = doc.data();
        
        if (!alerta.dias.includes(currentDay)) continue;

        const tomadoSnapshot = await firestore()
          .collection('medicamentos_tomados_dependentes')
          .where('dependenteId', '==', alerta.dependenteId)
          .where('remedioId', '==', alerta.remedioId)
          .where('horario', '==', alerta.horario)
          .where('dia', '==', diaStr)
          .get();

        if (!tomadoSnapshot.empty) continue;

        const remedioDoc = await firestore()
          .collection('remedios')
          .doc(alerta.remedioId)
          .get();

        if (remedioDoc.exists) {
          const remedioData = remedioDoc.data();
          
          const medicationData = {
            ...alerta,
            remedioNome: remedioData.nome,
            alertaId: doc.id
          };

          if (alerta.horario >= currentTimeStr) {
            if (!closestTime || alerta.horario < closestTime) {
              closestTime = alerta.horario;
              nextMed = medicationData;
            }
          }
        }
      }

      console.log('🎯 Próximo medicamento:', nextMed ? nextMed.remedioNome : 'Nenhum');
      setNextMedication(nextMed);
    } catch (error) {
      console.error('❌ Erro ao buscar medicamentos:', error);
      Alert.alert('Erro', 'Não foi possível carregar as informações.');
    } finally {
      setLoading(false);
    }
  };

  const checkTimeCorrectness = () => {
    if (!nextMedication) {
      setIsTimeCorrect(false);
      return;
    }

    const now = new Date();
    const currentTimeStr = now.toTimeString().slice(0, 5);
    const [targetHour, targetMinute] = nextMedication.horario.split(':').map(Number);
    const [currentHour, currentMinute] = currentTimeStr.split(':').map(Number);

    const targetTotalMinutes = targetHour * 60 + targetMinute;
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    
    const timeDiff = currentTotalMinutes - targetTotalMinutes;
    const canTake = timeDiff >= -5 && timeDiff <= 30;
    
    setIsTimeCorrect(canTake);
  };

  const markMedicationTaken = async () => {
    if (!nextMedication || !isTimeCorrect) return;

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

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

      await firestore().collection('medicamentos_tomados_dependentes').add(dadosParaSalvar);

      Alert.alert(
        '✅ Registrado!', 
        'Medicamento tomado com sucesso',
        [
          {
            text: 'OK',
            onPress: () => fetchNextMedication()
          }
        ]
      );

    } catch (error) {
      console.error('❌ Erro ao registrar medicamento:', error);
      Alert.alert('Erro', 'Não foi possível registrar. Tente novamente.');
    }
  };

  const handleSettingsPress = () => {
    console.log('⚙️ Botão de configurações pressionado');
    console.log('Senha admin atual:', senhaAdmin);
    console.log('Admin UID:', adminUid);
    
    if (!senhaAdmin) {
      console.log('⚠️ Senha não configurada');
      Alert.alert(
        'Senha não configurada',
        'O administrador ainda não configurou uma senha de acesso. Entre em contato com o responsável.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    console.log('✅ Abrindo modal...');
    setSenhaDigits(['', '', '', '', '', '']);
    setModalVisible(true);
  };

  const handleDigitChange = (text, index) => {
    // Permite apenas números
    const numericText = text.replace(/[^0-9]/g, '');
    
    if (numericText.length > 1) return;
    
    const newDigits = [...senhaDigits];
    newDigits[index] = numericText;
    setSenhaDigits(newDigits);
    
    // Se digitou um número, vai para o próximo campo
    if (numericText && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Se completou todos os 6 dígitos, verifica automaticamente
    if (index === 5 && numericText) {
      const senhaCompleta = newDigits.join('');
      if (senhaCompleta.length === 6) {
        setTimeout(() => verificarSenha(senhaCompleta), 100);
      }
    }
  };

  const handleKeyPress = (e, index) => {
    // Se apertar backspace e o campo estiver vazio, volta para o anterior
    if (e.nativeEvent.key === 'Backspace' && !senhaDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verificarSenha = (senhaCompleta) => {
    console.log('🔐 Verificando senha...');
    console.log('Senha digitada:', senhaCompleta);
    console.log('Senha esperada:', senhaAdmin);
    
    if (senhaCompleta === senhaAdmin) {
      console.log('✅ Senha CORRETA!');
      
      // Fecha o modal
      setModalVisible(false);
      setSenhaDigits(['', '', '', '', '', '']);
      
      // Navega para as configurações
      setTimeout(() => {
        console.log('🚀 Navegando para ConfiguracoesAdmin...');
        
        // Verifica se a navegação existe
        if (navigation && navigation.navigate) {
          // Navega passando o UID do admin como parâmetro
          navigation.navigate('ConfiguracoesAdmin', {
            adminUid: adminUid,
            dependenteUid: userId
          });
        } else {
          Alert.alert(
            '✅ Acesso Permitido',
            'Bem-vindo às configurações!\n\nNOTA: Configure a tela "ConfiguracoesAdmin" na navegação.',
            [{ text: 'OK' }]
          );
        }
      }, 300);
      
    } else {
      console.log('❌ Senha INCORRETA!');
      
      // Limpa os campos e mostra erro
      setSenhaDigits(['', '', '', '', '', '']);
      
      Alert.alert(
        '❌ Senha Incorreta',
        'A senha digitada não está correta. Tente novamente.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Volta o foco para o primeiro campo
              setTimeout(() => {
                if (inputRefs.current[0]) {
                  inputRefs.current[0].focus();
                }
              }, 100);
            }
          }
        ]
      );
    }
  };

  const handleManualVerify = () => {
    const senhaCompleta = senhaDigits.join('');
    
    if (senhaCompleta.length !== 6) {
      Alert.alert('Aviso', 'Digite todos os 6 dígitos da senha');
      return;
    }
    
    verificarSenha(senhaCompleta);
  };

  const fecharModal = () => {
    setModalVisible(false);
    setSenhaDigits(['', '', '', '', '', '']);
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
      return `Faltam ${hours}h ${minutes}min`;
    } else {
      return `Faltam ${minutes} minutos`;
    }
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Função para renderizar o modal (usada em todos os returns)
  const renderModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={fecharModal}
      onShow={() => {
        console.log('📱 Modal exibido - onShow chamado');
        setTimeout(() => {
          console.log('⌨️ Tentando focar após onShow');
          if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
            console.log('✅ Foco aplicado com sucesso');
          } else {
            console.log('❌ inputRefs.current[0] ainda é null');
          }
        }, 100);
      }}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={fecharModal}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalContent}>
            <Icon name="lock-closed" size={60} color="#3B82F6" />
            <Text style={styles.modalTitle}>Senha de Administrador</Text>
            <Text style={styles.modalSubtitle}>
              Digite os 6 dígitos da senha
            </Text>
            
            <View style={styles.digitContainer}>
              {senhaDigits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                    if (ref) console.log(`✅ Ref ${index} definida`);
                  }}
                  style={[
                    styles.digitInput,
                    digit !== '' && styles.digitInputFilled
                  ]}
                  value={digit}
                  onChangeText={(text) => handleDigitChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  secureTextEntry
                  selectTextOnFocus
                  autoFocus={index === 0}
                />
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={fecharModal}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleManualVerify}
              >
                <Text style={styles.modalConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
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
        
        <TouchableOpacity style={styles.settingsButton} onPress={handleSettingsPress}>
          <Icon name="settings-outline" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <Animated.View style={[styles.loadingContainer, { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }]}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Icon name="hourglass-outline" size={80} color="#3B82F6" />
          </Animated.View>
          <Text style={styles.loadingText}>Carregando...</Text>
        </Animated.View>

        {renderModal()}
      </View>
    );
  }

  if (!nextMedication) {
    return (
      <View style={styles.container}>
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
        
        <TouchableOpacity style={styles.settingsButton} onPress={handleSettingsPress}>
          <Icon name="settings-outline" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <Animated.View style={[styles.successContainer, { 
          opacity: fadeAnim,
          transform: [{ scale: fadeAnim }, { translateY: slideAnim }]
        }]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Icon name="checkmark-circle" size={120} color="#10B981" />
          </Animated.View>
          <Text style={styles.successTitle}>Tudo certo!</Text>
          <Text style={styles.successSubtitle}>
            Todos os medicamentos{'\n'}de hoje foram tomados
          </Text>
        </Animated.View>

        {renderModal()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
      
      <TouchableOpacity style={styles.settingsButton} onPress={handleSettingsPress}>
        <Icon name="settings-outline" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Botão de teste para abrir modal diretamente */}
      <TouchableOpacity 
        style={[styles.settingsButton, { top: 120, backgroundColor: 'red' }]} 
        onPress={() => {
          console.log('🔴 BOTÃO DE TESTE PRESSIONADO');
          console.log('Estado atual antes do setState:', modalVisible);
          setModalVisible(prevState => {
            console.log('🔴 Dentro do setState - prevState:', prevState);
            return true;
          });
          setForceUpdate(prev => prev + 1);
          console.log('🔴 setState chamado');
        }}
      >
        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>T</Text>
      </TouchableOpacity>

      {/* Indicador de estado */}
      <View style={{
        position: 'absolute',
        top: 200,
        left: 20,
        backgroundColor: modalVisible ? 'green' : 'orange',
        padding: 10,
        zIndex: 9999,
        borderRadius: 5,
      }}>
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          Modal: {modalVisible ? 'TRUE' : 'FALSE'}
        </Text>
        <Text style={{ color: 'white', fontSize: 10 }}>
          Update: {forceUpdate}
        </Text>
      </View>

      <Animated.View style={[styles.contentContainer, { 
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }]}>
        <View style={styles.clockContainer}>
          <Text style={styles.currentTime}>{formatarHorario(currentTime)}</Text>
        </View>

        {!isTimeCorrect && (
          <View style={styles.waitingContainer}>
            <Icon name="time-outline" size={40} color="#F59E0B" />
            <Text style={styles.waitingText}>{getTimeUntilNext()}</Text>
            <Text style={styles.waitingSubtext}>Volte no horário certo</Text>
          </View>
        )}

        {isTimeCorrect && (
          <>
            <View style={styles.medicationInfo}>
              <Icon name="medical" size={50} color="#3B82F6" />
              <Text style={styles.medicationName}>
                {nextMedication.remedioNome}
              </Text>
              <Text style={styles.medicationDose}>
                {nextMedication.dosagem}
              </Text>
              <Text style={styles.medicationTime}>
                Horário: {nextMedication.horario}
              </Text>
            </View>

            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={styles.takeButton}
                onPress={markMedicationTaken}
                activeOpacity={0.85}
              >
                <Animated.View style={[
                  styles.buttonPulse,
                  { transform: [{ scale: pulseAnim }] }
                ]}>
                  <Icon name="checkmark-circle" size={40} color="#FFFFFF" />
                  <Text style={styles.takeButtonText}>TOMEI</Text>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.instructionContainer}>
              <Icon name="information-circle-outline" size={24} color="#94a3b8" />
              <Text style={styles.instructionText}>
                Aperte o botão após tomar{'\n'}o medicamento
              </Text>
            </View>
          </>
        )}
      </Animated.View>

      {renderModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
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
  settingsButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 24,
  },
  loadingText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  successTitle: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 20,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 30,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
    width: '100%',
    gap: 30,
  },
  clockContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  currentTime: {
    fontSize: 48,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontWeight: '300',
    letterSpacing: 2,
  },
  waitingContainer: {
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  waitingText: {
    fontSize: 28,
    color: '#F59E0B',
    fontWeight: '700',
  },
  waitingSubtext: {
    fontSize: 20,
    color: '#94a3b8',
    fontWeight: '500',
  },
  medicationInfo: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 25,
    padding: 30,
    width: '100%',
    gap: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  medicationName: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  medicationDose: {
    fontSize: 24,
    color: '#94a3b8',
    fontWeight: '600',
    textAlign: 'center',
  },
  medicationTime: {
    fontSize: 20,
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: 8,
  },
  takeButton: {
    width: width * 0.7,
    height: width * 0.7,
    maxWidth: 280,
    maxHeight: 280,
    borderRadius: width * 0.35,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 6,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  buttonPulse: {
    alignItems: 'center',
    gap: 12,
  },
  takeButtonText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 2,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  instructionText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 25,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 20,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 10,
  },
  digitContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 20,
  },
  digitInput: {
    width: 50,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  digitInputFilled: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 10,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalCancelText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 16,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default NextMedicationScreen;