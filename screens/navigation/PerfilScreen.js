import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
  Animated,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Obtém as dimensões da tela do dispositivo
const {width, height} = Dimensions.get('window');

// Define breakpoints para responsividade baseado na largura da tela
const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;

/**
 * Componente de tela de Perfil do aplicativo PillCheck com Firebase
 */
const PerfilScreen = ({navigation}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados para dados do usuário
  const [userData, setUserData] = useState({
    nome: '',
    email: '',
    telefone: '',
    dataNascimento: '',
    tipoSanguineo: '',
    alergias: '',
    condicoesEspeciais: '',
    createdAt: null,
  });

  // Estados para estatísticas
  const [statistics, setStatistics] = useState({
    diasConsecutivos: 0,
    taxaAdesao: 0,
    totalMedicamentos: 0,
    alarmesAtivos: 0,
  });

  // Referências para animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const avatarScaleAnim = useRef(new Animated.Value(0.8)).current;

  // Usuário atual do Firebase Auth
  const currentUser = auth().currentUser;

  /**
   * Carrega dados do usuário do Firestore
   */
  const loadUserData = async () => {
    try {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      if (userDoc.exists) {
        const data = userDoc.data();
        setUserData({
          nome: data.nome || currentUser.displayName || '',
          email: data.email || currentUser.email || '',
          telefone: data.telefone || '',
          dataNascimento: data.dataNascimento || '',
          tipoSanguineo: data.tipoSanguineo || '',
          alergias: data.alergias || '',
          condicoesEspeciais: data.condicoesEspeciais || '',
          createdAt: data.createdAt,
        });
      } else {
        // Cria documento inicial do usuário
        const initialData = {
          nome: currentUser.displayName || '',
          email: currentUser.email || '',
          telefone: '',
          dataNascimento: '',
          tipoSanguineo: '',
          alergias: '',
          condicoesEspeciais: '',
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        };

        await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .set(initialData);

        setUserData({
          ...initialData,
          createdAt: new Date(),
        });
      }

      // Carrega estatísticas
      await loadStatistics();
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do perfil.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Carrega estatísticas do usuário
   */
  const loadStatistics = async () => {
    try {
      if (!currentUser) return;

      // Carrega medicamentos do usuário
      const medicamentosSnapshot = await firestore()
        .collection('medicamentos')
        .where('userId', '==', currentUser.uid)
        .get();

      const totalMedicamentos = medicamentosSnapshot.size;

      // Carrega alarmes ativos
      const alarmesSnapshot = await firestore()
        .collection('alarmes')
        .where('userId', '==', currentUser.uid)
        .where('ativo', '==', true)
        .get();

      const alarmesAtivos = alarmesSnapshot.size;

      // Carrega histórico de tomadas para calcular dias consecutivos e taxa de adesão
      const historicoSnapshot = await firestore()
        .collection('historico_tomadas')
        .where('userId', '==', currentUser.uid)
        .orderBy('data', 'desc')
        .limit(30)
        .get();

      let diasConsecutivos = 0;
      let tomadasRealizadas = 0;
      let totalTomadas = 0;

      if (!historicoSnapshot.empty) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // Calcula dias consecutivos
        historicoSnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          if (data.data && data.data.toDate) {
            const dataTomada = data.data.toDate();
            dataTomada.setHours(0, 0, 0, 0);

            const diferencaDias = (hoje - dataTomada) / (1000 * 60 * 60 * 24);

            if (diferencaDias === index && data.realizada) {
              diasConsecutivos++;
            }
          }
        });

        // Calcula taxa de adesão
        historicoSnapshot.docs.forEach(doc => {
          const data = doc.data();
          totalTomadas++;
          if (data.realizada) {
            tomadasRealizadas++;
          }
        });
      }

      const taxaAdesao =
        totalTomadas > 0
          ? Math.round((tomadasRealizadas / totalTomadas) * 100)
          : 0;

      setStatistics({
        diasConsecutivos,
        taxaAdesao,
        totalMedicamentos,
        alarmesAtivos,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      // Define valores padrão em caso de erro
      setStatistics({
        diasConsecutivos: 0,
        taxaAdesao: 0,
        totalMedicamentos: 0,
        alarmesAtivos: 0,
      });
    }
  };

  /**
   * Salva os dados do perfil no Firestore
   */
  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      if (!currentUser) {
        Alert.alert('Erro', 'Usuário não autenticado.');
        return;
      }

      // Valida campos obrigatórios
      if (!userData.nome.trim()) {
        Alert.alert('Erro', 'O nome é obrigatório.');
        return;
      }

      // Atualiza documento no Firestore
      await firestore().collection('users').doc(currentUser.uid).update({
        nome: userData.nome.trim(),
        telefone: userData.telefone.trim(),
        dataNascimento: userData.dataNascimento.trim(),
        tipoSanguineo: userData.tipoSanguineo.trim(),
        alergias: userData.alergias.trim(),
        condicoesEspeciais: userData.condicoesEspeciais.trim(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Atualiza perfil do Firebase Auth se necessário
      if (userData.nome !== currentUser.displayName) {
        await currentUser.updateProfile({
          displayName: userData.nome,
        });
      }

      setIsEditing(false);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Logout do usuário
   */
  const handleLogout = () => {
    Alert.alert('Sair da Conta', 'Tem certeza que deseja sair?', [
      {text: 'Cancelar', style: 'cancel'},
      {
        text: 'Sair',
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

  // Inicialização das animações e carregamento de dados
  useEffect(() => {
    loadUserData();

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
      Animated.spring(avatarScaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Animação de fundo contínua
    const backgroundAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundAnim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundAnim, {
          toValue: 0,
          duration: 10000,
          useNativeDriver: true,
        }),
      ]),
    );
    backgroundAnimation.start();

    return () => backgroundAnimation.stop();
  }, []);

  // Dados das estatísticas atualizados
  const statisticsData = [
    {
      id: 1,
      title: 'Dias Consecutivos',
      value: statistics.diasConsecutivos.toString(),
      icon: 'flame',
      color: '#F59E0B',
      component: Icon,
    },
    {
      id: 2,
      title: 'Taxa de Adesão',
      value: `${statistics.taxaAdesao}%`,
      icon: 'trending-up',
      color: '#10B981',
      component: Icon,
    },
    {
      id: 3,
      title: 'Medicamentos',
      value: statistics.totalMedicamentos.toString(),
      icon: 'medical',
      color: '#4D97DB',
      component: Icon,
    },
    {
      id: 4,
      title: 'Alarmes Ativos',
      value: statistics.alarmesAtivos.toString(),
      icon: 'alarm',
      color: '#8B5CF6',
      component: Icon,
    },
  ];

  // Opções do menu atualizadas com funcionalidades
  const menuOptions = [
    {
      id: 1,
      title: 'Dependentes',
      description: 'Gerencie perfis de familiares',
      icon: 'people',
      color: '#4D97DB',
      action: () => navigation.navigate('Dependentes'),
    },
    {
      id: 2,
      title: 'Histórico Médico',
      description: 'Registros e consultas anteriores',
      icon: 'document-text',
      color: '#10B981',
      action: () => navigation.navigate('Historico'),
    },
    {
      id: 5,
      title: 'Configurações',
      description: 'Personalize o aplicativo',
      icon: 'settings',
      color: '#8B5CF6',
      action: () => navigation.navigate('Configuracoes'),
    },
    {
      id: 6,
      title: 'Sair da Conta',
      description: 'Fazer logout do aplicativo',
      icon: 'log-out',
      color: '#64748b',
      action: handleLogout,
    },
  ];

  /**
   * Renderiza o cabeçalho da tela
   */
  const renderHeader = () => (
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
        <Icon name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <Text style={styles.headerSubtitle}>Gerencie suas informações</Text>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => setIsEditing(!isEditing)}
        disabled={saving}>
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Icon
            name={isEditing ? 'checkmark' : 'pencil'}
            size={20}
            color="#FFFFFF"
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  /**
   * Renderiza informações do perfil
   */
  const renderProfileInfo = () => (
    <Animated.View
      style={[
        styles.profileSection,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideUpAnim}, {scale: avatarScaleAnim}],
        },
      ]}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {userData.nome ? userData.nome.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
      </View>

      <View style={styles.profileInfo}>
        {isEditing ? (
          <TextInput
            style={styles.nameInput}
            value={userData.nome}
            onChangeText={text => setUserData({...userData, nome: text})}
            placeholder="Digite seu nome"
            placeholderTextColor="#64748b"
          />
        ) : (
          <Text style={styles.profileName}>{userData.nome || 'Usuário'}</Text>
        )}
        <Text style={styles.profileEmail}>{userData.email}</Text>
        <View style={styles.membershipBadge}>
          <Icon name="shield-checkmark" size={14} color="#10B981" />
          <Text style={styles.membershipText}>
            Membro desde{' '}
            {userData.createdAt
              ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString(
                  'pt-BR',
                  {month: 'short', year: 'numeric'},
                )
              : 'agora'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  /**
   * Renderiza estatísticas
   */
  const renderStatistics = () => (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideUpAnim}],
        },
      ]}>
      <Text style={styles.sectionTitle}>Estatísticas</Text>
      <View style={styles.statisticsGrid}>
        {statisticsData.map(stat => (
          <View
            key={stat.id}
            style={[
              styles.statisticCard,
              {backgroundColor: stat.color + '15'},
            ]}>
            <View style={[styles.statisticIcon, {backgroundColor: stat.color}]}>
              <stat.component name={stat.icon} size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.statisticValue}>{stat.value}</Text>
            <Text style={styles.statisticTitle}>{stat.title}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  /**
   * Renderiza informações médicas
   */
  const renderMedicalInfo = () => (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideUpAnim}],
        },
      ]}>
      <Text style={styles.sectionTitle}>Informações Médicas</Text>
      <View style={styles.medicalInfoCard}>
        {/* Data de Nascimento */}
        <View style={styles.medicalInfoRow}>
          <Icon name="calendar" size={20} color="#8B5CF6" />
          <Text style={styles.medicalInfoLabel}>Nascimento:</Text>
          {isEditing ? (
            <TextInput
              style={styles.medicalInfoInput}
              value={userData.dataNascimento}
              onChangeText={text =>
                setUserData({...userData, dataNascimento: text})
              }
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#64748b"
            />
          ) : (
            <Text style={styles.medicalInfoValue}>
              {userData.dataNascimento || 'Não informado'}
            </Text>
          )}
        </View>

        {/* Telefone */}
        <View style={styles.medicalInfoRow}>
          <Icon name="call" size={20} color="#10B981" />
          <Text style={styles.medicalInfoLabel}>Telefone:</Text>
          {isEditing ? (
            <TextInput
              style={styles.medicalInfoInput}
              value={userData.telefone}
              onChangeText={text => setUserData({...userData, telefone: text})}
              placeholder="(11) 99999-9999"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.medicalInfoValue}>
              {userData.telefone || 'Não informado'}
            </Text>
          )}
        </View>

        {/* Tipo Sanguíneo */}
        <View style={styles.medicalInfoRow}>
          <Icon name="water" size={20} color="#4D97DB" />
          <Text style={styles.medicalInfoLabel}>Tipo Sanguíneo:</Text>
          {isEditing ? (
            <TextInput
              style={styles.medicalInfoInput}
              value={userData.tipoSanguineo}
              onChangeText={text =>
                setUserData({...userData, tipoSanguineo: text})
              }
              placeholder="A+, B-, O+, etc."
              placeholderTextColor="#64748b"
            />
          ) : (
            <Text style={styles.medicalInfoValue}>
              {userData.tipoSanguineo || 'Não informado'}
            </Text>
          )}
        </View>

        {/* Alergias */}
        <View style={styles.medicalInfoRow}>
          <Icon name="warning" size={20} color="#F59E0B" />
          <Text style={styles.medicalInfoLabel}>Alergias:</Text>
          {isEditing ? (
            <TextInput
              style={[styles.medicalInfoInput, {flex: 1}]}
              value={userData.alergias}
              onChangeText={text => setUserData({...userData, alergias: text})}
              placeholder="Digite suas alergias"
              placeholderTextColor="#64748b"
              multiline
            />
          ) : (
            <Text style={styles.medicalInfoValue}>
              {userData.alergias || 'Nenhuma alergia informada'}
            </Text>
          )}
        </View>

        {/* Condições Especiais */}
        <View style={styles.medicalInfoRow}>
          <Icon name="medkit" size={20} color="#10B981" />
          <Text style={styles.medicalInfoLabel}>Condições:</Text>
          {isEditing ? (
            <TextInput
              style={[styles.medicalInfoInput, {flex: 1}]}
              value={userData.condicoesEspeciais}
              onChangeText={text =>
                setUserData({...userData, condicoesEspeciais: text})
              }
              placeholder="Condições médicas especiais"
              placeholderTextColor="#64748b"
              multiline
            />
          ) : (
            <Text style={styles.medicalInfoValue}>
              {userData.condicoesEspeciais || 'Nenhuma condição informada'}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );

  /**
   * Renderiza menu de opções
   */
  const renderMenuOptions = () => (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideUpAnim}],
        },
      ]}>
      <Text style={styles.sectionTitle}>Menu Rápido</Text>
      <View style={styles.menuContainer}>
        {menuOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            style={styles.menuItem}
            onPress={option.action}>
            <View style={styles.menuItemLeft}>
              <View
                style={[
                  styles.menuIcon,
                  {backgroundColor: option.color + '20'},
                ]}>
                <Icon name={option.icon} size={20} color={option.color} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>{option.title}</Text>
                <Text style={styles.menuItemDescription}>
                  {option.description}
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#121A29" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4D97DB" />
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Renderização principal do componente
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />

      {/* Elementos de fundo animados para efeito visual */}
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

      {/* Renderização das seções da tela */}
      {renderHeader()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {renderProfileInfo()}
        {renderStatistics()}
        {renderMedicalInfo()}
        {renderMenuOptions()}

        {/* Botão de salvar quando em modo de edição */}
        {isEditing && (
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}>
            {saving ? (
              <View style={styles.saveButtonContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Salvando...</Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>Salvar Alterações</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Seção de informações do aplicativo */}
        <View style={styles.appInfoSection}>
          <Text style={styles.appInfoVersion}>PillCheck v1.0.0</Text>
          <Text style={styles.appInfoCopyright}>
            Cuidando da sua saúde com tecnologia
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * Estilos do componente PerfilScreen
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121A29',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121A29',
  },
  loadingText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
    fontWeight: '500',
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
    backgroundColor: '#8B5CF6',
    bottom: -width * 0.6,
    right: -width * 0.4,
  },
  header: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
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
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: isMediumScreen ? 24 : 28,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingTop: 17,
    marginBottom: 4,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 30,
    paddingBottom: 30,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4D97DB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#4D97DB',
    paddingBottom: 4,
    paddingHorizontal: 20,
    textAlign: 'center',
    minWidth: 200,
  },
  profileEmail: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 12,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  membershipText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 6,
    fontWeight: '600',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 20 : 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  statisticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statisticCard: {
    flex: 1,
    minWidth: (width - 60) / 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statisticIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statisticValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statisticTitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  medicalInfoCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 16,
  },
  medicalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  medicalInfoLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
    minWidth: 100,
  },
  medicalInfoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  medicalInfoInput: {
    fontSize: 14,
    color: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#4D97DB',
    paddingBottom: 2,
    paddingHorizontal: 8,
    minWidth: 120,
  },
  menuContainer: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#94a3b8',
    letterSpacing: 0.1,
  },
  saveButton: {
    backgroundColor: '#4D97DB',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    shadowColor: '#4D97DB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.3)',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  appInfoSection: {
    alignItems: 'center',
    padding: 30,
    marginTop: 20,
  },
  appInfoVersion: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  appInfoCopyright: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default PerfilScreen;
