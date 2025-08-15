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
  const [avisos, setAvisos] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [stats, setStats] = useState({
    medicamentosAtivos: 0,
    alertasHoje: 0,
    dependentes: 0,
  });

  const user = auth().currentUser;
  const slideAnim = useRef(new Animated.Value(-250)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

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
  }, [backgroundAnim, fadeAnim, slideUpAnim]);

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

    return () => {
      unsubscribe();
      unsubscribeDependentes();
    };
  }, [user]);

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

  const renderAvisoItem = aviso => (
    <TouchableOpacity key={aviso.id} style={styles.avisoCard}>
      <View style={styles.avisoHeader}>
        <View
          style={[
            styles.avisoIconContainer,
            {backgroundColor: getPrioridadeCor(aviso.prioridade) + '20'},
          ]}>
          <Icon
            name={getTipoIcon(aviso.tipo)}
            size={20}
            color={getPrioridadeCor(aviso.prioridade)}
          />
        </View>
        <View style={styles.avisoContent}>
          <Text style={styles.avisoTitulo}>{aviso.titulo}</Text>
          <Text style={styles.avisoDescricao}>{aviso.descricao}</Text>
          <View style={styles.avisoFooter}>
            <Text style={styles.avisoData}>{aviso.data}</Text>
            <View
              style={[
                styles.prioridadeBadge,
                {backgroundColor: getPrioridadeCor(aviso.prioridade)},
              ]}>
              <Text style={styles.prioridadeText}>
                {aviso.prioridade.charAt(0).toUpperCase() +
                  aviso.prioridade.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIconContainer}>
        <Icon
          name="notifications-off"
          size={isSmallScreen ? 40 : 48}
          color="#64748b"
        />
      </View>
      <Text style={styles.emptyStateTitle}>Nenhum aviso encontrado</Text>
      <Text style={styles.emptyStateDescription}>
        Você não possui avisos ou notificações no momento.
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4D97DB" />
      <Text style={styles.loadingText}>Carregando avisos...</Text>
    </View>
  );

  const getQuickActionColumns = () => {
    if (isSmallScreen) return 2;
    return 4;
  };

  const renderQuickActions = () => {
    const columns = getQuickActionColumns();
    const actions = [
      {
        icon: 'alarm',
        text: 'Alarmes',
        route: 'AlertasMenu',
        component: Icon,
        color: '#4d96db',
      },
      {
        icon: 'medication',
        text: 'Remédios',
        route: 'RemediosMenu',
        component: MaterialIcons,
        color: '#E53E3E',
      },
      {
        icon: 'user-friends',
        text: 'Dependentes',
        route: 'DependentesMenu',
        component: FontAwesome5,
        color: '#10B981',
      },
      {
        icon: 'bar-chart',
        text: 'Histórico',
        route: 'HistoricoMenu',
        component: Icon,
        color: '#F59E0B',
      },
    ];

    if (columns === 2) {
      return (
        <View style={styles.quickActionsGrid}>
          <View style={styles.quickActionsRow}>
            {actions.slice(0, 2).map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.quickActionButton,
                  styles.quickActionButtonGrid,
                  {
                    backgroundColor: action.color + '15',
                    borderColor: action.color + '25',
                  },
                ]}
                onPress={() => navigation.navigate(action.route)}>
                <View
                  style={[
                    styles.quickActionIcon,
                    {backgroundColor: action.color},
                  ]}>
                  <action.component
                    name={action.icon}
                    size={action.component === FontAwesome5 ? 16 : 18}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.quickActionText}>{action.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.quickActionsRow}>
            {actions.slice(2, 4).map((action, index) => (
              <TouchableOpacity
                key={index + 2}
                style={[
                  styles.quickActionButton,
                  styles.quickActionButtonGrid,
                  {
                    backgroundColor: action.color + '15',
                    borderColor: action.color + '25',
                  },
                ]}
                onPress={() => navigation.navigate(action.route)}>
                <View
                  style={[
                    styles.quickActionIcon,
                    {backgroundColor: action.color},
                  ]}>
                  <action.component
                    name={action.icon}
                    size={action.component === FontAwesome5 ? 16 : 18}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.quickActionText}>{action.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.quickActionsContainer}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.quickActionButton,
              {
                backgroundColor: action.color + '15',
                borderColor: action.color + '25',
              },
            ]}
            onPress={() => navigation.navigate(action.route)}>
            <View
              style={[styles.quickActionIcon, {backgroundColor: action.color}]}>
              <action.component
                name={action.icon}
                size={action.component === FontAwesome5 ? 16 : 18}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.quickActionText}>{action.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

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
            <Text style={styles.title}> PillCheck</Text>
          </View>
        </View>

        {renderQuickActions()}
      </Animated.View>

      <Animated.View
        style={[
          styles.avisosSection,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          },
        ]}>
        <View style={styles.avisosSectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Icon name="notifications" size={18} color="#e2e8f0" />
            <Text style={styles.avisosSectionTitle}>Avisos e Notificações</Text>
          </View>
          <TouchableOpacity style={styles.verTodosButton}>
            <Text style={styles.verTodosText}>Ver todos</Text>
            <Icon name="chevron-forward" size={12} color="#e2e8f0" />
          </TouchableOpacity>
        </View>

        {loading ? (
          renderLoadingState()
        ) : (
          <ScrollView
            style={styles.avisosScrollView}
            showsVerticalScrollIndicator={false}>
            {avisos.length > 0
              ? avisos.map(renderAvisoItem)
              : renderEmptyState()}
          </ScrollView>
        )}
      </Animated.View>

      {renderHamburgerMenu()}
    </SafeAreaView>
  );
};

