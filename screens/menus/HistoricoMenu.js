import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Animated,
  SafeAreaView,
  Platform,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Obtém as dimensões da tela para responsividade
const {width} = Dimensions.get('window');

// Constantes para diferentes tamanhos de tela
const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

/**
 * Componente de tela para exibição do histórico de medicamentos tomados pelo usuário.
 *
 * Funcionalidades principais:
 * - Exibição de medicamentos tomados organizados por data
 * - Filtros por período (hoje, ontem, 7 dias, 30 dias)
 * - Animações de entrada e fundo contínuas
 * - Interface responsiva para diferentes tamanhos de tela
 * - Integração com Firebase Firestore para dados persistentes
 *
 * @component
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.navigation - Objeto de navegação do React Navigation
 * @returns {JSX.Element} Componente renderizado da tela de histórico
 */
const HistoricoMenu = ({navigation}) => {
  // Estados do componente
  const [medicamentosTomados, setMedicamentosTomados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroSelecionado, setFiltroSelecionado] = useState('todos');

  // Usuário autenticado do Firebase
  const user = auth().currentUser;

  // Referências para animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  /**
   * Hook de efeito para configurar animações iniciais e contínuas.
   * Executa animações de fade-in, slide-up e uma animação de fundo em loop.
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
   * Hook de efeito para carregar o histórico quando o usuário ou filtro mudam.
   * Recarrega os dados automaticamente quando há mudanças nos filtros.
   */
  useEffect(() => {
    if (!user) return;
    carregarHistorico();
  }, [user, filtroSelecionado]);

  /**
   * Carrega o histórico de medicamentos do Firestore com base no filtro selecionado.
   * Aplica filtros de data e ordenação cronológica decrescente.
   *
   * @async
   * @function carregarHistorico
   * @throws {Error} Exibe alerta em caso de erro na consulta ao Firestore
   */
  const carregarHistorico = async () => {
    setLoading(true);
    try {
      console.log('Carregando histórico para usuário:', user.uid);

      // Consulta todos os medicamentos do usuário
      const snapshot = await firestore()
        .collection('medicamentos_tomados')
        .where('usuarioId', '==', user.uid)
        .get();

      console.log('Documentos encontrados:', snapshot.size);

      if (snapshot.empty) {
        console.log('Nenhum documento encontrado');
        setMedicamentosTomados([]);
      } else {
        let lista = snapshot.docs.map(doc => {
          const data = {id: doc.id, ...doc.data()};
          console.log('Documento:', data);
          return data;
        });

        // Aplica filtro de data se não for "todos"
        if (filtroSelecionado !== 'todos') {
          const dataFiltro = obterDataFiltro();
          console.log('Filtro de data:', dataFiltro);

          lista = lista.filter(medicamento => {
            const diaMedicamento = medicamento.dia;
            const passaFiltro =
              diaMedicamento >= dataFiltro.inicio &&
              diaMedicamento <= dataFiltro.fim;
            console.log(
              `${diaMedicamento} passa no filtro (${dataFiltro.inicio} - ${dataFiltro.fim}):`,
              passaFiltro,
            );
            return passaFiltro;
          });
        }

        // Ordena por data e horário decrescente
        lista.sort((a, b) => {
          if (a.dia !== b.dia) {
            return b.dia.localeCompare(a.dia);
          }
          return b.horario.localeCompare(a.horario);
        });

        console.log('Lista final:', lista);
        setMedicamentosTomados(lista);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calcula as datas de início e fim com base no filtro selecionado.
   *
   * @function obterDataFiltro
   * @returns {Object} Objeto contendo datas de início e fim no formato ISO
   * @returns {string|null} returns.inicio - Data de início no formato YYYY-MM-DD ou null
   * @returns {string|null} returns.fim - Data de fim no formato YYYY-MM-DD ou null
   */
  const obterDataFiltro = () => {
    const hoje = new Date();
    const inicioHoje = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate(),
    );

    switch (filtroSelecionado) {
      case 'hoje':
        return {
          inicio: inicioHoje.toISOString().split('T')[0],
          fim: inicioHoje.toISOString().split('T')[0],
        };
      case 'ontem':
        const ontem = new Date(inicioHoje);
        ontem.setDate(ontem.getDate() - 1);
        return {
          inicio: ontem.toISOString().split('T')[0],
          fim: ontem.toISOString().split('T')[0],
        };
      case 'semana':
        const inicioSemana = new Date(inicioHoje);
        inicioSemana.setDate(inicioSemana.getDate() - 7);
        return {
          inicio: inicioSemana.toISOString().split('T')[0],
          fim: inicioHoje.toISOString().split('T')[0],
        };
      case 'mes':
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        return {
          inicio: inicioMes.toISOString().split('T')[0],
          fim: inicioHoje.toISOString().split('T')[0],
        };
      default:
        return {inicio: null, fim: null};
    }
  };

  /**
   * Formata uma string de data para exibição amigável ao usuário.
   * Adiciona labels "Hoje" e "Ontem" quando apropriado.
   *
   * @function formatarData
   * @param {string} dataString - Data no formato YYYY-MM-DD
   * @returns {string} Data formatada para exibição (ex: "Hoje, 11/09/2025")
   */
  const formatarData = dataString => {
    const data = new Date(dataString + 'T00:00:00');
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    const dataFormatada = data.toLocaleDateString('pt-BR');

    if (data.toDateString() === hoje.toDateString()) {
      return `Hoje, ${dataFormatada}`;
    } else if (data.toDateString() === ontem.toDateString()) {
      return `Ontem, ${dataFormatada}`;
    } else {
      return dataFormatada;
    }
  };

  /**
   * Agrupa os medicamentos por dia para facilitar a renderização.
   *
   * @function agruparPorDia
   * @returns {Object} Objeto onde as chaves são datas (YYYY-MM-DD) e valores são arrays de medicamentos
   */
  const agruparPorDia = () => {
    const grupos = {};
    medicamentosTomados.forEach(medicamento => {
      const dia = medicamento.dia;
      if (!grupos[dia]) {
        grupos[dia] = [];
      }
      grupos[dia].push(medicamento);
    });
    return grupos;
  };

  /**
   * Calcula estatísticas do histórico para exibição.
   *
   * @function getHistoricoStats
   * @returns {Object} Estatísticas do histórico
   * @returns {number} returns.totalDias - Total de dias com medicamentos registrados
   * @returns {number} returns.totalMedicamentos - Total de medicamentos tomados
   * @returns {number} returns.medicamentosHoje - Medicamentos tomados hoje
   */
  const getHistoricoStats = () => {
    const grupos = agruparPorDia();
    const totalDias = Object.keys(grupos).length;
    const totalMedicamentos = medicamentosTomados.length;

    const hoje = new Date().toISOString().split('T')[0];
    const medicamentosHoje = grupos[hoje] ? grupos[hoje].length : 0;

    return {totalDias, totalMedicamentos, medicamentosHoje};
  };

  /**
   * Renderiza a barra de filtros horizontais.
   *
   * @function renderFiltros
   * @returns {JSX.Element} Componente com os botões de filtro
   */
  const renderFiltros = () => {
    const filtros = [
      {key: 'todos', label: 'Todos', icon: 'infinite'},
      {key: 'hoje', label: 'Hoje', icon: 'today'},
      {key: 'semana', label: '7 dias', icon: 'calendar'},
      {key: 'mes', label: '30 dias', icon: 'calendar-outline'},
    ];

    return (
      <View style={styles.filtrosContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtrosScrollContent}>
          {filtros.map((filtro, index) => (
            <TouchableOpacity
              key={filtro.key}
              style={[
                styles.filtroButton,
                filtroSelecionado === filtro.key && styles.filtroButtonActive,
                index === 0 && styles.filtroButtonFirst,
                index === filtros.length - 1 && styles.filtroButtonLast,
              ]}
              onPress={() => setFiltroSelecionado(filtro.key)}>
              <Icon
                name={filtro.icon}
                size={16}
                color={filtroSelecionado === filtro.key ? '#FFFFFF' : '#64748b'}
                style={styles.filtroIcon}
              />
              <Text
                style={[
                  styles.filtroText,
                  filtroSelecionado === filtro.key && styles.filtroTextActive,
                ]}>
                {filtro.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  /**
   * Renderiza um item individual de medicamento.
   *
   * @function renderMedicamentoItem
   * @param {Object} medicamento - Objeto contendo dados do medicamento
   * @param {string} medicamento.id - ID único do medicamento
   * @param {string} medicamento.remedioNome - Nome do medicamento
   * @param {string} medicamento.horario - Horário em que foi tomado
   * @param {string} medicamento.dosagem - Dosagem do medicamento
   * @returns {JSX.Element} Componente renderizado do item de medicamento
   */
  const renderMedicamentoItem = medicamento => {
    return (
      <View key={medicamento.id} style={styles.medicamentoItem}>
        <View style={styles.medicamentoIconContainer}>
          <MaterialIcons name="medication" size={18} color="#10B981" />
        </View>

        <View style={styles.medicamentoInfo}>
          <View style={styles.medicamentoHeader}>
            <Text style={styles.medicamentoNome}>
              {medicamento.remedioNome}
            </Text>
            <Text style={styles.medicamentoHorario}>{medicamento.horario}</Text>
          </View>
          <Text style={styles.medicamentoDosagem}>
            Dosagem: {medicamento.dosagem}
          </Text>
        </View>

        <View style={styles.statusIndicator}>
          <View style={styles.statusBadge}>
            <Icon name="checkmark" size={12} color="#FFFFFF" />
          </View>
        </View>
      </View>
    );
  };

  /**
   * Renderiza um grupo de medicamentos por dia.
   *
   * @function renderDiaGroup
   * @param {string} dia - Data no formato YYYY-MM-DD
   * @param {Array<Object>} medicamentos - Array de medicamentos do dia
   * @returns {JSX.Element} Componente renderizado do grupo de medicamentos
   */
  const renderDiaGroup = (dia, medicamentos) => {
    return (
      <View key={dia} style={styles.diaGroup}>
        <View style={styles.diaHeader}>
          <View style={styles.diaHeaderLeft}>
            <Icon name="calendar-outline" size={16} color="#e2e8f0" />
            <Text style={styles.diaData}>{formatarData(dia)}</Text>
          </View>
          <View style={styles.diaCounterBadge}>
            <Text style={styles.diaContador}>{medicamentos.length}</Text>
          </View>
        </View>
        <View style={styles.medicamentosContainer}>
          {medicamentos.map(medicamento => renderMedicamentoItem(medicamento))}
        </View>
      </View>
    );
  };

  /**
   * Renderiza o estado de carregamento.
   *
   * @function renderLoadingState
   * @returns {JSX.Element} Componente de loading com spinner e texto
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4D97DB" />
      <Text style={styles.loadingText}>Carregando histórico...</Text>
    </View>
  );

  /**
   * Renderiza o estado vazio quando não há medicamentos.
   *
   * @function renderEmptyState
   * @returns {JSX.Element} Componente de estado vazio com ícone e mensagem
   */
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIconContainer}>
        <Icon
          name="document-text-outline"
          size={isSmallScreen ? 40 : 48}
          color="#64748b"
        />
      </View>
      <Text style={styles.emptyStateTitle}>Nenhum registro encontrado</Text>
      <Text style={styles.emptyStateDescription}>
        {filtroSelecionado === 'hoje'
          ? 'Você ainda não tomou nenhum medicamento hoje'
          : `Nenhum medicamento foi registrado no período selecionado`}
      </Text>
    </View>
  );

  // Prepara dados para renderização
  const gruposPorDia = agruparPorDia();
  const diasOrdenados = Object.keys(gruposPorDia).sort((a, b) =>
    b.localeCompare(a),
  );
  const stats = getHistoricoStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />

      {/* Círculos de fundo animados para efeito visual */}
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

      {/* Header animado com botão de voltar e título */}
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
            <Text style={styles.headerTitle}>Histórico</Text>
            <Text style={styles.headerSubtitle}>
              Veja os medicamentos tomados
            </Text>
          </View>

          <View style={styles.headerRight} />
        </View>
      </Animated.View>

      {/* Conteúdo principal animado */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          },
        ]}>
        {/* Seção de Filtros */}
        <View style={styles.filtrosSection}>
          <View style={styles.sectionTitleContainer}>
            <Icon name="filter" size={18} color="#e2e8f0" />
            <Text style={styles.sectionTitle}>Filtrar por período</Text>
          </View>
          {renderFiltros()}
        </View>

        {/* Lista de Histórico */}
        <View style={styles.historicoSection}>
          <View style={styles.sectionTitleContainer}>
            <Icon name="time" size={18} color="#e2e8f0" />
            <Text style={styles.sectionTitle}>Registros</Text>
          </View>

          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {loading
              ? renderLoadingState()
              : diasOrdenados.length === 0
              ? renderEmptyState()
              : diasOrdenados.map(dia =>
                  renderDiaGroup(dia, gruposPorDia[dia]),
                )}
          </ScrollView>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

/**
 * Estilos do componente HistoricoMenu.
 * Organizado por seções e responsivo para diferentes tamanhos de tela.
 * Utiliza tema escuro com cores personalizadas e efeitos visuais modernos.
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
    backgroundColor: '#F59E0B',
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
  headerRight: {
    width: 44,
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
  filtrosSection: {
    marginBottom: 25,
  },
  historicoSection: {
    flex: 1,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  filtrosContainer: {
    marginBottom: 4,
  },
  filtrosScrollContent: {
    paddingRight: 16,
  },
  filtroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: isSmallScreen ? 8 : 10,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filtroButtonActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.3,
  },
  filtroButtonFirst: {
    marginLeft: 0,
  },
  filtroButtonLast: {
    marginRight: 0,
  },
  filtroIcon: {
    marginRight: 6,
  },
  filtroText: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  filtroTextActive: {
    color: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
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
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  diaGroup: {
    marginBottom: 20,
  },
  diaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  diaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  diaData: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  diaCounterBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#F59E0B',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  diaContador: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  medicamentosContainer: {
    gap: 8,
  },
  medicamentoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  medicamentoIconContainer: {
    width: isSmallScreen ? 32 : 36,
    height: isSmallScreen ? 32 : 36,
    borderRadius: isSmallScreen ? 16 : 18,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicamentoInfo: {
    flex: 1,
  },
  medicamentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  medicamentoNome: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#f8fafc',
    flex: 1,
    marginRight: 8,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  medicamentoHorario: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#4D97DB',
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  medicamentoDosagem: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#94a3b8',
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  statusIndicator: {
    marginLeft: 8,
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});

export default HistoricoMenu;
