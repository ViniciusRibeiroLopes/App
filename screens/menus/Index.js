import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Animated,
  TouchableWithoutFeedback,
  Modal,
  Platform,
  SafeAreaView,
  FlatList,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

const {width, height} = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;

const Index = ({navigation}) => {
  const [medicamentos, setMedicamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMedications, setLoadingMedications] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dependentes, setDependentes] = useState([]);
  const [currentMedicationIndex, setCurrentMedicationIndex] = useState(0);
  const [userName, setUserName] = useState('Usuário');

  const [stats, setStats] = useState({
    medicamentosAtivos: 0,
    alertasHoje: 0,
    dependentes: 0,
    nextMedications: [],
    totalAlarms: 0,
  });

  const user = auth().currentUser;

  const slideAnim = useRef(new Animated.Value(-250)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const tutorialFade = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  // Tutorial steps
  const tutorialSteps = [
    {
      title: 'Bem-vindo ao PillCheck!',
      description:
        'Seu assistente pessoal para gerenciar medicamentos de forma simples e eficiente.',
      icon: 'heart',
      color: '#10B981',
    },
    {
      title: 'Gerencie Dependentes!',
      description:
        'Cuide de quem você ama! Adicione familiares e acompanhe os medicamentos deles.',
      icon: 'people',
      color: '#10B981',
      highlight: 'dependentes',
    },
    {
      title: 'Configure Alarmes!',
      description:
        'Nunca mais esqueça um medicamento. Configure lembretes personalizados.',
      icon: 'alarm',
      color: '#10B981',
      highlight: 'alarmes',
    },
    { 
      title: 'Adicione Medicamentos',
      description:
        'Cadastre seus remédios com dosagem, horários e informações importantes.',
      icon: 'medical',
      color: '#10B981',
      highlight: 'remedios',
    },
  ];

  // Buscar nome do usuário do Firebase
  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;

      try {
        const userDoc = await firestore()
          .collection('users')
          .doc(user.uid)
          .get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          const nome = userData.nome || userData.nomeCompleto || user.displayName || 'Usuário';
          setUserName(nome);
          console.log('✅ Nome do usuário carregado:', nome);
        } else {
          // Se não tem documento, usa o displayName do Firebase Auth
          setUserName(user.displayName || 'Usuário');
        }
      } catch (error) {
        console.error('❌ Erro ao buscar nome do usuário:', error);
        setUserName(user.displayName || 'Usuário');
      }
    };

    fetchUserName();
  }, [user]);

  useEffect(() => {
    checkFirstAccess();
  }, []);

  const checkFirstAccess = async () => {
    try {
      const hasSeenTutorial = await AsyncStorage.getItem('hasSeenTutorial');
      if (!hasSeenTutorial) {
        setTimeout(() => {
          setTutorialVisible(true);
          Animated.timing(tutorialFade, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao verificar tutorial:', error);
    }
  };

  const completeTutorial = async () => {
    try {
      await AsyncStorage.setItem('hasSeenTutorial', 'true');
      Animated.timing(tutorialFade, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setTutorialVisible(false);
        setTutorialStep(0);
      });
    } catch (error) {
      console.error('Erro ao salvar tutorial:', error);
    }
  };

  const nextTutorialStep = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      completeTutorial();
    }
  };

  const skipTutorial = () => {
    completeTutorial();
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

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

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnimation.start();

    return () => {
      backgroundAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setLoadingMedications(false);
      return;
    }

    const unsubscribe = firestore()
      .collection('remedios')
      .where('usuarioId', '==', user.uid)
      .onSnapshot(
        snapshot => {
          if (!snapshot || !snapshot.docs) {
            setLoading(false);
            return;
          }

          const lista = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          setMedicamentos(lista);
          setStats(prev => ({...prev, medicamentosAtivos: lista.length}));
          setLoading(false);
        },
        error => {
          console.error('Erro ao buscar medicamentos:', error);
          setLoading(false);
        },
      );

    const unsubscribeDependentes = firestore()
      .collection('users_dependentes')
      .where('usuarioId', '==', user.uid)
      .onSnapshot(
        snapshot => {
          const deps = snapshot?.docs?.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              nome: data.nome || data.nomeCompleto || 'Dependente',
              relacao: data.parentesco || 'Familiar',
              email: data.email || '',
              ...data,
            };
          }) || [];
          setDependentes(deps);
          setStats(prev => ({...prev, dependentes: deps.length}));
        },
        error => {
          console.error('Erro ao buscar dependentes:', error);
        }
      );

    const unsubscribeAlertas = firestore()
      .collection('alertas')
      .where('usuarioId', '==', user.uid)
      .onSnapshot(async snapshot => {
        try {
          setLoadingMedications(true);
          
          if (!snapshot || !snapshot.docs) {
            setStats(prev => ({
              ...prev,
              nextMedications: [],
              totalAlarms: 0,
            }));
            setLoadingMedications(false);
            return;
          }

          const alertasData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          const alertasAtivos = alertasData.filter(
            alerta => alerta.ativo !== false,
          );

          const alertasComNomes = await Promise.all(
            alertasAtivos.map(async alerta => {
              let nomeRemedio = alerta.titulo || 'Medicamento';
              if (alerta.remedioId) {
                try {
                  const remedioDoc = await firestore()
                    .collection('remedios')
                    .doc(alerta.remedioId)
                    .get();
                  if (remedioDoc.exists) {
                    nomeRemedio = remedioDoc.data().nome || nomeRemedio;
                  }
                } catch (error) {
                  console.error('Erro ao buscar remédio:', error);
                }
              }
              return {
                ...alerta,
                nomeRemedio,
              };
            }),
          );

          const medicationStats = await getMedicationStats(alertasComNomes);

          setStats(prev => ({
            ...prev,
            ...medicationStats,
            totalAlarms: alertasAtivos.length,
          }));
          
          setLoadingMedications(false);
        } catch (error) {
          console.error('Erro ao processar alertas:', error);
          setLoadingMedications(false);
        }
      });

    // Listener para medicamentos tomados
    const unsubscribeTomados = firestore()
      .collection('medicamentos_tomados')
      .where('usuarioId', '==', user.uid)
      .onSnapshot(
        async snapshot => {
          setLoadingMedications(true);
          
          // Quando houver mudança nos medicamentos tomados, recarrega os stats
          const alertasSnapshot = await firestore()
            .collection('alertas')
            .where('usuarioId', '==', user.uid)
            .get();

          const alertasData = alertasSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          const alertasAtivos = alertasData.filter(
            alerta => alerta.ativo !== false,
          );

          const alertasComNomes = await Promise.all(
            alertasAtivos.map(async alerta => {
              let nomeRemedio = alerta.titulo || 'Medicamento';
              if (alerta.remedioId) {
                try {
                  const remedioDoc = await firestore()
                    .collection('remedios')
                    .doc(alerta.remedioId)
                    .get();
                  if (remedioDoc.exists) {
                    nomeRemedio = remedioDoc.data().nome || nomeRemedio;
                  }
                } catch (error) {
                  console.error('Erro ao buscar remédio:', error);
                }
              }
              return {
                ...alerta,
                nomeRemedio,
              };
            }),
          );

          const medicationStats = await getMedicationStats(alertasComNomes);

          setStats(prev => ({
            ...prev,
            ...medicationStats,
          }));
          
          setLoadingMedications(false);
        },
        error => {
          console.error('Erro ao monitorar medicamentos tomados:', error);
          setLoadingMedications(false);
        }
      );

    return () => {
      unsubscribe();
      unsubscribeDependentes();
      unsubscribeAlertas();
      unsubscribeTomados();
    };
  }, [user]);

  const getMedicationStats = async alertasData => {
    if (!alertasData || alertasData.length === 0) {
      return {
        nextMedications: [{type: 'empty', id: 'empty'}],
      };
    }

    const now = new Date();
    const currentDay = now.getDay();
    const diasSemana = [
      'domingo',
      'segunda',
      'terça',
      'quarta',
      'quinta',
      'sexta',
      'sábado',
    ];
    const diasSemanaShort = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const currentDayName = diasSemana[currentDay];
    const currentDayNameShort = diasSemanaShort[currentDay];
    const diaHoje = now.toISOString().slice(0, 10);

    // Buscar medicamentos já tomados hoje
    let medicamentosTomadosHoje = [];
    try {
      const tomadosSnapshot = await firestore()
        .collection('medicamentos_tomados')
        .where('usuarioId', '==', user?.uid)
        .where('dia', '==', diaHoje)
        .get();
      
      medicamentosTomadosHoje = tomadosSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          alertaId: data.alertaId,
          horario: data.horario,
          tomadoEm: data.tomadoEm,
        };
      });
      
      console.log('💊 Medicamentos tomados hoje:', medicamentosTomadosHoje.length);
    } catch (error) {
      console.error('Erro ao buscar medicamentos tomados:', error);
    }

    let nextMedicationsToday = [];
    let totalHorarioToday = 0;
    let totalDiasToday = 0;
    let totalIntervaloToday = 0;
    let pendingHorario = 0;
    let pendingDias = 0;
    let pendingIntervalo = 0;

    // Processar alarmes de horário fixo e dias
    for (let alerta of alertasData) {
      try {
        if (alerta.tipoAlerta === 'horario' || alerta.tipoAlerta === 'dias') {
          let isToday = false;

          if (alerta.dias) {
            let diasArray = [];

            if (Array.isArray(alerta.dias)) {
              diasArray = alerta.dias.map(d => d.toLowerCase().trim());
            } else if (typeof alerta.dias === 'string') {
              diasArray = alerta.dias
                .toLowerCase()
                .split(',')
                .map(d => d.trim());
            }

            isToday =
              diasArray.includes(currentDayName) ||
              diasArray.includes(currentDayNameShort);
          } else {
            isToday = true;
          }

          if (isToday) {
            if (alerta.tipoAlerta === 'horario') {
              totalHorarioToday++;
            } else {
              totalDiasToday++;
            }
          }

          if (alerta.horario && isToday) {
            try {
              // Verificar se este medicamento já foi tomado
              const jaTomado = medicamentosTomadosHoje.some(
                tomado => tomado.alertaId === alerta.id && tomado.horario === alerta.horario
              );

              if (jaTomado) {
                console.log(`✅ Medicamento ${alerta.nomeRemedio} às ${alerta.horario} já foi tomado`);
                continue; // Pular este medicamento
              }

              const [hours, minutes] = alerta.horario.split(':').map(Number);
              const alertTime = new Date();
              alertTime.setHours(hours, minutes, 0, 0);

              if (alertTime > now) {
                const timeDiff = alertTime - now;
                const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
                const minutesRemaining = Math.floor(
                  (timeDiff % (1000 * 60 * 60)) / (1000 * 60),
                );

                let timeRemaining;
                if (hoursRemaining > 0) {
                  timeRemaining = `em ${hoursRemaining}h ${minutesRemaining}min`;
                } else {
                  timeRemaining = `em ${minutesRemaining}min`;
                }

                nextMedicationsToday.push({
                  ...alerta,
                  timeRemaining,
                  alertTime,
                  type: alerta.tipoAlerta === 'dias' ? 'dias' : 'horario',
                });

                if (alerta.tipoAlerta === 'horario') {
                  pendingHorario++;
                } else {
                  pendingDias++;
                }
              }
            } catch (error) {
              console.error('Erro ao processar horário:', error);
            }
          }
        }

        // Processar alarmes de intervalo
        if (alerta.tipoAlerta === 'intervalo') {
          totalIntervaloToday++;
          
          try {
            const nextIntervalTime = calculateNextIntervalTime(alerta, now);
            
            if (nextIntervalTime && nextIntervalTime > now) {
              const horarioFormatado = nextIntervalTime.toTimeString().slice(0, 5);
              
              // Verificar se este horário já foi tomado
              const jaTomado = medicamentosTomadosHoje.some(
                tomado => tomado.alertaId === alerta.id && tomado.horario === horarioFormatado
              );

              if (jaTomado) {
                console.log(`✅ Medicamento intervalar ${alerta.nomeRemedio} às ${horarioFormatado} já foi tomado`);
                continue;
              }

              const timeDiff = nextIntervalTime - now;
              const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
              const minutesRemaining = Math.floor(
                (timeDiff % (1000 * 60 * 60)) / (1000 * 60),
              );

              let timeRemaining;
              if (hoursRemaining > 0) {
                timeRemaining = `em ${hoursRemaining}h ${minutesRemaining}min`;
              } else {
                timeRemaining = `em ${minutesRemaining}min`;
              }

              nextMedicationsToday.push({
                ...alerta,
                timeRemaining,
                alertTime: nextIntervalTime,
                horario: horarioFormatado,
                type: 'intervalo',
              });
              
              pendingIntervalo++;
            }
          } catch (error) {
            console.error('Erro ao processar intervalo:', error);
          }
        }
      } catch (error) {
        console.error('Erro ao processar alerta:', error);
      }
    }

    nextMedicationsToday.sort((a, b) => a.alertTime - b.alertTime);

    console.log('📊 Total horário hoje:', totalHorarioToday, 'Pendentes:', pendingHorario);
    console.log('📊 Total dias hoje:', totalDiasToday, 'Pendentes:', pendingDias);
    console.log('📊 Total intervalo hoje:', totalIntervaloToday, 'Pendentes:', pendingIntervalo);
    console.log('📊 Próximos medicamentos encontrados:', nextMedicationsToday.length);

    // Adicionar cards de conclusão por tipo
    if (totalHorarioToday > 0 && pendingHorario === 0) {
      nextMedicationsToday.push({type: 'no-more-horario', id: 'no-more-horario', alertTime: new Date(8640000000000000)});
    }
    
    if (totalDiasToday > 0 && pendingDias === 0) {
      nextMedicationsToday.push({type: 'no-more-dias', id: 'no-more-dias', alertTime: new Date(8640000000000000)});
    }
    
    if (totalIntervaloToday > 0 && pendingIntervalo === 0) {
      nextMedicationsToday.push({type: 'no-more-intervalo', id: 'no-more-intervalo', alertTime: new Date(8640000000000000)});
    }

    // Se não tem nenhum medicamento configurado
    if (totalHorarioToday === 0 && totalDiasToday === 0 && totalIntervaloToday === 0) {
      return {
        nextMedications: [{type: 'empty', id: 'empty'}],
      };
    }

    // Se tem medicamentos mas nenhum pendente
    if (nextMedicationsToday.length === 0 || nextMedicationsToday.every(m => m.type.startsWith('no-more'))) {
      if (medicamentosTomadosHoje.length > 0) {
        return {
          nextMedications: [{type: 'completed', id: 'completed'}],
        };
      }
    }

    // Re-ordenar para manter pendentes primeiro, depois os cards de conclusão
    const pending = nextMedicationsToday.filter(m => !m.type.startsWith('no-more'));
    const completed = nextMedicationsToday.filter(m => m.type.startsWith('no-more'));
    
    return {
      nextMedications: [...pending, ...completed],
    };
  };

  const calculateNextIntervalTime = (alerta, now) => {
    try {
      if (!alerta.horarioInicio || !alerta.intervaloHoras) {
        return null;
      }

      const [hora, minuto] = alerta.horarioInicio.split(':').map(Number);
      const horarioBase = new Date(now);
      horarioBase.setHours(hora, minuto, 0, 0);

      const intervaloMs = alerta.intervaloHoras * 60 * 60 * 1000;

      // Se ainda não chegou o horário base de hoje, retorna o horário base
      if (now < horarioBase) {
        return horarioBase;
      }

      // Calcular quanto tempo passou desde o horário base
      const tempoDecorrido = now - horarioBase;
      
      // Calcular quantas doses já passaram
      const dosesPassadas = Math.floor(tempoDecorrido / intervaloMs);
      
      // Calcular o próximo horário
      const proximoHorario = new Date(horarioBase.getTime() + (dosesPassadas + 1) * intervaloMs);

      return proximoHorario;
    } catch (error) {
      console.error('Erro ao calcular próximo intervalo:', error);
      return null;
    }
  };

  const toggleMenu = () => {
    if (menuVisible) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -250,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setMenuVisible(false);
    });
  };

  const handleLogout = async () => {
    closeMenu();
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      {text: 'Cancelar', style: 'cancel'},
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await auth().signOut();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível sair da conta.');
          }
        },
      },
    ]);
  };

  const renderTutorial = () => {
    const step = tutorialSteps[tutorialStep];

    return (
      <Modal
        visible={tutorialVisible}
        transparent={true}
        animationType="none"
        onRequestClose={skipTutorial}>
        <Animated.View
          style={[
            styles.tutorialOverlay,
            {
              opacity: tutorialFade,
            },
          ]}>
          <View style={styles.tutorialContent}>
            <View
              style={[styles.tutorialIconContainer, {backgroundColor: step.color}]}>
              <Icon name={step.icon} size={40} color="#FFFFFF" />
            </View>

            <Text style={styles.tutorialTitle}>{step.title}</Text>
            <Text style={styles.tutorialDescription}>{step.description}</Text>

            <View style={styles.tutorialProgress}>
              {tutorialSteps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.tutorialDot,
                    index === tutorialStep && styles.tutorialDotActive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.tutorialButtons}>
              <TouchableOpacity
                style={styles.tutorialSkipButton}
                onPress={skipTutorial}>
                <Text style={styles.tutorialSkipText}>Pular</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tutorialNextButton, {backgroundColor: step.color}]}
                onPress={nextTutorialStep}>
                <Text style={styles.tutorialNextText}>
                  {tutorialStep === tutorialSteps.length - 1
                    ? 'Começar'
                    : 'Próximo'}
                </Text>
                <Icon name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Modal>
    );
  };

  const renderHamburgerMenu = () => (
    <Modal
      visible={menuVisible}
      transparent={true}
      animationType="none"
      onRequestClose={closeMenu}>
      <TouchableWithoutFeedback onPress={closeMenu}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sideMenu,
                {
                  transform: [{translateX: slideAnim}],
                },
              ]}>
              <View style={styles.menuHeader}>
                <View style={styles.userInfoContainer}>
                  <View style={styles.avatarContainer}>
                    <Text style={styles.avatarInitial}>
                      {userName?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {userName}
                    </Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeMenuButton}
                  onPress={closeMenu}>
                  <Icon name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.menuItems}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    navigation.navigate('Perfil');
                  }}>
                  <Icon name="person-outline" size={20} color="#e2e8f0" />
                  <Text style={styles.menuItemText}>Meu Perfil</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    navigation.navigate('Configuracoes');
                  }}>
                  <Icon name="settings-outline" size={20} color="#e2e8f0" />
                  <Text style={styles.menuItemText}>Configurações</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    setTutorialVisible(true);
                    setTutorialStep(0);
                    Animated.timing(tutorialFade, {
                      toValue: 1,
                      duration: 500,
                      useNativeDriver: true,
                    }).start();
                  }}>
                  <Icon name="help-circle-outline" size={20} color="#e2e8f0" />
                  <Text style={styles.menuItemText}>Tutorial</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, styles.logoutMenuItem]}
                  onPress={handleLogout}>
                  <Icon name="log-out-outline" size={20} color="#E53E3E" />
                  <Text style={[styles.menuItemText, styles.logoutText]}>
                    Sair da conta
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderDependentesDestaque = () => {
    return (
      <Animated.View
        style={[
          styles.dependentesSection,
          {
            opacity: fadeAnim,
            transform: [{scale: pulseAnim}],
          },
        ]}>
        <View style={styles.dependentesBanner}>
          <View style={styles.dependentesHeader}>
            <View style={styles.dependentesTitleContainer}>
              <Icon name="people" size={24} color="#FFFFFF" />
              <Text style={styles.dependentesTitle}>Cuide de Quem Ama</Text>
            </View>
            <View style={styles.dependentesBadge}>
              <Text style={styles.dependentesBadgeText}>
                {stats.dependentes}
              </Text>
            </View>
          </View>

          <Text style={styles.dependentesDescription}>
            Gerencie os medicamentos de toda sua família em um só lugar
          </Text>

          {dependentes.length === 0 ? (
            <View style={styles.dependentesEmpty}>
              <Icon name="person-add" size={32} color="#64748b" />
              <Text style={styles.dependentesEmptyText}>
                Adicione seu primeiro dependente
              </Text>
              <TouchableOpacity
                style={styles.dependentesAddButton}
                onPress={() => navigation.navigate('DependentesMenu')}>
                <Icon name="add" size={20} color="#FFFFFF" />
                <Text style={styles.dependentesAddButtonText}>
                  Adicionar Dependente
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.dependentesList}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dependentesScroll}>
                {dependentes.slice(0, 3).map((dep, index) => (
                  <View key={dep.id} style={styles.dependenteCard}>
                    <View style={styles.dependenteAvatar}>
                      <Text style={styles.dependenteAvatarText}>
                        {dep.nome?.charAt(0).toUpperCase() || 'D'}
                      </Text>
                    </View>
                    <Text style={styles.dependenteNome} numberOfLines={1}>
                      {dep.nome}
                    </Text>
                    <Text style={styles.dependenteRelacao} numberOfLines={1}>
                      {dep.relacao || 'Dependente'}
                    </Text>
                  </View>
                ))}
                {dependentes.length > 3 && (
                  <TouchableOpacity
                    style={styles.dependenteCardMore}
                    onPress={() => navigation.navigate('DependentesMenu')}>
                    <Icon name="add" size={24} color="#10B981" />
                    <Text style={styles.dependenteMoreText}>
                      +{dependentes.length - 3}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.dependentesViewAllButton}
                onPress={() => navigation.navigate('DependentesMenu')}>
                <Text style={styles.dependentesViewAllText}>
                  Ver Todos os Dependentes
                </Text>
                <Icon name="arrow-forward" size={16} color="#10B981" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderMedicationCard = ({item, index}) => {
    console.log('🎨 Renderizando card:', item.type, item.nomeRemedio || item.type);
    
    if (item.type === 'empty') {
      return (
        <View style={[styles.nextMedCard, styles.specialCard, {backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)'}]}>
          <View style={styles.specialCardContent}>
            <Icon name="checkmark-circle" size={56} color="#10B981" />
            <Text style={styles.specialCardTitle}>Tudo em dia!</Text>
            <Text style={styles.specialCardText}>
              Nenhum medicamento agendado para agora
            </Text>
          </View>
        </View>
      );
    }

    if (item.type === 'completed') {
      return (
        <View style={[styles.nextMedCard, styles.specialCard, {backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)'}]}>
          <View style={styles.specialCardContent}>
            <Icon name="trophy" size={56} color="#F59E0B" />
            <Text style={[styles.specialCardTitle, {color: '#F59E0B'}]}>Parabéns!</Text>
            <Text style={styles.specialCardText}>
              Todos os medicamentos de hoje foram tomados
            </Text>
            <View style={styles.completedBadge}>
              <Icon name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.completedBadgeText}>100% Completo</Text>
            </View>
          </View>
        </View>
      );
    }

    if (item.type === 'no-more-horario') {
      return (
        <View style={[styles.nextMedCard, styles.specialCard, {backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)'}]}>
          <View style={styles.specialCardContent}>
            <Icon name="time-outline" size={56} color="#10B981" />
            <Text style={styles.specialCardTitle}>Horários Concluídos</Text>
            <Text style={styles.specialCardText}>
              Todos os medicamentos de horário fixo foram tomados hoje
            </Text>
            <View style={styles.typeIndicator}>
              <Icon name="alarm-outline" size={16} color="#10B981" />
              <Text style={styles.typeIndicatorText}>Horário Fixo</Text>
            </View>
          </View>
        </View>
      );
    }

    if (item.type === 'no-more-dias') {
      return (
        <View style={[styles.nextMedCard, styles.specialCard, {backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)'}]}>
          <View style={styles.specialCardContent}>
            <Icon name="calendar-outline" size={56} color="#10B981" />
            <Text style={styles.specialCardTitle}>Dias Concluídos</Text>
            <Text style={styles.specialCardText}>
              Todos os medicamentos agendados por dias foram tomados hoje
            </Text>
            <View style={styles.typeIndicator}>
              <Icon name="calendar" size={16} color="#10B981" />
              <Text style={styles.typeIndicatorText}>Por Dias</Text>
            </View>
          </View>
        </View>
      );
    }

    if (item.type === 'no-more-intervalo') {
      return (
        <View style={[styles.nextMedCard, styles.specialCard, {backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)'}]}>
          <View style={styles.specialCardContent}>
            <Icon name="timer-outline" size={56} color="#6366F1" />
            <Text style={[styles.specialCardTitle, {color: '#A5B4FC'}]}>Intervalos Concluídos</Text>
            <Text style={styles.specialCardText}>
              Todos os medicamentos de intervalo foram tomados hoje
            </Text>
            <View style={[styles.typeIndicator, {backgroundColor: 'rgba(99, 102, 241, 0.2)', borderColor: 'rgba(99, 102, 241, 0.3)'}]}>
              <Icon name="timer" size={16} color="#6366F1" />
              <Text style={[styles.typeIndicatorText, {color: '#A5B4FC'}]}>Intervalo</Text>
            </View>
          </View>
        </View>
      );
    }

    const isIntervalo = item.type === 'intervalo';
    const isDias = item.type === 'dias';
    
    const cardColor = isIntervalo ? '#6366F1' : '#10B981';
    const bgColor = isIntervalo ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)';
    const borderColor = isIntervalo ? 'rgba(99, 102, 241, 0.3)' : 'rgba(16, 185, 129, 0.3)';

    return (
      <View style={[styles.nextMedCard, {backgroundColor: bgColor, borderColor: borderColor, shadowColor: cardColor}]}>
        {isIntervalo && (
          <View style={styles.intervalBadgeSmall}>
            <Icon name="timer-outline" size={14} color="#6366F1" />
            <Text style={styles.intervalBadgeText}>
              A cada {item.intervaloHoras}h
            </Text>
          </View>
        )}
        
        {isDias && item.dias && (
          <View style={styles.diasBadgeSmall}>
            <Icon name="calendar-outline" size={14} color="#10B981" />
            <Text style={styles.diasBadgeText}>
              {Array.isArray(item.dias) ? item.dias.join(', ') : item.dias}
            </Text>
          </View>
        )}
        
        <View style={styles.nextMedTop}>
          <View style={[styles.nextMedIconContainer, {backgroundColor: `${cardColor}40`, borderColor: `${cardColor}66`}]}>
            <Icon name="alarm" size={20} color={cardColor} />
          </View>
          <View style={styles.nextMedInfo}>
            <Text style={styles.nextMedTime}>
              {item.horario}
            </Text>
            <Text style={[styles.nextMedRemaining, {color: cardColor}]}>
              {item.timeRemaining}
            </Text>
          </View>
        </View>
        <Text style={styles.nextMedName} numberOfLines={2}>
          {item.nomeRemedio}
        </Text>
        <Text style={styles.nextMedDosage} numberOfLines={1}>
          {item.dosagem}
        </Text>
      </View>
    );
  };

  const onViewableItemsChanged = useRef(({viewableItems}) => {
    if (viewableItems.length > 0) {
      setCurrentMedicationIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderNextMedication = () => {
    const medications = stats.nextMedications || [];
    const hasMultipleMeds = medications.length > 1;

    console.log('🎯 Renderizando medicamentos:', medications.length);
    console.log('🎯 Dados:', medications);

    return (
      <Animated.View
        style={[
          styles.nextMedSection,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          },
        ]}>
        <View style={styles.sectionHeader}>
          <Icon name="time" size={20} color="#10B981" />
          <Text style={styles.sectionTitle}>Próximos Medicamentos</Text>
        </View>

        {loadingMedications ? (
          <View style={styles.medicationLoadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.medicationLoadingText}>Carregando medicamentos...</Text>
          </View>
        ) : (
          <View style={styles.carouselContainer}>
            <FlatList
              ref={flatListRef}
              data={medications}
              renderItem={renderMedicationCard}
              keyExtractor={(item, index) => item.id || `med-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={width - 48}
              snapToAlignment="center"
              decelerationRate="fast"
              contentContainerStyle={styles.medicationsCarousel}
              pagingEnabled={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              extraData={medications}
            />
            
            {hasMultipleMeds && (
              <View style={styles.paginationDots}>
                {medications.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === currentMedicationIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </Animated.View>
    );
  };

  const renderQuickActions = () => {
    const actions = [
      {
        icon: 'alarm',
        text: 'Alarmes',
        route: 'AlertasMenu',
        component: Icon,
        gradient: ['#4D97DB', '#3B82F6'],
      },
      {
        icon: 'medication',
        text: 'Remédios',
        route: 'RemediosMenu',
        component: MaterialIcons,
        gradient: ['#E53E3E', '#DC2626'],
      },
      {
        icon: 'bar-chart',
        text: 'Histórico',
        route: 'HistoricoMenu',
        component: Icon,
        gradient: ['#F59E0B', '#D97706'],
      },
    ];

    return (
      <Animated.View
        style={[
          styles.actionsSection,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          },
        ]}>
        <View style={styles.sectionHeader}>
          <Icon name="grid" size={20} color="#e2e8f0" />
          <Text style={styles.sectionTitle}>Acesso Rápido</Text>
        </View>

        <View style={styles.actionsGrid}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.route)}>
              <View
                style={[
                  styles.actionIconContainer,
                  {backgroundColor: action.gradient[0] + '25'},
                ]}>
                <action.component
                  name={action.icon}
                  size={action.component === FontAwesome5 ? 18 : 22}
                  color={action.gradient[0]}
                />
              </View>
              <Text style={styles.actionText}>{action.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
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
        <TouchableOpacity style={styles.hamburgerButton} onPress={toggleMenu}>
          <Icon name="menu" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>PillCheck</Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {renderDependentesDestaque()}
        {renderQuickActions()}
        {renderNextMedication()}
      </ScrollView>

      {renderHamburgerMenu()}
      {renderTutorial()}
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
  hamburgerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerSpacer: {
    width: 44,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'capitalize',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 25,
    paddingBottom: 30,
  },
  dependentesSection: {
    marginBottom: 20,
  },
  dependentesBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  dependentesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dependentesTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dependentesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  dependentesBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dependentesBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dependentesDescription: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 18,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  dependentesEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  dependentesEmptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 10,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  dependentesAddButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  dependentesAddButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  dependentesList: {
    gap: 12,
  },
  dependentesScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  dependenteCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  dependenteAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  dependenteAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  dependenteNome: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 2,
    textAlign: 'center',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  dependenteRelacao: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  dependenteCardMore: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  dependenteMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 4,
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  dependentesViewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  dependentesViewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
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
  nextMedSection: {
    marginBottom: 20,
  },
  carouselContainer: {
    position: 'relative',
  },
  medicationsCarousel: {
    gap: 16,
    paddingHorizontal: 0,
  },
  nextMedCard: {
    width: width - 64,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginHorizontal: 8,
    minHeight: 140,
    justifyContent: 'center',
  },
  specialCard: {
    minHeight: 150,
    justifyContent: 'center',
  },
  specialCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  specialCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 10,
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  specialCardText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.2,
    paddingHorizontal: 10,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  typeIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6EE7B7',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  completedBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  intervalBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  intervalBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A5B4FC',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  diasBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  diasBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6EE7B7',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  nextMedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  nextMedIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
  },
  nextMedInfo: {
    flex: 1,
  },
  nextMedTime: {
    fontSize: 24,
    fontWeight: '300',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -1,
    marginBottom: 2,
  },
  nextMedRemaining: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  nextMedName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 3,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  nextMedDosage: {
    fontSize: 12,
    color: '#94a3b8',
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  medicationLoadingContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  medicationLoadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
    textAlign: 'center',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sideMenu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: 'rgba(30, 41, 59, 1)',
    shadowColor: '#000',
    shadowOffset: {width: 2, height: 0},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderRightWidth: 1,
    borderRightColor: 'rgba(51, 65, 85, 0.6)',
  },
  menuHeader: {
    backgroundColor: '#121A29',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.6)',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  userEmail: {
    fontSize: 12,
    color: '#94a3b8',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  closeMenuButton: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  menuItems: {
    flex: 1,
    paddingTop: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.3)',
  },
  menuItemText: {
    fontSize: 16,
    color: '#e2e8f0',
    marginLeft: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  logoutMenuItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#E53E3E',
  },
  tutorialOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  tutorialContent: {
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderRadius: 24,
    padding: 30,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  tutorialIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tutorialTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  tutorialDescription: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  tutorialProgress: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 30,
  },
  tutorialDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tutorialDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  tutorialButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  tutorialSkipButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  tutorialSkipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  tutorialNextButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tutorialNextText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default Index;