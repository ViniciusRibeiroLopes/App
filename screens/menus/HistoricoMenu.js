import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

// Breakpoints responsivos
const isSmallScreen = width < 360;

const HistoricoMenu = ({ navigation }) => {
  const [medicamentosTomados, setMedicamentosTomados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroSelecionado, setFiltroSelecionado] = useState('todos');
  const user = auth().currentUser;

  useEffect(() => {
    if (!user) return;
    carregarHistorico();
  }, [user, filtroSelecionado]);

  const carregarHistorico = async () => {
    setLoading(true);
    try {
      console.log('Carregando histórico para usuário:', user.uid);
      
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
          const data = { id: doc.id, ...doc.data() };
          console.log('Documento:', data);
          return data;
        });

        if (filtroSelecionado !== 'todos') {
          const dataFiltro = obterDataFiltro();
          console.log('Filtro de data:', dataFiltro);
          
          lista = lista.filter(medicamento => {
            const diaMedicamento = medicamento.dia;
            const passaFiltro = diaMedicamento >= dataFiltro.inicio && diaMedicamento <= dataFiltro.fim;
            console.log(`${diaMedicamento} passa no filtro (${dataFiltro.inicio} - ${dataFiltro.fim}):`, passaFiltro);
            return passaFiltro;
          });
        }

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

  const obterDataFiltro = () => {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    
    switch (filtroSelecionado) {
      case 'hoje':
        return {
          inicio: inicioHoje.toISOString().split('T')[0],
          fim: inicioHoje.toISOString().split('T')[0]
        };
      case 'ontem':
        const ontem = new Date(inicioHoje);
        ontem.setDate(ontem.getDate() - 1);
        return {
          inicio: ontem.toISOString().split('T')[0],
          fim: ontem.toISOString().split('T')[0]
        };
      case 'semana':
        const inicioSemana = new Date(inicioHoje);
        inicioSemana.setDate(inicioSemana.getDate() - 7);
        return {
          inicio: inicioSemana.toISOString().split('T')[0],
          fim: inicioHoje.toISOString().split('T')[0]
        };
      case 'mes':
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        return {
          inicio: inicioMes.toISOString().split('T')[0],
          fim: inicioHoje.toISOString().split('T')[0]
        };
      default:
        return { inicio: null, fim: null };
    }
  };

  const formatarData = (dataString) => {
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
      { key: 'todos', label: 'Todos' },
      { key: 'hoje', label: 'Hoje' },
      { key: 'semana', label: '7 dias' },
      { key: 'mes', label: '30 dias' }
    ];

    return (
      <View style={styles.filtrosContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filtros.map(filtro => (
            <TouchableOpacity
              key={filtro.key}
              style={[
                styles.filtroButton,
                filtroSelecionado === filtro.key && styles.filtroButtonActive
              ]}
              onPress={() => setFiltroSelecionado(filtro.key)}
            >
              <Text style={[
                styles.filtroText,
                filtroSelecionado === filtro.key && styles.filtroTextActive
              ]}>
                {filtro.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderMedicamentoItem = (medicamento) => {
    return (
      <View key={medicamento.id} style={styles.medicamentoItem}>
        <View style={styles.medicamentoInfo}>
          <View style={styles.medicamentoHeader}>
            <Text style={styles.medicamentoNome}>{medicamento.remedioNome}</Text>
            <Text style={styles.medicamentoHorario}>{medicamento.horario}</Text>
          </View>
          <Text style={styles.medicamentoDosagem}>Dosagem: {medicamento.dosagem}</Text>
        </View>
        <View style={styles.statusIndicator}>
          <Icon name="checkmark-circle" size={24} color="#10B981" />
        </View>
      </View>
    );
  };

  const renderDiaGroup = (dia, medicamentos) => {
    return (
      <View key={dia} style={styles.diaGroup}>
        <View style={styles.diaHeader}>
          <Text style={styles.diaData}>{formatarData(dia)}</Text>
          <Text style={styles.diaContador}>{medicamentos.length} medicamento{medicamentos.length !== 1 ? 's' : ''}</Text>
        </View>
        {medicamentos.map(medicamento => renderMedicamentoItem(medicamento))}
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
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="document-text" size={isSmallScreen ? 40 : 48} color="#8A8A8A" />
      </View>
      <Text style={styles.emptyTitle}>Nenhum registro encontrado</Text>
      <Text style={styles.emptyDescription}>
        {filtroSelecionado === 'hoje' 
          ? 'Você ainda não tomou nenhum medicamento hoje'
          : `Nenhum medicamento foi registrado no período selecionado`}
      </Text>
    </View>
  );

  const gruposPorDia = agruparPorDia();
  const diasOrdenados = Object.keys(gruposPorDia).sort((a, b) => b.localeCompare(a));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Histórico</Text>
            <Text style={styles.headerSubtitle}>Medicamentos tomados</Text>
          </View>
          
          <View style={styles.headerRight} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Filtros */}
        <View style={styles.filtrosWrapper}>
          {renderFiltros()}
        </View>

        {/* Lista de Histórico */}
        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {loading ? (
            renderLoadingState()
          ) : diasOrdenados.length === 0 ? (
            renderEmptyState()
          ) : (
            diasOrdenados.map(dia => renderDiaGroup(dia, gruposPorDia[dia]))
          )}
        </ScrollView>
      </View>
    </View>
  );
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
  },
  headerSubtitle: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#8A8A8A',
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
  filtrosWrapper: {
    marginBottom: 20,
  },
  filtrosContainer: {
    marginBottom: 10,
  },
  filtroButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filtroButtonActive: {
    backgroundColor: '#4D97DB',
    borderColor: '#4D97DB',
  },
  filtroText: {
    fontSize: 14,
    color: '#B0B7C3',
    fontWeight: '600',
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
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#b3b3b3ff',
    fontWeight: '500',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#3290e9b6',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#a2a6adff',
    textAlign: 'center',
    lineHeight: 22,
  },
  diaGroup: {
    marginBottom: 24,
  },
  diaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#121A29',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  diaData: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  diaContador: {
    fontSize: 14,
    color: '#B0B7C3',
    fontWeight: '600',
  },
  medicamentoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#121A29',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    elevation: 3,
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
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  medicamentoHorario: {
    fontSize: 14,
    color: '#4D97DB',
    fontWeight: '600',
  },
  medicamentoDosagem: {
    fontSize: 14,
    color: '#B0B7C3',
  },
  statusIndicator: {
    marginLeft: 12,
  },
});

export default HistoricoMenu;