import React, {useEffect, useState, useRef} from 'react';
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
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

const {width, height} = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

const Index = ({navigation}) => {
  const [medicamentos, setMedicamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    medicamentosAtivos: 0,
    alertasHoje: 0,
    dependentes: 0,
    nextMedication: null,
    nextMedicationTomorrow: null,
    hasAlarmsOtherDays: false,
    totalAlarms: 0,
  });

  const user = auth().currentUser;
  const slideAnim = useRef(new Animated.Value(-250)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const statsSlideAnim = useRef(new Animated.Value(50)).current;
  const welcomeSlideAnim = useRef(new Animated.Value(30)).current;

  // Atualizar o tempo a cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Atualiza a cada minuto

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Animações iniciais
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
      Animated.timing(statsSlideAnim, {
        toValue: 0,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(welcomeSlideAnim, {
        toValue: 0,
        duration: 700,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Animação de fundo contínua
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
  }, [backgroundAnim, fadeAnim, slideUpAnim, statsSlideAnim, welcomeSlideAnim]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = firestore()
      .collection('remedios')
      .where('usuarioId', '==', user.uid)
      .onSnapshot(
        snapshot => {
          if (!snapshot || !snapshot.docs) {
            console.warn('Snapshot vazio ou inválido');
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
          Alert.alert('Erro', 'Não foi possível carregar os dados.');
          setLoading(false);
        },
      );

    const unsubscribeDependentes = firestore()
      .collection('dependentes')
      .where('usuarioId', '==', user.uid)
      .onSnapshot(snapshot => {
        setStats(prev => ({...prev, dependentes: snapshot?.docs?.length || 0}));
      });

    // Buscar alertas para próximo medicamento
    const unsubscribeAlertas = firestore()
      .collection('alertas')
      .where('usuarioId', '==', user.uid)
      .onSnapshot(
        async snapshot => {
          try {
            if (!snapshot || !snapshot.docs) {
              console.log('Nenhum alerta encontrado');
              setStats(prev => ({
                ...prev, 
                nextMedication: null,
                nextMedicationTomorrow: null,
                hasAlarmsOtherDays: false,
                totalAlarms: 0,
              }));
              return;
            }

            const alertasData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }));

            console.log('Alertas encontrados:', alertasData.length);

            // Filtrar apenas alertas ativos
            const alertasAtivos = alertasData.filter(alerta => alerta.ativo !== false);
            console.log('Alertas ativos:', alertasAtivos.length);

            // Buscar próximo medicamento e estatísticas
            const medicationStats = await getMedicationStats(alertasAtivos);
            console.log('Estatísticas dos medicamentos:', medicationStats);
            
            setStats(prev => ({
              ...prev, 
              ...medicationStats,
              totalAlarms: alertasAtivos.length,
            }));

          } catch (error) {
            console.error('Erro ao processar alertas:', error);
            setStats(prev => ({
              ...prev, 
              nextMedication: null,
              nextMedicationTomorrow: null,
              hasAlarmsOtherDays: false,
              totalAlarms: 0,
            }));
          }
        },
        error => {
          console.error('Erro ao buscar alertas:', error);
          setStats(prev => ({
            ...prev, 
            nextMedication: null,
            nextMedicationTomorrow: null,
            hasAlarmsOtherDays: false,
            totalAlarms: 0,
          }));
        },
      );

    return () => {
      unsubscribe();
      unsubscribeDependentes();
      unsubscribeAlertas();
    };
  }, [user]);

  // Recalcular próximo medicamento quando o tempo muda
  useEffect(() => {
    if (stats.totalAlarms > 0) {
      // Reprocessar alertas quando o tempo muda
      const reprocessAlerts = async () => {
        try {
          const alertasSnapshot = await firestore()
            .collection('alertas')
            .where('usuarioId', '==', user?.uid)
            .get();

          if (alertasSnapshot && alertasSnapshot.docs) {
            const alertasData = alertasSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }));

            const alertasAtivos = alertasData.filter(alerta => alerta.ativo !== false);
            const medicationStats = await getMedicationStats(alertasAtivos);
            
            setStats(prev => ({
              ...prev, 
              ...medicationStats,
            }));
          }
        } catch (error) {
          console.error('Erro ao reprocessar alertas:', error);
        }
      };

      reprocessAlerts();
    }
  }, [currentTime, user?.uid]);

  const getMedicationStats = async (alertasData) => {
    console.log('Processando alertas:', alertasData);
    
    if (!alertasData || alertasData.length === 0) {
      console.log('Nenhum alerta para processar');
      return {
        nextMedication: null,
        nextMedicationTomorrow: null,
        hasAlarmsOtherDays: false,
      };
    }

    const now = new Date();
    console.log('Hora atual:', now.toLocaleTimeString('pt-BR'));
    
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const tomorrow = (currentDay + 1) % 7;
    
    // Mapear dias da semana (ajustando para diferentes formatos)
    const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const diasSemanaShort = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const currentDayName = diasSemana[currentDay];
    const currentDayNameShort = diasSemanaShort[currentDay];
    const tomorrowDayName = diasSemana[tomorrow];
    const tomorrowDayNameShort = diasSemanaShort[tomorrow];
    
    console.log('Dia atual:', currentDayName, currentDayNameShort);
    console.log('Amanhã:', tomorrowDayName, tomorrowDayNameShort);

    let nextMedicationsToday = [];
    let nextMedicationsTomorrow = [];
    let hasAlarmsOtherDays = false;

    for (let alerta of alertasData) {
      try {
        console.log('Processando alerta:', alerta.id, alerta.horario);
        
        // Buscar nome do remédio
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

        // Verificar em quais dias este alerta está configurado
        let isToday = false;
        let isTomorrow = false;
        let hasOtherDays = false;
        
        if (alerta.dias) {
          let diasArray = [];
          
          if (Array.isArray(alerta.dias)) {
            diasArray = alerta.dias.map(d => d.toLowerCase().trim());
          } else if (typeof alerta.dias === 'string') {
            diasArray = alerta.dias.toLowerCase().split(',').map(d => d.trim());
          }

          isToday = diasArray.includes(currentDayName) || diasArray.includes(currentDayNameShort);
          isTomorrow = diasArray.includes(tomorrowDayName) || diasArray.includes(tomorrowDayNameShort);
          
          // Verificar se tem alarmes em outros dias além de hoje e amanhã
          const otherDays = diasArray.filter(day => 
            !day.includes(currentDayName.toLowerCase()) && 
            !day.includes(currentDayNameShort.toLowerCase()) &&
            !day.includes(tomorrowDayName.toLowerCase()) && 
            !day.includes(tomorrowDayNameShort.toLowerCase())
          );
          hasOtherDays = otherDays.length > 0;
          
          if (hasOtherDays) {
            hasAlarmsOtherDays = true;
          }
        } else {
          // Se não especificou dias, assume que é todo dia
          isToday = true;
          isTomorrow = true;
        }
        
        console.log('Alerta é para hoje?', isToday, 'Amanhã?', isTomorrow, 'Outros dias?', hasOtherDays);

        if (alerta.horario) {
          try {
            const [hours, minutes] = alerta.horario.split(':').map(Number);
            
            // Para hoje
            if (isToday) {
              const alertTime = new Date();
              alertTime.setHours(hours, minutes, 0, 0);

              console.log('Horário do alerta hoje:', alertTime.toLocaleTimeString('pt-BR'));
              console.log('Já passou?', alertTime <= now);

              // Se o horário ainda não passou hoje
              if (alertTime > now) {
                const timeDiff = alertTime - now;
                const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
                const minutesRemaining = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

                let timeRemaining;
                if (hoursRemaining > 0) {
                  timeRemaining = `em ${hoursRemaining}h ${minutesRemaining}min`;
                } else {
                  timeRemaining = `em ${minutesRemaining}min`;
                }

                nextMedicationsToday.push({
                  ...alerta,
                  nomeRemedio,
                  timeRemaining,
                  alertTime,
                  isToday: true,
                });
                
                console.log('Adicionado à lista de hoje:', nomeRemedio, timeRemaining);
              }
            }

            // Para amanhã
            if (isTomorrow) {
              const alertTimeTomorrow = new Date();
              alertTimeTomorrow.setDate(alertTimeTomorrow.getDate() + 1);
              alertTimeTomorrow.setHours(hours, minutes, 0, 0);

              const timeDiffTomorrow = alertTimeTomorrow - now;
              const hoursRemaining = Math.floor(timeDiffTomorrow / (1000 * 60 * 60));
              const minutesRemaining = Math.floor((timeDiffTomorrow % (1000 * 60 * 60)) / (1000 * 60));

              let timeRemaining;
              if (hoursRemaining > 0) {
                timeRemaining = `em ${hoursRemaining}h ${minutesRemaining}min`;
              } else {
                timeRemaining = `amanhã`;
              }

              nextMedicationsTomorrow.push({
                ...alerta,
                nomeRemedio,
                timeRemaining,
                alertTime: alertTimeTomorrow,
                isTomorrow: true,
              });
              
              console.log('Adicionado à lista de amanhã:', nomeRemedio, timeRemaining);
            }
          } catch (error) {
            console.error('Erro ao processar horário:', error);
          }
        }
      } catch (error) {
        console.error('Erro ao processar alerta:', error);
      }
    }

    console.log('Próximos medicamentos hoje:', nextMedicationsToday.length);
    console.log('Próximos medicamentos amanhã:', nextMedicationsTomorrow.length);

    // Ordenar por horário mais próximo
    nextMedicationsToday.sort((a, b) => a.alertTime - b.alertTime);
    nextMedicationsTomorrow.sort((a, b) => a.alertTime - b.alertTime);

    const nextMedication = nextMedicationsToday.length > 0 ? nextMedicationsToday[0] : null;
    const nextMedicationTomorrow = nextMedicationsTomorrow.length > 0 ? nextMedicationsTomorrow[0] : null;
    
    console.log('Próximo medicamento hoje selecionado:', nextMedication?.nomeRemedio, nextMedication?.timeRemaining);
    console.log('Próximo medicamento amanhã selecionado:', nextMedicationTomorrow?.nomeRemedio, nextMedicationTomorrow?.timeRemaining);
    
    return {
      nextMedication,
      nextMedicationTomorrow,
      hasAlarmsOtherDays,
    };
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
                    <Icon name="person" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {user?.displayName || 'Usuário'}
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
                    navigation.navigate('Ajuda');
                  }}>
                  <Icon name="help-circle-outline" size={20} color="#e2e8f0" />
                  <Text style={styles.menuItemText}>Ajuda</Text>
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

  const renderQuickActions = () => {
    const actions = [
      {
        icon: 'alarm',
        text: 'Alarmes',
        route: 'AlertasMenu',
        component: Icon,
        color: '#4d96db',
        description: 'Configure seus lembretes'
      },
      {
        icon: 'medication',
        text: 'Remédios',
        route: 'RemediosMenu',
        component: MaterialIcons,
        color: '#E53E3E',
        description: 'Gerencie medicamentos'
      },
      {
        icon: 'user-friends',
        text: 'Dependentes',
        route: 'DependentesMenu',
        component: FontAwesome5,
        color: '#10B981',
        description: 'Cuide de quem ama'
      },
      {
        icon: 'bar-chart',
        text: 'Histórico',
        route: 'HistoricoMenu',
        component: Icon,
        color: '#F59E0B',
        description: 'Acompanhe o progresso'
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
        <View style={styles.actionsGrid}>
          {actions.map((action, index) => (
            <Animated.View
              key={index}
              style={[
                {
                  opacity: fadeAnim,
                  transform: [{
                    translateY: slideUpAnim.interpolate({
                      inputRange: [0, 30],
                      outputRange: [0, 30 + (index * 10)],
                    })
                  }],
                }
              ]}>
              <TouchableOpacity
                style={[
                  styles.modernActionCard,
                  {
                    backgroundColor: action.color + '15',
                    borderColor: action.color + '25',
                    borderLeftColor: action.color,
                  },
                ]}
                onPress={() => navigation.navigate(action.route)}>
                <View style={styles.modernActionContent}>
                  <View style={[styles.modernActionIcon, {backgroundColor: action.color}]}>
                    <action.component
                      name={action.icon}
                      size={action.component === FontAwesome5 ? 18 : 20}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.modernActionText}>
                    <Text style={styles.modernActionTitle}>{action.text}</Text>
                    <Text style={styles.modernActionDescription}>{action.description}</Text>
                  </View>
                  <View style={styles.modernActionArrow}>
                    <Icon name="chevron-forward" size={20} color="#94a3b8" />
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    );
  };

  const renderNextMedication = () => {
    // Determinar qual card mostrar baseado na situação dos alarmes
    let cardType = 'no-alarms'; // padrão: sem alarmes
    let cardData = null;

    if (stats.totalAlarms > 0) {
      if (stats.nextMedication) {
        cardType = 'next-today';
        cardData = stats.nextMedication;
      } else if (stats.hasAlarmsOtherDays) {
        cardType = 'other-days';
      } else {
        cardType = 'no-active-today';
      }
    }

    return (
      <Animated.View
        style={[
          styles.nextMedSection,
          {
            opacity: fadeAnim,
            transform: [{translateY: statsSlideAnim}],
          },
        ]}>
        <View style={styles.nextMedHeader}>
          <Text style={styles.nextMedTitle}>Próximo Medicamento</Text>
          <Text style={styles.nextMedSubtitle}>
            {cardType === 'no-alarms' ? 'Configure seus lembretes' :
             cardType === 'next-today' ? 'Não esqueça do seu tratamento' :
             cardType === 'other-days' ? 'Pode descansar' :
             'Nenhum alarme para hoje'}
          </Text>
        </View>
        
        {cardType === 'next-today' && (
          <View style={[styles.nextMedCard, styles.nextMedCardToday]}>
            <View style={[styles.nextMedIconContainer, styles.nextMedIconToday]}>
              <Icon name="alarm" size={20} color="#4D97DB" />
            </View>
            
            <View style={styles.nextMedContent}>
              <Text style={styles.nextMedTime}>{cardData.horario}</Text>
              <Text style={styles.nextMedName}>{cardData.nomeRemedio}</Text>
              <Text style={styles.nextMedDosage}>Dosagem: {cardData.dosagem}</Text>
              <Text style={[styles.nextMedRemaining, styles.nextMedRemainingToday]}>
                {cardData.timeRemaining}
              </Text>
            </View>
          </View>
        )}

        {cardType === 'other-days' && (
          <View style={[styles.nextMedCard, styles.nextMedCardOtherDays]}>
            <View style={[styles.nextMedIconContainer, styles.nextMedIconOtherDays]}>
              <Icon name="moon" size={20} color="#8B5CF6" />
            </View>
            
            <View style={styles.nextMedContent}>
              <Text style={styles.nextMedName}>Tudo em dia por hoje</Text>
              <Text style={styles.nextMedDosage}>
                Descanse, você cumpriu seu tratamento hoje
              </Text>
              <Text style={[styles.nextMedRemaining, styles.nextMedRemainingOtherDays]}>
                {stats.totalAlarms} alarme{stats.totalAlarms > 1 ? 's' : ''} em outros dias
              </Text>
              <TouchableOpacity
                style={[styles.configureButton, styles.configureButtonOtherDays]}
                onPress={() => navigation.navigate('AlertasMenu')}>
                <Text style={[styles.configureButtonText, styles.configureButtonTextOtherDays]}>Ver Alarmes</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {cardType === 'no-alarms' && (
          <View style={[styles.nextMedCard, styles.nextMedCardEmpty]}>
            <View style={[styles.nextMedIconContainer, styles.nextMedIconEmpty]}>
              <Icon name="alarm" size={20} color="#4D97DB" />
            </View>
            
            <View style={styles.nextMedContent}>
              <Text style={styles.nextMedTime}>--:--</Text>
              <Text style={styles.nextMedName}>Nenhum alerta configurado</Text>
              <Text style={styles.nextMedDosage}>Configure seus medicamentos</Text>
              <TouchableOpacity
                style={styles.configureButton}
                onPress={() => navigation.navigate('AlertasMenu')}>
                <Text style={styles.configureButtonText}>Configurar Alertas</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#121A29" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4D97DB" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />
      
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

      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          },
        ]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.hamburgerButton} onPress={toggleMenu}>
            <Icon name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>PillCheck</Text>
            <Text style={styles.subtitle}>Sua saúde em primeiro lugar</Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        
        {renderNextMedication()}
        {renderQuickActions()}
        
      </ScrollView>

      {renderHamburgerMenu()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121A29',
  },
  backgroundCircle: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    borderRadius: width,
    backgroundColor: '#4D97DB',
    top: -width * 0.8,
    left: -width * 0.5,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: '#E53E3E',
    bottom: -width * 0.6,
    right: -width * 0.4,
  },
  header: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingBottom: 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTop: {
    paddingTop: Platform.OS === 'ios' ? 15 : 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    paddingLeft: 16,
  },
  title: {
    fontSize: isMediumScreen ? 28 : 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  subtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  hamburgerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    width: isMediumScreen ? 38 : 44,
    height: isMediumScreen ? 38 : 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 30,
    paddingBottom: 30,
  },
  welcomeSection: {
    marginBottom: 25,
  },
  welcomeContent: {
    paddingHorizontal: 4,
  },
  welcomeTitle: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.3,
    lineHeight: isSmallScreen ? 30 : 34,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  welcomeSubtitle: {
    fontSize: isSmallScreen ? 16 : 17,
    color: '#94a3b8',
    lineHeight: isSmallScreen ? 22 : 24,
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  nextMedSection: {
    marginBottom: 25,
  },
  nextMedHeader: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  nextMedTitle: {
    fontSize: isSmallScreen ? 20 : 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  nextMedSubtitle: {
    fontSize: isSmallScreen ? 14 : 15,
    color: '#94a3b8',
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  nextMedCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#4D97DB',
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.25)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  nextMedIconContainer: {
    width: isSmallScreen ? 44 : 48,
    height: isSmallScreen ? 44 : 48,
    borderRadius: isSmallScreen ? 22 : 24,
    backgroundColor: 'rgba(77, 151, 219, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.3)',
  },
  nextMedContent: {
    flex: 1,
  },
  nextMedTime: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: '300',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -1,
    marginBottom: 4,
  },
  nextMedName: {
    fontSize: isSmallScreen ? 16 : 17,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 3,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  nextMedDosage: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#94a3b8',
    marginBottom: 6,
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  nextMedRemaining: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#10B981',
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  configureButton: {
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.25)',
  },
  configureButtonText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#4D97DB',
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  actionsSection: {
    marginBottom: 25,
  },
  actionsGrid: {
    gap: 14,
  },
  modernActionCard: {
    borderRadius: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  modernActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  modernActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modernActionText: {
    flex: 1,
  },
  modernActionTitle: {
    fontSize: isSmallScreen ? 16 : 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modernActionDescription: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#94a3b8',
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modernActionArrow: {
    marginLeft: 12,
    opacity: 0.6,
  },
  activitySection: {
    marginBottom: 20,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  activityTitle: {
    fontSize: isSmallScreen ? 20 : 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  viewAllText: {
    fontSize: 14,
    color: '#4d96db',
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activityContent: {
    flex: 1,
  },
  activityItemTitle: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  activityItemTime: {
    fontSize: 12,
    color: '#94a3b8',
    letterSpacing: 0.1,
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
    shadowOffset: {
      width: 2,
      height: 0,
    },
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
    backgroundColor: '#E53E3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#E53E3E',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
});

export default Index;