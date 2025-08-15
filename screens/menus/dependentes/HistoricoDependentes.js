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

const {width} = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

const HistoricoMedicamentosScreen = ({navigation, route}) => {
  const [medicamentosTomados, setMedicamentosTomados] = useState([]);
  const [dependente, setDependente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroSelecionado, setFiltroSelecionado] = useState('todos');
  const user = auth().currentUser;
  const {dependenteId} = route.params || {};

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
    if (!user || !dependenteId) {
      setLoading(false);
      Alert.alert('Erro', 'Dependente não encontrado.');
      navigation.goBack();
      return;
    }

    const buscarDependente = async () => {
      try {
        const dependenteDoc = await firestore()
          .collection('users_dependentes')
          .doc(dependenteId)
          .get();

        if (dependenteDoc.exists) {
          const dependenteData = {
            id: dependenteDoc.id,
            ...dependenteDoc.data(),
          };
          setDependente(dependenteData);
          return dependenteData;
        } else {
          Alert.alert('Erro', 'Dependente não encontrado.');
          navigation.goBack();
          return null;
        }
      } catch (error) {
        console.error('Erro ao buscar dependente:', error);
        Alert.alert(
          'Erro',
          'Não foi possível carregar os dados do dependente.',
        );
        navigation.goBack();
        return null;
      }
    };

    const buscarHistorico = async dependenteData => {
      if (!dependenteData) {
        setLoading(false);
        return;
      }

      const unsubscribe = firestore()
        .collection('medicamentos_tomados_dependentes')
        .where('dependenteId', '==', dependenteId)
        .onSnapshot(
          async snapshot => {
            try {
              if (!snapshot || !snapshot.docs) {
                console.warn('Snapshot vazio ou inválido');
                setLoading(false);
                return;
              }

              const medicamentosData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
              }));

              const medicamentosComDetalhes = await Promise.all(
                medicamentosData.map(async medicamento => {
                  let nomeRemedio = medicamento.remedioNome || 'Medicamento';

                  if (medicamento.remedioId) {
                    try {
                      const remedioDoc = await firestore()
                        .collection('remedios')
                        .doc(medicamento.remedioId)
                        .get();

                      if (remedioDoc.exists) {
                        const remedioData = remedioDoc.data();
                        nomeRemedio = remedioData.nome || nomeRemedio;
                      }
                    } catch (error) {
                      console.error('Erro ao buscar remédio:', error);
                    }
                  }

                  return {
                    ...medicamento,
                    remedioNome: nomeRemedio,
                    nomeDependente:
                      dependenteData.nome ||
                      dependenteData.nomeCompleto ||
                      'Dependente',
                  };
                }),
              );

              // Aplicar filtro
              let medicamentosFiltrados = medicamentosComDetalhes;

              if (filtroSelecionado !== 'todos') {
                const dataFiltro = obterDataFiltro();
                console.log('Filtro de data:', dataFiltro);

                medicamentosFiltrados = medicamentosFiltrados.filter(
                  medicamento => {
                    const diaMedicamento = medicamento.dia;
                    const passaFiltro =
                      diaMedicamento >= dataFiltro.inicio &&
                      diaMedicamento <= dataFiltro.fim;
                    console.log(
                      `${diaMedicamento} passa no filtro (${dataFiltro.inicio} - ${dataFiltro.fim}):`,
                      passaFiltro,
                    );
                    return passaFiltro;
                  },
                );
              }

              // Ordenar
              medicamentosFiltrados.sort((a, b) => {
                if (a.dia !== b.dia) {
                  return b.dia.localeCompare(a.dia);
                }
                return b.horario.localeCompare(a.horario);
              });

              console.log('Lista final:', medicamentosFiltrados);
              setMedicamentosTomados(medicamentosFiltrados);
              setLoading(false);
            } catch (error) {
              console.error('Erro ao processar histórico:', error);
              Alert.alert('Erro', 'Não foi possível carregar o histórico.');
              setLoading(false);
            }
          },
          error => {
            console.error('Erro ao buscar histórico:', error);
            Alert.alert('Erro', 'Não foi possível carregar os dados.');
            setLoading(false);
          },
        );

      return unsubscribe;
    };

    const inicializar = async () => {
      const dependenteData = await buscarDependente();
      const unsubscribe = await buscarHistorico(dependenteData);
      return unsubscribe;
    };

    let unsubscribe;
    inicializar().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [user, dependenteId, filtroSelecionado]);

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

  const getHistoricoStats = () => {
    const grupos = agruparPorDia();
    const totalDias = Object.keys(grupos).length;
    const totalMedicamentos = medicamentosTomados.length;

    const hoje = new Date().toISOString().split('T')[0];
    const medicamentosHoje = grupos[hoje] ? grupos[hoje].length : 0;

    return {totalDias, totalMedicamentos, medicamentosHoje};
  };

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

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4D97DB" />
      <Text style={styles.loadingText}>Carregando histórico...</Text>
    </View>
  );

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
          ? `${
              dependente?.nome || dependente?.nomeCompleto
            } ainda não tomou nenhum medicamento hoje`
          : `Nenhum medicamento foi registrado para ${
              dependente?.nome || dependente?.nomeCompleto
            } no período selecionado`}
      </Text>
    </View>
  );

  const gruposPorDia = agruparPorDia();
  const diasOrdenados = Object.keys(gruposPorDia).sort((a, b) =>
    b.localeCompare(a),
  );
  const stats = getHistoricoStats();

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
              {dependente?.nome || dependente?.nomeCompleto || 'Dependente'}
            </Text>
          </View>

          <View style={styles.headerRight} />
        </View>
      </Animated.View>

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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: isSmallScreen ? 16 : 20,
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
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
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

export default HistoricoMedicamentosScreen;