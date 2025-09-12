/**
 * @fileoverview AlertasScreen - Tela principal para gerenciamento de alertas de medicação
 * @author Seu Nome
 * @version 1.0.0
 */

import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Modal,
  ActivityIndicator,
  StatusBar,
  Animated,
  SafeAreaView,
  Platform,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import notifee from '@notifee/react-native';

// Obtenção das dimensões da tela para responsividade
const {width, height} = Dimensions.get('window');

/**
 * Constantes para determinar o tamanho da tela e aplicar estilos responsivos
 */
const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

/**
 * @typedef {Object} Alerta
 * @property {string} id - ID único do alerta
 * @property {string} horario - Horário do alerta (formato HH:MM)
 * @property {string} nomeRemedio - Nome do medicamento
 * @property {string} dosagem - Dosagem do medicamento
 * @property {string} remedioId - ID do remédio associado
 * @property {string} usuarioId - ID do usuário proprietário
 * @property {boolean} ativo - Status ativo/inativo do alerta
 * @property {string|Array} dias - Dias da semana para o alerta
 * @property {string} proximaTomada - Data/hora da próxima tomada
 * @property {string} titulo - Título alternativo do alerta
 */

/**
 * @component AlertasScreen
 * @description Componente principal para exibição e gerenciamento de alertas de medicação.
 * Permite visualizar, ativar/desativar e excluir alertas configurados pelo usuário.
 *
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.navigation - Objeto de navegação do React Navigation
 * @returns {JSX.Element} Componente renderizado
 *
 * @example
 * <AlertasScreen navigation={navigation} />
 */
