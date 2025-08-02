import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const HistoricoMedicamentosScreen = ({ navigation, route }) => {
  const [medicamentosTomados, setMedicamentosTomados] = useState([]);
  const [dependente, setDependente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroSelecionado, setFiltroSelecionado] = useState('todos');
  const user = auth().currentUser;
  const { dependenteId } = route.params || {};

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
            ...dependenteDoc.data()
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
        Alert.alert('Erro', 'Não foi possível carregar os dados do dependente.');
        navigation.goBack();
        return null;
      }
    };

    // Buscar histórico de medicamentos tomados
    const buscarHistorico = async (dependenteData) => {
      if (!dependenteData) {
        setLoading(false);
        return;
      }

      const unsubscribe = firestore()
        .collection('medicamentos_tomados_dependentes')
        .where('usuarioId', '==', user.uid)
        .orderBy('dia', 'desc')
        .orderBy('horario', 'desc')
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
                ...doc.data()
              }));

              const medicamentosComDetalhes = await Promise.all(
                medicamentosData.map(async (medicamento) => {
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
                    nomeRemedio,
                    nomeDependente: dependenteData.nome || dependenteData.nomeCompleto || 'Dependente'
                  };
                })
              );

              setMedicamentosTomados(medicamentosComDetalhes);
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
          }
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
  }, [user, dependenteId]);

  const formatarData = (dataString) => {
    try {
      const [ano, mes, dia] = dataString.split('-');
      const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      
      const hoje = new Date();
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      
      if (data.toDateString() === hoje.toDateString()) {
        return 'Hoje';
      } else if (data.toDateString() === ontem.toDateString()) {
        return 'Ontem';
      } else {
        return data.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long'
        });
      }
    } catch (error) {
      return dataString;
    }
  };

  const filtrarMedicamentos = () => {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - 7);
    const inicioMes = new Date(hoje);
    inicioMes.setDate(hoje.getDate() - 30);

    return medicamentosTomados.filter(medicamento => {
      if (filtroSelecionado === 'todos') return true;
      
      try {
        const [ano, mes, dia] = medicamento.dia.split('-');
        const dataMedicamento = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        
        switch (filtroSelecionado) {
          case 'hoje':
            return dataMedicamento >= inicioHoje;
          case 'semana':
            return dataMedicamento >= inicioSemana;
          case 'mes':
            return dataMedicamento >= inicioMes;
          default:
            return true;
        }
      } catch (error) {
        console.error('Erro ao filtrar data:', error);
        return true;
      }
    });
  };

  const agruparPorDia = (medicamentos) => {
    const grupos = {};
    
    medicamentos.forEach(medicamento => {
      const dia = medicamento.dia;
      if (!grupos[dia]) {
        grupos[dia] = [];
      }
      grupos[dia].push(medicamento);
    });

    // Converter para array e ordenar por data
    return Object.keys(grupos)
      .sort((a, b) => new Date(b) - new Date(a))
      .map(dia => ({
        dia,
        medicamentos: grupos[dia].sort((a, b) => b.horario.localeCompare(a.horario))
      }));
  };

  const renderFiltros = () => (
    <View style={styles.filtrosWrapper}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtrosContainer}
      >
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'hoje', label: 'Hoje' },
          { key: 'semana', label: '7 dias' },
          { key: 'mes', label: '30 dias' }
        ].map(filtro => (
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

  const renderMedicamentoItem = (medicamento) => (
    <View key={medicamento.id} style={styles.medicamentoItem}>
      <View style={styles.medicamentoInfo}>
        <View style={styles.medicamentoHeader}>
          <Text style={styles.medicamentoNome}>{medicamento.nomeRemedio}</Text>
          <Text style={styles.medicamentoHorario}>{medicamento.horario}</Text>
        </View>
        <Text style={styles.medicamentoDosagem}>Dosagem: {medicamento.dosagem}</Text>
      </View>
      <View style={styles.statusIndicator}>
        <Text style={styles.statusIcon}>✅</Text>
      </View>
    </View>
  );

  const renderDiaGroup = (grupo) => (
    <View key={grupo.dia} style={styles.diaGroup}>
      <View style={styles.diaHeader}>
        <Text style={styles.diaData}>{formatarData(grupo.dia)}</Text>
        <Text style={styles.diaContador}>
          {grupo.medicamentos.length} medicamento{grupo.medicamentos.length !== 1 ? 's' : ''}
        </Text>
      </View>
      {grupo.medicamentos.map(renderMedicamentoItem)}
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#121a29" />
      <Text style={styles.loadingText}>Carregando histórico...</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>Nenhum medicamento no histórico</Text>
      <Text style={styles.emptyDescription}>
        Os medicamentos tomados por {dependente?.nome || dependente?.nomeCompleto} aparecerão aqui
      </Text>
    </View>
  );

  const medicamentosFiltrados = filtrarMedicamentos();
  const gruposPorDia = agruparPorDia(medicamentosFiltrados);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📊 Histórico</Text>
          <Text style={styles.headerSubtitle}>
            {dependente?.nome || dependente?.nomeCompleto || 'Dependente'}
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          {/* Espaço reservado para manter alinhamento */}
        </View>
      </View>

      {renderFiltros()}

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          renderLoadingState()
        ) : gruposPorDia.length === 0 ? (
          renderEmptyState()
        ) : (
          gruposPorDia.map(renderDiaGroup)
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

export default HistoricoMedicamentosScreen;