const getPrioridadeCor = prioridade => {
  switch (prioridade) {
    case 'alta':
      return '#E53E3E';
    case 'media':
      return '#F59E0B';
    case 'baixa':
      return '#10B981';
    default:
      return '#4D97DB';
  }
};

const getTipoIcon = tipo => {
  switch (tipo) {
    case 'medicamento':
      return 'medical';
    case 'alarme':
      return 'alarm';
    case 'consulta':
      return 'calendar';
    default:
      return 'information-circle';
  }
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
    marginTop: isSmallScreen ? -30 : isMediumScreen ? -20 : -5,
  },
  headerTop: {
    paddingTop: Platform.OS === 'ios' ? 15 : 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: isSmallScreen ? 16 : 20,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: isMediumScreen ? 24 : 28,
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
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: isSmallScreen ? 8 : 12,
  },
  quickActionsGrid: {
    gap: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 12 : 16,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionButtonGrid: {
    flex: 1,
    minWidth: (width - (isSmallScreen ? 32 : 48) - 12) / 2,
  },
  quickActionIcon: {
    width: isSmallScreen ? 32 : 40,
    height: isSmallScreen ? 32 : 40,
    borderRadius: isSmallScreen ? 16 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  quickActionText: {
    color: '#e2e8f0',
    fontSize: isSmallScreen ? 10 : isMediumScreen ? 10 : 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  avisosSection: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 25,
  },
  avisosSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avisosSectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  verTodosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.25)',
  },
  verTodosText: {
    fontSize: isMediumScreen ? 10 : 12,
    color: '#e2e8f0',
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  avisosScrollView: {
    flex: 1,
  },
  avisoCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#E53E3E',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  avisoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avisoIconContainer: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 36 : 40,
    borderRadius: isSmallScreen ? 18 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avisoContent: {
    flex: 1,
  },
  avisoTitulo: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  avisoDescricao: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#94a3b8',
    lineHeight: isSmallScreen ? 18 : 20,
    marginBottom: 12,
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  avisoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avisoData: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  prioridadeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  prioridadeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIconContainer: {
    width: isSmallScreen ? 64 : 80,
    height: isSmallScreen ? 64 : 80,
    borderRadius: isSmallScreen ? 32 : 40,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  emptyStateTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  emptyStateDescription: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    letterSpacing: 0.2,
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
  menuDivider: {
    height: 1,
    marginVertical: 8,
    marginHorizontal: 20,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
  },
  logoutMenuItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#E53E3E',
  },
});

export default Index;