const AlertasScreen = ({navigation}) => {
  // Estados do componente
  /**
   * @type {[Array<Alerta>, Function]} Estado que armazena a lista de alertas
   */
  const [alertas, setAlertas] = useState([]);

  /**
   * @type {[boolean, Function]} Estado de carregamento da tela
   */
  const [loading, setLoading] = useState(true);

  /**
   * @type {[boolean, Function]} Controla a visibilidade do modal de confirmação
   */
  const [modalVisible, setModalVisible] = useState(false);

  /**
   * @type {[Alerta|null, Function]} Armazena o alerta selecionado para exclusão
   */
  const [alertaParaExcluir, setAlertaParaExcluir] = useState(null);

  /**
   * @type {Object} Usuário autenticado atual
   */
  const user = auth().currentUser;

  // Referências para animações
  /**
   * @type {Animated.Value} Valor animado para fade in/out
   */
  const fadeAnim = useRef(new Animated.Value(0)).current;

  /**
   * @type {Animated.Value} Valor animado para movimento vertical
   */
  const slideUpAnim = useRef(new Animated.Value(30)).current;

  /**
   * @type {Animated.Value} Valor animado para o fundo
   */
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  /**
   * @description useEffect para inicializar animações da tela
   * Executa animações de fade e slide up, além da animação contínua de fundo
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
  });

  /**
   * @description useEffect para carregar alertas do Firestore
   * Configura um listener em tempo real para os alertas do usuário autenticado
   */
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = firestore()
      .collection('alertas')
      .where('usuarioId', '==', user.uid)
      .orderBy('horario')
      .onSnapshot(
        async snapshot => {
          try {
            if (!snapshot || !snapshot.docs) {
              console.warn('Snapshot vazio ou inválido');
              setLoading(false);
              return;
            }

            const alertasData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }));

            const alertasComNomes = await Promise.all(
              alertasData.map(async alerta => {
                if (alerta.remedioId) {
                  try {
                    const remedioDoc = await firestore()
                      .collection('remedios')
                      .doc(alerta.remedioId)
                      .get();

                    if (remedioDoc.exists) {
                      const remedioData = remedioDoc.data();
                      return {
                        ...alerta,
                        nomeRemedio:
                          remedioData.nome ||
                          alerta.titulo ||
                          'Remédio não encontrado',
                      };
                    }
                  } catch (error) {
                    console.error('Erro ao buscar remédio:', error);
                  }
                }

                return {
                  ...alerta,
                  nomeRemedio: alerta.titulo || 'Medicamento',
                };
              }),
            );

            setAlertas(alertasComNomes);
            setLoading(false);
          } catch (error) {
            console.error('Erro ao processar alertas:', error);
            Alert.alert(
              'Erro',
              'Não foi possível carregar os dados dos medicamentos.',
            );
            setLoading(false);
          }
        },
        error => {
          console.error('Erro ao buscar alertas:', error);
          Alert.alert('Erro', 'Não foi possível carregar os dados.');
          setLoading(false);
        },
      );

    return () => unsubscribe();
  }, [user]);

  /**
   * @function confirmarExclusao
   * @description Abre o modal de confirmação para exclusão de um alerta
   * @param {Alerta} alerta - O alerta a ser excluído
   */
  const confirmarExclusao = alerta => {
    setAlertaParaExcluir(alerta);
    setModalVisible(true);
  };

  /**
   * @function cancelarNotificacoesRemedio
   * @description Cancela todas as notificações agendadas para um remédio específico
   * @param {string} remedioId - ID do remédio
   * @param {Array<string>} dias - Array com os dias da semana
   */
  const cancelarNotificacoesRemedio = async (remedioId, dias) => {
    for (let dia of dias) {
      const id = `${remedioId}_${dia}`;
      await notifee.cancelTriggerNotification(id);
    }
  };

  /**
   * @function excluirAlerta
   * @description Exclui permanentemente um alerta do Firestore e cancela suas notificações
   * @async
   */
  const excluirAlerta = async () => {
    try {
      await firestore()
        .collection('alertas')
        .doc(alertaParaExcluir.id)
        .delete();

      Alert.alert('Sucesso', 'Alerta excluído com sucesso!');
      cancelarNotificacoesRemedio();
      setModalVisible(false);
    } catch (error) {
      console.error('Erro ao excluir alerta:', error);
      Alert.alert('Erro', 'Não foi possível excluir o alerta.');
    }
  };

  /**
   * @function toggleAlerta
   * @description Alterna o status ativo/inativo de um alerta
   * @param {string} alertaId - ID do alerta a ser alternado
   * @async
   */
  const toggleAlerta = async alertaId => {
    try {
      const alerta = alertas.find(a => a.id === alertaId);
      const novoStatus = !alerta.ativo;

      await firestore()
        .collection('alertas')
        .doc(alertaId)
        .update({ativo: novoStatus});

      setAlertas(prev =>
        prev.map(alerta =>
          alerta.id === alertaId ? {...alerta, ativo: novoStatus} : alerta,
        ),
      );
    } catch (error) {
      console.error('Erro ao atualizar alerta:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o alerta.');
    }
  };

  /**
   * @function renderDiasSemana
   * @description Renderiza os chips dos dias da semana para um alerta
   * @param {string|Array} dias - Dias da semana (string separada por vírgula ou array)
   * @returns {JSX.Element|null} Componente com os chips dos dias ou null
   */
  const renderDiasSemana = dias => {
    if (!dias) {
      return null;
    }

    let diasArray = dias;
    if (typeof dias === 'string') {
      diasArray = dias.split(',').map(d => d.trim());
    }

    if (!Array.isArray(diasArray) || diasArray.length === 0) {
      return null;
    }

    /**
     * @type {Object} Mapeamento de abreviações para dias formatados
     */
    const diasMap = {
      Dom: 'DOM',
      Seg: 'SEG',
      Ter: 'TER',
      Qua: 'QUA',
      Qui: 'QUI',
      Sex: 'SEX',
      Sáb: 'SÁB',
    };

    return (
      <View style={styles.diasContainer}>
        <Text style={styles.diasLabel}>Dias:</Text>
        <View style={styles.diasChips}>
          {diasArray.map((dia, index) => {
            const diaFormatado =
              diasMap[dia.toLowerCase()] || dia.toUpperCase();
            return (
              <View key={index} style={styles.diaChip}>
                <Text style={styles.diaText}>{diaFormatado}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  /**
   * @function renderAlertaCard
   * @description Renderiza um card individual de alerta
   * @param {Alerta} alerta - Dados do alerta a ser renderizado
   * @returns {JSX.Element} Card do alerta
   */
  const renderAlertaCard = alerta => (
    <View
      key={alerta.id}
      style={[
        styles.alertaCard,
        {
          opacity: alerta.ativo !== false ? 1 : 0.6,
        },
      ]}>
      <View style={styles.alertaHeader}>
        <View style={styles.alertaIconContainer}>
          <Icon name="alarm" size={20} color="#4D97DB" />
        </View>

        <View style={styles.alertaContent}>
          <View style={styles.alertaMainInfo}>
            <Text style={styles.horarioText}>{alerta.horario}</Text>
            <Text style={styles.medicamentoNome}>{alerta.nomeRemedio}</Text>
            <Text style={styles.dosagem}>Dosagem: {alerta.dosagem}</Text>
            {alerta.proximaTomada && (
              <Text style={styles.proximaTomada}>
                Próxima: {alerta.proximaTomada}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => confirmarExclusao(alerta)}>
            <Icon name="trash-outline" size={16} color="#E53E3E" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.alertaFooter}>
        {alerta.dias ? (
          renderDiasSemana(alerta.dias)
        ) : (
          <View style={styles.diasContainer}>
            <Text style={styles.diasLabel}>Frequência:</Text>
            <View style={styles.diasChips}>
              <View style={styles.diaChip}>
                <Text style={styles.diaText}>Todos os dias</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  /**
   * @function renderLoadingState
   * @description Renderiza o estado de carregamento
   * @returns {JSX.Element} Componente de loading
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4D97DB" />
      <Text style={styles.loadingText}>Carregando alertas...</Text>
    </View>
  );

  /**
   * @function renderEmptyState
   * @description Renderiza o estado vazio quando não há alertas
   * @returns {JSX.Element} Componente de estado vazio
   */
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIconContainer}>
        <Icon
          name="alarm-outline"
          size={isSmallScreen ? 40 : 48}
          color="#64748b"
        />
      </View>
      <Text style={styles.emptyStateTitle}>Nenhum alerta configurado</Text>
      <Text style={styles.emptyStateDescription}>
        Toque no botão + para adicionar seu primeiro alerta de medicação
      </Text>
      <TouchableOpacity
        style={styles.emptyActionButton}
        onPress={() => navigation.navigate('AdicionarAlerta')}>
        <Icon
          name="add"
          size={20}
          color="#FFFFFF"
          style={styles.emptyActionIcon}
        />
        <Text style={styles.emptyActionButtonText}>Adicionar Alerta</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * @function getAlertsStats
   * @description Calcula estatísticas dos alertas (ativos, inativos, total)
   * @returns {Object} Objeto com as estatísticas
   * @returns {number} returns.ativos - Número de alertas ativos
   * @returns {number} returns.inativos - Número de alertas inativos
   * @returns {number} returns.total - Total de alertas
   */
  const getAlertsStats = () => {
    const ativos = alertas.filter(alerta => alerta.ativo !== false).length;
    const inativos = alertas.length - ativos;
    return {ativos, inativos, total: alertas.length};
  };

  const stats = getAlertsStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />

      {/* Círculos de fundo animados */}
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

      {/* Header da tela */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          },
        ]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Meus Alertas</Text>
            <Text style={styles.headerSubtitle}>{stats.total} alerta(s)</Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AdicionarAlerta')}>
            <Icon name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Conteúdo principal */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          },
        ]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Icon name="alarm" size={18} color="#e2e8f0" />
            <Text style={styles.sectionTitle}>Seus Alertas</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {loading
            ? renderLoadingState()
            : alertas.length === 0
            ? renderEmptyState()
            : alertas.map(renderAlertaCard)}
        </ScrollView>
      </Animated.View>

      {/* Modal de confirmação de exclusão */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Icon name="warning" size={24} color="#E53E3E" />
              </View>
              <Text style={styles.modalTitle}>Excluir Alerta</Text>
            </View>

            <Text style={styles.modalText}>
              Tem certeza que deseja excluir o alerta para "
              {alertaParaExcluir?.nomeRemedio}"?
            </Text>
            <Text style={styles.modalSubtext}>
              Esta ação não pode ser desfeita.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={excluirAlerta}>
                <Text style={styles.modalConfirmText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/**
 * @description Estilos do componente AlertasScreen
 * Utiliza StyleSheet.create para otimização de performance
 * @type {Object}
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
    paddingTop: Platform.OS === 'ios' ? 30 : 40,
    paddingBottom: isMediumScreen ? 10 : 15,
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
  headerTop: {
    paddingTop: Platform.OS === 'ios' ? 15 : 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: isSmallScreen ? 16 : 20,
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
    marginHorizontal: 16,
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
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  addButton: {
    width: isMediumScreen ? 38 : 44,
    height: isMediumScreen ? 38 : 44,
    borderRadius: 22,
    backgroundColor: '#4D97DB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4D97DB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    paddingVertical: isSmallScreen ? 12 : 16,
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
  statNumber: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  statLabel: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  content: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 25,
  },
  sectionHeader: {
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
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
  alertaCard: {
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
    borderLeftColor: '#4D97DB',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  alertaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  alertaIconContainer: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 36 : 40,
    borderRadius: isSmallScreen ? 18 : 20,
    backgroundColor: 'rgba(77, 151, 219, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertaContent: {
    flex: 1,
  },
  alertaMainInfo: {
    flex: 1,
  },
  horarioText: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: '300',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -1,
    marginBottom: 4,
  },
  medicamentoNome: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  dosagem: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#94a3b8',
    marginBottom: 4,
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  proximaTomada: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#10B981',
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  actionsContainer: {
    gap: 8,
    alignItems: 'center',
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toggleActive: {
    backgroundColor: '#10B981',
  },
  toggleInactive: {
    backgroundColor: '#6B7280',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(229, 62, 62, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 62, 62, 0.3)',
  },
  alertaFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.6)',
    paddingTop: 12,
  },
  diasContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  diasLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#64748b',
    fontWeight: '500',
    marginRight: 8,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  diasChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  diaChip: {
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
    paddingHorizontal: isSmallScreen ? 8 : 10,
    paddingVertical: isSmallScreen ? 4 : 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.25)',
  },
  diaText: {
    fontSize: isSmallScreen ? 10 : 11,
    color: '#4D97DB',
    fontWeight: '600',
    letterSpacing: 0.5,
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
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4D97DB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#4D97DB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyActionIcon: {
    marginRight: 8,
  },
  emptyActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  modalContent: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(229, 62, 62, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 62, 62, 0.3)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  modalText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 25,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalCancelText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#E53E3E',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#E53E3E',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default AlertasScreen;
