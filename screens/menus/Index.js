import React, { useEffect, useState, useRef } from 'react';
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
  Modal
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

const { width, height } = Dimensions.get('window');

// Breakpoints responsivos
const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

const Index = ({ navigation }) => {
  const [avisos, setAvisos] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [stats, setStats] = useState({
    medicamentosAtivos: 0,
    alertasHoje: 0,
    dependentes: 0
  });
  
  const user = auth().currentUser;
  const slideAnim = useRef(new Animated.Value(-250)).current;

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
            ...doc.data()
          }));
          setMedicamentos(lista);
          setStats(prev => ({ ...prev, medicamentosAtivos: lista.length }));
          setLoading(false);
        },
        error => {
          console.error('Erro ao buscar medicamentos:', error);
          Alert.alert('Erro', 'Não foi possível carregar os dados.');
          setLoading(false);
        }
      );

    const unsubscribeDependentes = firestore()
      .collection('dependentes')
      .where('usuarioId', '==', user.uid)
      .onSnapshot(snapshot => {
        setStats(prev => ({ ...prev, dependentes: snapshot?.docs?.length || 0 }));
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
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await auth().signOut();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível sair da conta.');
            }
          }
        }
      ]
    );
  };

  const renderHamburgerMenu = () => (
    <Modal
      visible={menuVisible}
      transparent={true}
      animationType="none"
      onRequestClose={closeMenu}
    >
      <TouchableWithoutFeedback onPress={closeMenu}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.sideMenu,
                {
                  transform: [{ translateX: slideAnim }]
                }
              ]}
            >
              <View style={styles.menuHeader}>
                <View style={styles.userInfoContainer}>
                  <View style={styles.avatarContainer}>
                    <Icon name="person" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {user?.displayName || 'Usuário'}
                    </Text>
                    <Text style={styles.userEmail}>
                      {user?.email}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.closeMenuButton} onPress={closeMenu}>
                  <Icon name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.menuItems}>
                <TouchableOpacity style={styles.menuItem} onPress={() => {
                  closeMenu();
                  navigation.navigate('Perfil');
                }}>
                  <Icon name="person-outline" size={20} color="#fafafaff" />
                  <Text style={styles.menuItemText}>Meu Perfil</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => {
                  closeMenu();
                  navigation.navigate('Configuracoes');
                }}>
                  <Icon name="settings-outline" size={20} color="#fafafaff" />
                  <Text style={styles.menuItemText}>Configurações</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => {
                  closeMenu();
                  navigation.navigate('Ajuda');
                }}>
                  <Icon name="help-circle-outline" size={20} color="#fafafaff" />
                  <Text style={styles.menuItemText}>Ajuda</Text>
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity style={[styles.menuItem, styles.logoutMenuItem]} onPress={handleLogout}>
                  <Icon name="log-out-outline" size={20} color="#E53E3E" />
                  <Text style={[styles.menuItemText, styles.logoutText]}>Sair da conta</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderAvisoItem = (aviso) => (
    <TouchableOpacity key={aviso.id} style={styles.avisoCard}>
      <View style={styles.avisoHeader}>
        <View style={[styles.avisoIconContainer, { backgroundColor: getPrioridadeCor(aviso.prioridade) + '20' }]}>
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
            <View style={[styles.prioridadeBadge, { backgroundColor: getPrioridadeCor(aviso.prioridade) }]}>
              <Text style={styles.prioridadeText}>
                {aviso.prioridade.charAt(0).toUpperCase() + aviso.prioridade.slice(1)}
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
        <Icon name="notifications-off" size={isSmallScreen ? 40 : 48} color="#8A8A8A" />
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
    if (isMediumScreen) return 2;
    return 4;
  };

  const renderQuickActions = () => {
    const columns = getQuickActionColumns();
    const actions = [
      {
        icon: 'alarm',
        text: 'Alarmes',
        route: 'AlertasMenu',
        component: Icon
      },
      {
        icon: 'medication',
        text: 'Remédios',
        route: 'RemediosMenu',
        component: MaterialIcons
      },
      {
        icon: 'user-friends',
        text: 'Dependentes',
        route: 'DependentesMenu',
        component: FontAwesome5
      },
      {
        icon: 'bar-chart',
        text: 'Histórico',
        route: 'HistoricoMenu',
        component: Icon
      }
    ];

    if (columns === 2) {
      return (
        <View style={styles.quickActionsGrid}>
          <View style={styles.quickActionsRow}>
            {actions.slice(0, 2).map((action, index) => (
              <TouchableOpacity 
                key={index}
                style={[styles.quickActionButton, styles.quickActionButtonGrid]}
                onPress={() => navigation.navigate(action.route)}
              >
                <View style={styles.quickActionIcon}>
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
                style={[styles.quickActionButton, styles.quickActionButtonGrid]}
                onPress={() => navigation.navigate(action.route)}
              >
                <View style={styles.quickActionIcon}>
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
            style={styles.quickActionButton}
            onPress={() => navigation.navigate(action.route)}
          >
            <View style={styles.quickActionIcon}>
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>PillCheck</Text>
            <Text style={styles.subtitle}>
              Olá, {user?.displayName || user?.email?.split('@')[0] || 'Usuário'}
            </Text>
          </View>
          <TouchableOpacity style={styles.hamburgerButton} onPress={toggleMenu}>
            <Icon name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {renderQuickActions()}
      </View>

      <View style={styles.avisosSection}>
        <View style={styles.avisosSectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Icon name="notifications" size={18} color="#ffffffb6" />
            <Text style={styles.avisosSectionTitle}>Avisos e Notificações</Text>
          </View>
          <TouchableOpacity style={styles.verTodosButton}>
            <Text style={styles.verTodosText}>Ver todos</Text>
            <Icon name="chevron-forward" size={12} color="#ffffffff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          renderLoadingState()
        ) : (
          <ScrollView 
            style={styles.avisosScrollView}
            showsVerticalScrollIndicator={false}
          >
            {avisos.length > 0 ? avisos.map(renderAvisoItem) : renderEmptyState()}
          </ScrollView>
        )}
      </View>

      {renderHamburgerMenu()}
    </View>
  );
};


const getPrioridadeCor = (prioridade) => {
  switch (prioridade) {
    case 'alta': return '#E53E3E';
    case 'media': return '#F59E0B';
    case 'baixa': return '#10B981';
    default: return '#4D97DB';
  }
};

const getTipoIcon = (tipo) => {
  switch (tipo) {
    case 'medicamento': return 'medical';
    case 'alarme': return 'alarm';
    case 'consulta': return 'calendar';
    default: return 'information-circle';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2b3241ff',
  },
  header: {
    backgroundColor: '#121A29',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#8A8A8A',
  },
  hamburgerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: '#d03d6298',
    paddingVertical: isSmallScreen ? 12 : 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ce224d98',
    minHeight: 80,
  },
  quickActionButtonGrid: {
    flex: 1,
    minWidth: (width - (isSmallScreen ? 32 : 48) - 12) / 2,
  },
  quickActionIcon: {
    width: isSmallScreen ? 32 : 40,
    height: isSmallScreen ? 32 : 40,
    borderRadius: isSmallScreen ? 16 : 20,
    backgroundColor: 'rgba(228, 161, 161, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 10 : 12,
    fontWeight: '600',
    textAlign: 'center',
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
    color: '#ffffffb6',
  },
  verTodosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4d96dbb6',
    borderRadius: 16,
    gap: 4,
  },
  verTodosText: {
    fontSize: 12,
    color: '#ffffffff',
    fontWeight: '600',
  },
  avisosScrollView: {
    flex: 1,
  },
  avisoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4D97DB',
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
    color: '#121A29',
    marginBottom: 4,
  },
  avisoDescricao: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#6B7280',
    lineHeight: isSmallScreen ? 18 : 20,
    marginBottom: 12,
  },
  avisoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avisoData: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  prioridadeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  prioridadeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
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
    color: '#b3b3b3ff',
    fontWeight: '500',
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
    backgroundColor: '#F1F3F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#3290e9b6',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#a2a6adff',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sideMenu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: '#2b3241ff',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuHeader: {
    backgroundColor: '#121A29',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    backgroundColor: '2b3241ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#8A8A8A',
  },
  closeMenuButton: {
    padding: 4,
  },
  menuItems: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2941ff',
  },
  menuItemText: {
    fontSize: 16,
    color: '#fafafaff',
    marginLeft: 16,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    marginVertical: 8,
    marginHorizontal: 20,
  },
  logoutMenuItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#E53E3E',
  },
});

export default Index;