import React, {useState, useEffect, useRef} from 'react';
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
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';

// Obtém a largura da tela do dispositivo
const {width} = Dimensions.get('window');

// Define breakpoints para diferentes tamanhos de tela
const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

/**
 * Componente principal para gerenciar dependentes do usuário.
 *
 * Este componente permite visualizar, adicionar, editar e remover dependentes,
 * além de navegar para o gerenciamento de medicamentos de cada dependente.
 * Inclui animações suaves e design responsivo para diferentes tamanhos de tela.
 *
 * @component
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.navigation - Objeto de navegação do React Navigation
 * @returns {JSX.Element} Componente renderizado da tela de dependentes
 *
 * @author Seu Nome
 * @version 1.0.0
 * @since 2024-01-01
 */
const Dependentes = ({navigation}) => {
  // Estados do componente
  const [dependentes, setDependentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth().currentUser;

  // Referências para animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  /**
   * Effect hook para configurar animações iniciais da tela.
   *
   * Configura animações de fade-in, slide-up e uma animação contínua
   * de fundo que cria um efeito visual sutil.
   */
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

  /**
   * Effect hook para buscar e escutar mudanças na lista de dependentes.
   *
   * Configura um listener em tempo real no Firestore para obter os dependentes
   * do usuário atual. Atualiza automaticamente quando há mudanças na base de dados.
   */
  useEffect(() => {
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
            console.warn('Snapshot vazio');
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
  }, [user]);

  /**
   * Navega para a tela de adicionar novo dependente.
   *
   * @function handleAdicionarDependente
   */
  const handleAdicionarDependente = () => {
    navigation.navigate('AdicionarDependente');
  };

  /**
   * Navega para a tela de edição de dependente.
   *
   * @function handleEditarDependente
   * @param {Object} dependente - Objeto contendo os dados do dependente a ser editado
   * @param {string} dependente.id - ID único do dependente
   * @param {string} dependente.nome - Nome do dependente
   * @param {string} dependente.parentesco - Relação de parentesco
   * @param {Date} dependente.dataNascimento - Data de nascimento
   * @param {string} dependente.genero - Gênero do dependente
   */
  const handleEditarDependente = dependente => {
    navigation.navigate('AdicionarDependente', {dependente});
  };

  /**
   * Remove um dependente da base de dados após confirmação do usuário.
   *
   * Exibe um alerta de confirmação antes de proceder com a remoção.
   * Em caso de sucesso ou erro, exibe mensagens apropriadas.
   *
   * @async
   * @function handleRemoverDependente
   * @param {string} dependenteId - ID único do dependente a ser removido
   */
  const handleRemoverDependente = async dependenteId => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja remover este dependente?',
      [
        {text: 'Cancelar', style: 'cancel'},
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

  /**
   * Retorna o emoji avatar apropriado baseado no gênero e idade.
   *
   * @function getAvatar
   * @param {string} genero - Gênero da pessoa ('masculino' ou 'feminino')
   * @param {number} idade - Idade da pessoa em anos
   * @returns {string} Emoji representando o avatar da pessoa
   */
  const getAvatar = (genero, idade) => {
    if (idade < 18) {
      return genero === 'masculino' ? '👦' : '👧';
    } else if (idade < 60) {
      return genero === 'masculino' ? '👨' : '👩';
    } else {
      return genero === 'masculino' ? '👴' : '👵';
    }
  };

  /**
   * Retorna a cor do avatar baseada no gênero.
   *
   * @function getAvatarColor
   * @param {string} genero - Gênero da pessoa ('masculino' ou 'feminino')
   * @returns {string} Código hexadecimal da cor (#10B981 para masculino, #9F7AEA para feminino)
   */
  const getAvatarColor = genero => {
    return genero === 'masculino' ? '#10B981' : '#9F7AEA';
  };

  /**
   * Calcula a idade em anos baseada na data de nascimento.
   *
   * Suporta objetos Timestamp do Firestore e objetos Date nativos.
   * Considera mês e dia para cálculo preciso da idade.
   *
   * @function calcularIdade
   * @param {Date|Object} dataNascimento - Data de nascimento (Date ou Timestamp do Firestore)
   * @returns {number} Idade em anos completos
   */
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

  /**
   * Renderiza um card individual de dependente com suas informações e ações.
   *
   * Inclui avatar personalizado, informações básicas (nome, parentesco, idade)
   * e botões de ação (administrar, editar, remover) com animações suaves.
   *
   * @function renderDependenteCard
   * @param {Object} dependente - Dados do dependente
   * @param {string} dependente.id - ID único do dependente
   * @param {string} dependente.nome - Nome do dependente
   * @param {string} dependente.parentesco - Relação de parentesco
   * @param {Date} dependente.dataNascimento - Data de nascimento
   * @param {string} dependente.genero - Gênero do dependente
   * @param {number} index - Índice do dependente na lista
   * @returns {JSX.Element} Card renderizado do dependente
   */
  const renderDependenteCard = (dependente, index) => {
    const idade = calcularIdade(dependente.dataNascimento);
    const avatar = getAvatar(dependente.genero, idade);
    const avatarColor = getAvatarColor(dependente.genero);

    return (
      <Animated.View
        key={dependente.id}
        style={[
          styles.dependenteCard,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          },
        ]}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.avatarContainer,
                {
                  backgroundColor: `${avatarColor}15`,
                  borderColor: `${avatarColor}25`,
                },
              ]}>
              <Text style={styles.avatar}>{avatar}</Text>
            </View>

            <View style={styles.dependenteInfo}>
              <Text style={styles.nomeDependente}>{dependente.nome}</Text>
              <View style={styles.parentescoContainer}>
                <View style={styles.parentescoBadge}>
                  <Icon name="people-outline" size={12} color="#10B981" />
                  <Text style={styles.parentesco}>{dependente.parentesco}</Text>
                </View>
                <View style={styles.idadeBadge}>
                  <Icon name="calendar-outline" size={12} color="#94a3b8" />
                  <Text style={styles.idade}>{idade} anos</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate('IndexDependentes', {
                dependenteId: dependente.id,
              })
            }>
            <Icon name="medical-outline" size={16} color="#10B981" />
            <Text style={[styles.actionText, {color: '#10B981'}]}>
              Administrar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditarDependente(dependente)}>
            <Icon name="create-outline" size={16} color="#94a3b8" />
            <Text style={styles.actionText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteAction]}
            onPress={() => handleRemoverDependente(dependente.id)}>
            <Icon name="trash-outline" size={16} color="#E53E3E" />
            <Text style={[styles.actionText, {color: '#E53E3E'}]}>Remover</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  /**
   * Renderiza o estado vazio quando não há dependentes cadastrados.
   *
   * Exibe uma mensagem informativa e um botão para adicionar o primeiro dependente.
   * O layout é responsivo e adapta-se a diferentes tamanhos de tela.
   *
   * @function renderEmptyState
   * @returns {JSX.Element} Componente do estado vazio
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon
          name="people-outline"
          size={isSmallScreen ? 40 : 48}
          color="#64748b"
        />
      </View>
      <Text style={styles.emptyTitle}>Nenhum dependente cadastrado</Text>
      <Text style={styles.emptyDescription}>
        Adicione familiares ou pessoas sob seus cuidados para gerenciar seus
        medicamentos
      </Text>
      <TouchableOpacity
        style={styles.emptyActionButton}
        onPress={handleAdicionarDependente}>
        <View style={styles.buttonContent}>
          <Icon name="add-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.emptyActionButtonText}>Adicionar Dependente</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  /**
   * Renderiza o estado de carregamento enquanto os dados são buscados.
   *
   * Exibe um indicador de atividade e uma mensagem informativa.
   *
   * @function renderLoadingState
   * @returns {JSX.Element} Componente do estado de carregamento
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#10B981" />
      <Text style={styles.loadingText}>Carregando dependentes...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />

      {/* Elementos de background animados para criar profundidade visual */}
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

      {/* Header da tela com título e botões de navegação */}
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
          <Icon name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Dependentes</Text>
          <Text style={styles.headerSubtitle}>
            Veja seus familiares sob seus cuidados
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAdicionarDependente}>
          <Icon name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Conteúdo principal da tela */}
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
    </SafeAreaView>
  );
};

