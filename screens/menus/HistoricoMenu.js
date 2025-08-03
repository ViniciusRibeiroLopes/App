import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

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
          <Text style={styles.statusIcon}>✅</Text>
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

  const gruposPorDia = agruparPorDia();
  const diasOrdenados = Object.keys(gruposPorDia).sort((a, b) => b.localeCompare(a));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📋 Histórico</Text>
          <Text style={styles.headerSubtitle}>Medicamentos tomados</Text>
        </View>
        
        <View style={styles.headerRight} />
      </View>

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
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Carregando histórico...</Text>
          </View>
        ) : diasOrdenados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Nenhum registro encontrado</Text>
            <Text style={styles.emptyDescription}>
              {filtroSelecionado === 'hoje' 
                ? 'Você ainda não tomou nenhum medicamento hoje'
                : `Nenhum medicamento foi registrado no período selecionado`}
            </Text>
          </View>
        ) : (
          diasOrdenados.map(dia => renderDiaGroup(dia, gruposPorDia[dia]))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121a29',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#cbd5e0',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  filtrosWrapper: {
    paddingTop: 20,
  },
  filtrosContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filtroButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filtroButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filtroText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '600',
  },
  filtroTextActive: {
    color: '#fff',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 30,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#718096',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121a29',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: '#718096',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  diaData: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121a29',
  },
  diaContador: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '600',
  },
  medicamentoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
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
    color: '#121a29',
    flex: 1,
  },
  medicamentoHorario: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  medicamentoDosagem: {
    fontSize: 14,
    color: '#718096',
  },
  statusIndicator: {
    marginLeft: 12,
  },
  statusIcon: {
    fontSize: 20,
  },
});

export default HistoricoMenu;