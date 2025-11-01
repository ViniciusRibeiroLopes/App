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

    return () => backgroundAnimation.stop();
  }, []);

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

              let medicamentosFiltrados = medicamentosComDetalhes;

              if (filtroSelecionado !== 'todos') {
                const dataFiltro = obterDataFiltro();
                medicamentosFiltrados = medicamentosFiltrados.filter(
                  medicamento => {
                    const diaMedicamento = medicamento.dia;
                    return (
                      diaMedicamento >= dataFiltro.inicio &&
                      diaMedicamento <= dataFiltro.fim
                    );
                  },
                );
              }

              medicamentosFiltrados.sort((a, b) => {
                if (a.dia !== b.dia) {
                  return b.dia.localeCompare(a.dia);
                }
                return b.horario.localeCompare(a.horario);
              });

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

  const renderFiltros = () => {
    const filtros = [
      {key: 'todos', label: 'Todos', icon: 'infinite'},
      {key: 'hoje', label: 'Hoje', icon: 'today'},
      {key: 'semana', label: '7 dias', icon: 'calendar'},
      {key: 'mes', label: '30 dias', icon: 'calendar-outline'},
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtrosScrollContent}>
        {filtros.map(filtro => (
          <TouchableOpacity
            key={filtro.key}
            style={[
              styles.filtroButton,
              filtroSelecionado === filtro.key && styles.filtroButtonActive,
            ]}
            onPress={() => setFiltroSelecionado(filtro.key)}
            activeOpacity={0.8}>
            <Icon
              name={filtro.icon}
              size={16}
              color={filtroSelecionado === filtro.key ? '#FFFFFF' : '#64748b'}
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
    );
  };

  const renderMedicamentoItem = medicamento => {
    // Verificar se é medicamento não tomado
    const naoTomado = medicamento.status === 'nao_tomado';
    
    return (
      <View 
        key={medicamento.id} 
        style={[
          styles.medicamentoItem,
          naoTomado && styles.medicamentoItemNaoTomado
        ]}
      >
        <View style={[
          styles.medicamentoIconContainer,
          naoTomado && styles.medicamentoIconContainerNaoTomado
        ]}>
          <MaterialIcons 
            name="medication" 
            size={18} 
            color={naoTomado ? '#EF4444' : '#10B981'} 
          />
        </View>

        <View style={styles.medicamentoInfo}>
          <View style={styles.medicamentoHeader}>
            <Text style={styles.medicamentoNome} numberOfLines={1}>
              {medicamento.remedioNome}
            </Text>
            <Text style={[
              styles.medicamentoHorario,
              naoTomado && styles.medicamentoHorarioNaoTomado
            ]}>
              {medicamento.horarioAgendado || medicamento.horario}
            </Text>
          </View>
          <View style={styles.medicamentoFooter}>
            <Text style={styles.medicamentoDosagem}>
              Dosagem: {medicamento.dosagem}
            </Text>
            {naoTomado && (
              <View style={styles.naoTomadoBadge}>
                <Icon name="alert-circle" size={12} color="#EF4444" />
                <Text style={styles.naoTomadoText}>Não tomado</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[
          styles.statusBadge,
          naoTomado && styles.statusBadgeNaoTomado
        ]}>
          <Icon 
            name={naoTomado ? "close" : "checkmark"} 
            size={12} 
            color="#FFFFFF" 
          />
        </View>
      </View>
    );
  };

  const renderDiaGroup = (dia, medicamentos) => {
    // Calcular estatísticas do dia
    const totalMedicamentos = medicamentos.length;
    const medicamentosTomadosCount = medicamentos.filter(m => m.status !== 'nao_tomado').length;
    const medicamentosNaoTomadosCount = medicamentos.filter(m => m.status === 'nao_tomado').length;
    
    return (
      <View key={dia} style={styles.diaGroup}>
        <View style={styles.diaHeader}>
          <View style={styles.diaHeaderLeft}>
            <Icon name="calendar-outline" size={16} color="#F59E0B" />
            <Text style={styles.diaData}>{formatarData(dia)}</Text>
          </View>
          <View style={styles.diaStats}>
            {medicamentosTomadosCount > 0 && (
              <View style={styles.diaCounterBadge}>
                <Icon name="checkmark" size={10} color="#FFFFFF" />
                <Text style={styles.diaContador}>{medicamentosTomadosCount}</Text>
              </View>
            )}
            {medicamentosNaoTomadosCount > 0 && (
              <View style={styles.diaCounterBadgeNaoTomado}>
                <Icon name="close" size={10} color="#FFFFFF" />
                <Text style={styles.diaContador}>{medicamentosNaoTomadosCount}</Text>
              </View>
            )}
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
      <ActivityIndicator size="large" color="#10B981" />
      <Text style={styles.loadingText}>Carregando histórico...</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIconContainer}>
        <Icon name="document-text-outline" size={48} color="#64748b" />
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Histórico</Text>
          <Text style={styles.subtitle}>
            {dependente?.nome || dependente?.nomeCompleto || 'Dependente'}
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </Animated.View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          },
        ]}>
        <View style={styles.filtrosSection}>
          <View style={styles.sectionHeader}>
            <Icon name="filter" size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Filtrar por período</Text>
          </View>
          {renderFiltros()}
        </View>

        <View style={styles.historicoSection}>
          <View style={styles.sectionHeader}>
            <Icon name="time" size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Registros</Text>
          </View>

          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {diasOrdenados.length === 0
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
    backgroundColor: '#F59E0B',
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
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  headerSpacer: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  filtrosScrollContent: {
    gap: 8,
  },
  filtroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    gap: 6,
  },
  filtroButtonActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  filtroText: {
    fontSize: 14,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  emptyStateDescription: {
    fontSize: 16,
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
  },
  diaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  diaData: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  diaStats: {
    flexDirection: 'row',
    gap: 8,
  },
  diaCounterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  diaCounterBadgeNaoTomado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#EF4444',
    shadowOffset: {width: 0, height: 1},
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
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  medicamentoItemNaoTomado: {
    borderLeftColor: '#EF4444',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
  },
  medicamentoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicamentoIconContainerNaoTomado: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    flex: 1,
    marginRight: 8,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  medicamentoHorario: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  medicamentoHorarioNaoTomado: {
    color: '#EF4444',
  },
  medicamentoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicamentoDosagem: {
    fontSize: 14,
    color: '#94a3b8',
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  naoTomadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  naoTomadoText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  statusBadgeNaoTomado: {
    backgroundColor: '#EF4444',
  },
});

export default HistoricoMedicamentosScreen;