/**
 * Estilos do componente Dependentes.
 *
 * Inclui estilos responsivos que se adaptam a diferentes tamanhos de tela,
 * animações suaves, tema escuro e design moderno com glassmorphism.
 *
 * @const {Object} styles - Objeto contendo todos os estilos do componente
 */
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
    backgroundColor: '#10B981',
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
  flexGrow: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: Platform.OS === 'ios' ? 40 : 60,
    paddingBottom: isMediumScreen ? 20 : 30,
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
    marginTop: isMediumScreen ? -30 : 0,
  },
  backButton: {
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: isMediumScreen ? 22 : 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: isMediumScreen ? 13 : 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  addButton: {
    width: isMediumScreen ? 38 : 44,
    height: isMediumScreen ? 38 : 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 16 : 24,
  },
  scrollContent: {
    paddingVertical: 25,
  },
  dependentesContainer: {
    flex: 1,
  },
  dependenteCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,

    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    overflow: 'hidden',
  },
  cardContent: {
    padding: isSmallScreen ? 16 : 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: isSmallScreen ? 50 : 56,
    height: isSmallScreen ? 50 : 56,
    borderRadius: isSmallScreen ? 25 : 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatar: {
    fontSize: isSmallScreen ? 24 : 28,
  },
  dependenteInfo: {
    flex: 1,
  },
  nomeDependente: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 8,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  parentescoContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  parentescoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  parentesco: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#10B981',
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  idadeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.8)',
  },
  idade: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.6)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallScreen ? 14 : 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(51, 65, 85, 0.6)',
  },
  deleteAction: {
    borderRightWidth: 0,
  },
  actionText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#94a3b8',
    fontWeight: '500',
    marginLeft: 6,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
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
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
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
  emptyTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  emptyDescription: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  emptyActionButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default Dependentes;
