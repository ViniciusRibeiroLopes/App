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

const HistoricoMenu = ({navigation}) => {
  const [medicamentosTomados, setMedicamentosTomados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroSelecionado, setFiltroSelecionado] = useState('todos');

  const user = auth().currentUser;

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
    if (!user) return;
    carregarHistorico();
  }, [user, filtroSelecionado]);

  const carregarHistorico = async () => {
    setLoading(true);
    try {
      const snapshot = await firestore()
        .collection('medicamentos_tomados')
        .where('usuarioId', '==', user.uid)
        .get();

      if (snapshot.empty) {
        setMedicamentosTomados([]);
      } else {
        let lista = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Aplicar filtro de período
        if (filtroSelecionado !== 'todos') {
          const dataFiltro = obterDataFiltro();
          lista = lista.filter(medicamento => {
            const diaMedicamento = medicamento.dia;
            return (
              diaMedicamento >= dataFiltro.inicio &&
              diaMedicamento <= dataFiltro.fim
            );
          });
        }

        // Ordenar por data e horário
        lista.sort((a, b) => {
          if (a.dia !== b.dia) {
            return b.dia.localeCompare(a.dia);
          }
          return b.horario.localeCompare(a.horario);
        });

        setMedicamentosTomados(lista);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico.');
    } finally {
      setLoading(false);
    }
  };

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

  // ⭐ MODIFICADO: Renderizar item com suporte a "não tomado"
  const renderMedicamentoItem = medicamento => {
    const foiTomado = medicamento.status === 'tomado' || !medicamento.status;
    const naoFoiTomado = medicamento.status === 'nao_tomado';

    return (
      <View
        key={medicamento.id}
        style={[
          styles.medicamentoItem,
          naoFoiTomado && styles.medicamentoItemNaoTomado,
        ]}>
        <View
          style={[
            styles.medicamentoIconContainer,
            naoFoiTomado && styles.medicamentoIconContainerDanger,
          ]}>
          <MaterialIcons
            name="medication"
            size={18}
            color={naoFoiTomado ? '#EF4444' : '#10B981'}
          />
        </View>

        <View style={styles.medicamentoInfo}>
          <View style={styles.medicamentoHeader}>
            <Text style={styles.medicamentoNome} numberOfLines={1}>
              {medicamento.remedioNome}
            </Text>
            <Text
              style={[
                styles.medicamentoHorario,
                naoFoiTomado && styles.medicamentoHorarioDanger,
              ]}>
              {medicamento.horario}
            </Text>
          </View>

          <View style={styles.medicamentoFooter}>
            <Text style={styles.medicamentoDosagem}>
              Dosagem: {medicamento.dosagem}
            </Text>

            {/* ⭐ Badge de status */}
            {naoFoiTomado && (
              <View style={styles.statusTextBadge}>
                <Icon name="alert-circle" size={12} color="#EF4444" />
                <Text style={styles.statusTextBadgeText}>Não tomado</Text>
              </View>
            )}
          </View>
        </View>

        {/* ⭐ Badge visual de status */}
        <View
          style={[
            styles.statusBadge,
            naoFoiTomado && styles.statusBadgeDanger,
          ]}>
          <Icon
            name={naoFoiTomado ? 'close' : 'checkmark'}
            size={12}
            color="#FFFFFF"
          />
        </View>
      </View>
    );
  };

  const renderDiaGroup = (dia, medicamentos) => {
    // ⭐ Calcular contadores por dia
    const tomadosNoDia = medicamentos.filter(
      m => m.status === 'tomado' || !m.status,
    ).length;
    const naoTomadosNoDia = medicamentos.filter(
      m => m.status === 'nao_tomado',
    ).length;

    return (
      <View key={dia} style={styles.diaGroup}>
        <View style={styles.diaHeader}>
          <View style={styles.diaHeaderLeft}>
            <Icon name="calendar-outline" size={16} color="#F59E0B" />
            <Text style={styles.diaData}>{formatarData(dia)}</Text>
          </View>

          {/* ⭐ Mostrar contadores separados */}
          <View style={styles.diaCounterContainer}>
            {tomadosNoDia > 0 && (
              <View style={styles.diaCounterBadge}>
                <Icon name="checkmark" size={10} color="#FFFFFF" />
                <Text style={styles.diaContador}>{tomadosNoDia}</Text>
              </View>
            )}
            {naoTomadosNoDia > 0 && (
              <View style={[styles.diaCounterBadge, styles.diaCounterBadgeDanger]}>
                <Icon name="close" size={10} color="#FFFFFF" />
                <Text style={styles.diaContador}>{naoTomadosNoDia}</Text>
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
          ? 'Você ainda não tomou nenhum medicamento hoje'
          : 'Nenhum medicamento foi registrado no período selecionado'}
      </Text>
    </View>
  );

  const gruposPorDia = agruparPorDia();
  const diasOrdenados = Object.keys(gruposPorDia).sort((a, b) =>
    b.localeCompare(a),
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
            transform: [{translateY: slideUpAnim}],
          },
        ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Histórico</Text>
          <Text style={styles.subtitle}>Medicamentos tomados</Text>
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
  // ⭐ NOVOS ESTILOS: Contadores separados por status
  diaCounterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  diaCounterBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  diaCounterBadgeDanger: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
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
  // ⭐ NOVOS ESTILOS: Variante para não tomado
  medicamentoItemNaoTomado: {
    borderLeftColor: '#EF4444',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
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
  medicamentoIconContainerDanger: {
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
  medicamentoHorarioDanger: {
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
  // ⭐ NOVOS ESTILOS: Badge de texto "Não tomado"
  statusTextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTextBadgeText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
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
  statusBadgeDanger: {
    backgroundColor: '#EF4444',
  },
});

export default HistoricoMenu;