import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  Platform,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

/**
 * Modal para criação/gerenciamento de senha de administrador
 */
const AdminPasswordModal = ({
  visible,
  onPasswordSet,
  hasPassword,
  onClose,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('create');

  const handleSetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    setLoading(true);
    await onPasswordSet(password, mode === 'change');
    setPassword('');
    setConfirmPassword('');
    setLoading(false);
  };

  useEffect(() => {
    if (visible) {
      setMode(hasPassword ? 'change' : 'create');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
    }
  }, [visible, hasPassword]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}>
          <View style={styles.passwordModalContent}>
            <View style={styles.passwordModalHeader}>
              <Icon name="lock-closed" size={32} color="#3B82F6" />
              <Text style={styles.passwordModalTitle}>
                {mode === 'create'
                  ? 'Criar Senha de Administrador'
                  : 'Alterar Senha'}
              </Text>
              <Text style={styles.passwordModalSubtitle}>
                {mode === 'create'
                  ? 'Configure uma senha para proteger os dados dos seus dependentes'
                  : 'Defina uma nova senha para o administrador'}
              </Text>
            </View>

            <View style={styles.passwordInputContainer}>
              <Text style={styles.passwordInputLabel}>Senha</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Digite a senha"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.showPasswordButton}
                  onPress={() => setShowPassword(!showPassword)}>
                  <Icon
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={20}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.passwordInputContainer}>
              <Text style={styles.passwordInputLabel}>Confirmar Senha</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirme a senha"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.showPasswordButton}
                  onPress={() => setShowPassword(!showPassword)}>
                  <Icon
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={20}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.passwordHintContainer}>
              <Icon name="information-circle" size={16} color="#3B82F6" />
              <Text style={styles.passwordHint}>
                A senha deve ter no mínimo 6 caracteres
              </Text>
            </View>

            <View style={styles.passwordButtonsContainer}>
              <TouchableOpacity
                style={styles.passwordConfirmButton}
                onPress={handleSetPassword}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.passwordConfirmButtonText}>Confirmar</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.passwordCancelButton}
                onPress={onClose}
                disabled={loading}>
                <Text style={styles.passwordCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

/**
 * Componente principal para gerenciar dependentes do usuário
 */
const Dependentes = ({ navigation }) => {
  const [dependentes, setDependentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [hasAdminPassword, setHasAdminPassword] = useState(false);

  const user = auth().currentUser;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

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
      Animated.timing(scaleAnim, {
        toValue: 1,
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
  }, [backgroundAnim, fadeAnim, slideUpAnim, scaleAnim]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    checkAdminPassword();
    fetchDependentes();
  }, [user]);

  const checkAdminPassword = async () => {
    try {
      const userDoc = await firestore()
        .collection('users')
        .doc(user.uid)
        .get();

      const hasPassword = userDoc.exists && userDoc.data().adminPassword;
      setHasAdminPassword(!!hasPassword);

      if (!hasPassword) {
        setShowPasswordModal(true);
      }
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
    }
  };

  const fetchDependentes = () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = firestore()
      .collection('users_dependentes')
      .where('usuarioId', '==', user.uid)
      .onSnapshot(
        snapshot => {
          if (!snapshot) {
            setLoading(false);
            return;
          }

          const lista = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          setDependentes(lista);
          setLoading(false);
        },
        error => {
          console.error('Erro ao buscar dependentes:', error);
          Alert.alert('Erro', 'Não foi possível carregar os dependentes.');
          setLoading(false);
        },
      );

    return () => unsubscribe();
  };

  const handlePasswordSet = async (password, isChange) => {
    try {
      await firestore().collection('users').doc(user.uid).update({
        adminPassword: password,
      });

      setHasAdminPassword(true);
      setShowPasswordModal(false);
      Alert.alert(
        'Sucesso',
        isChange
          ? 'Senha alterada com sucesso!'
          : 'Senha de administrador criada com sucesso!',
      );
    } catch (error) {
      console.error('Erro ao salvar senha:', error);
      Alert.alert('Erro', 'Não foi possível salvar a senha.');
    }
  };

  const handleAdicionarDependente = () => {
    navigation.navigate('AdicionarDependente');
  };

  const handleEditarDependente = dependente => {
    navigation.navigate('AdicionarDependente', { dependente });
  };

  const handleRemoverDependente = async dependenteId => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja remover este dependente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection('users_dependentes')
                .doc(dependenteId)
                .delete();

              Alert.alert('Sucesso', 'Dependente removido com sucesso!');
            } catch (error) {
              console.error('Erro ao remover dependente:', error);
              Alert.alert('Erro', 'Não foi possível remover o dependente.');
            }
          },
        },
      ],
    );
  };

  const calcularIdade = dataNascimento => {
    if (!dataNascimento) return 0;

    const hoje = new Date();
    const nascimento = dataNascimento.toDate
      ? dataNascimento.toDate()
      : new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();

    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }

    return idade;
  };

  const getAvatarColor = genero => {
    return genero === 'masculino' ? '#3B82F6' : '#EC4899';
  };

  const renderDependenteCard = (dependente, index) => {
    const idade = calcularIdade(dependente.dataNascimento);
    const avatarColor = getAvatarColor(dependente.genero);
    const inicial = dependente.nome?.charAt(0).toUpperCase() || 'D';

    return (
      <Animated.View
        key={dependente.id}
        style={[
          styles.dependenteCard,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideUpAnim },
              {
                scale: scaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}>
        <View style={[styles.cardGradientBar, { backgroundColor: avatarColor }]} />

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.avatarContainer,
                {
                  backgroundColor: '#10B981',
                },
              ]}>
              <Text style={styles.avatar}>{inicial}</Text>
            </View>

            <View style={styles.dependenteInfo}>
              <Text style={styles.nomeDependente}>{dependente.nome}</Text>
              <View style={styles.infoRow}>
                <View style={[styles.infoBadge, { backgroundColor: `${avatarColor}20` }]}>
                  <Icon name="people" size={12} color={avatarColor} />
                  <Text style={[styles.infoText, { color: avatarColor }]}>
                    {dependente.parentesco}
                  </Text>
                </View>
                <View style={styles.infoBadge}>
                  <Icon name="calendar" size={12} color="#10B981" />
                  <Text style={[styles.infoText, { color: '#10B981' }]}>
                    {idade} anos
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}
              onPress={() =>
                navigation.navigate('IndexDependentes', {
                  dependenteId: dependente.id,
                })
              }>
              <Icon name="medical" size={16} color="#10B981" />
              <Text style={[styles.actionText, { color: '#10B981' }]}>
                Administrar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
              onPress={() => handleEditarDependente(dependente)}>
              <Icon name="create" size={16} color="#3B82F6" />
              <Text style={[styles.actionText, { color: '#3B82F6' }]}>
                Editar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
              onPress={() => handleRemoverDependente(dependente.id)}>
              <Icon name="trash" size={16} color="#EF4444" />
              <Text style={[styles.actionText, { color: '#EF4444' }]}>
                Remover
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Animated.View
        style={[
          styles.emptyIconContainer,
          {
            transform: [
              {
                scale: backgroundAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.05],
                }),
              },
            ],
          },
        ]}>
        <Icon name="people" size={48} color="#3B82F6" />
      </Animated.View>
      <Text style={styles.emptyTitle}>Nenhum dependente</Text>
      <Text style={styles.emptyDescription}>
        Adicione familiares ou pessoas sob seus cuidados para gerenciar seus medicamentos
      </Text>
      <TouchableOpacity
        style={styles.emptyActionButton}
        onPress={handleAdicionarDependente}>
        <Icon name="add-circle" size={20} color="#FFFFFF" />
        <Text style={styles.emptyActionButtonText}>Adicionar Dependente</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={styles.loadingText}>Carregando dependentes...</Text>
    </View>
  );

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
            transform: [{ translateY: slideUpAnim }],
          },
        ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Dependentes</Text>
          <Text style={styles.headerSubtitle}>
            {dependentes.length} {dependentes.length === 1 ? 'dependente' : 'dependentes'} cadastrados
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={() => setShowPasswordModal(true)}>
          <Icon name="key" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAdicionarDependente}>
          <Icon name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          dependentes.length === 0 && !loading ? styles.flexGrow : null,
        ]}>
        {loading ? (
          renderLoadingState()
        ) : dependentes.length > 0 ? (
          <View style={styles.dependentesContainer}>
            {dependentes.map((dependente, index) =>
              renderDependenteCard(dependente, index),
            )}
          </View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      <AdminPasswordModal
        visible={showPasswordModal}
        onPasswordSet={handlePasswordSet}
        hasPassword={hasAdminPassword}
        onClose={() => setShowPasswordModal(false)}
      />
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
    backgroundColor: '#059669',
    bottom: -width * 0.6,
    right: -width * 0.4,
  },
  flexGrow: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 30, 48, 0.95)',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 40 : 60,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '500',
  },
  headerActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  dependentesContainer: {
    gap: 16,
  },
  dependenteCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  avatar: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dependenteInfo: {
    flex: 1,
  },
  nomeDependente: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyActionButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardAvoidingView: {
    width: '100%',
  },
  passwordModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  passwordModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  passwordModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  passwordModalSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  passwordInputContainer: {
    marginBottom: 16,
  },
  passwordInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  showPasswordButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  passwordHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    gap: 8,
  },
  passwordHint: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  passwordButtonsContainer: {
    gap: 12,
  },
  passwordConfirmButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  passwordConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  passwordCancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  passwordCancelButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

export default Dependentes;