import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const { width } = Dimensions.get('window');

const Index = ({ navigation }) => {
  const [avisos, setAvisos] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth().currentUser;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = firestore()
      .collection('remedios')
      .where('usuarioId', '==', user.uid)
      .onSnapshot(
        snapshot => {
          if (!snapshot || !snapshot.docs) {
            console.warn('Snapshot vazio ou inválido');
            setLoading(false);
            return;
          }

          const lista = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMedicamentos(lista);
          setLoading(false);
        },
        error => {
          console.error('Erro ao buscar medicamentos:', error);
          Alert.alert('Erro', 'Não foi possível carregar os dados.');
          setLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await auth().signOut();
      Alert.alert('Sucesso', 'Você saiu da conta.');
    } catch (error) {
      Alert.alert('Erro ao sair');
    }
  };

  const getPrioridadeCor = (prioridade) => {
    switch (prioridade) {
      case 'alta': return '#ff4757';
      case 'media': return '#ffa502';
      case 'baixa': return '#2ed573';
      default: return '#747d8c';
    }
  };

  const renderAvisoItem = (aviso) => (
    <TouchableOpacity key={aviso.id} style={styles.avisoCard}>
      <View style={styles.avisoHeader}>
        <View style={styles.avisoIconContainer}>
          <Text style={styles.avisoIcon}>{aviso.icone}</Text>
        </View>
        <View style={styles.avisoContent}>
          <Text style={styles.avisoTitulo}>{aviso.titulo}</Text>
          <Text style={styles.avisoDescricao}>{aviso.descricao}</Text>
          <View style={styles.avisoFooter}>
            <Text style={styles.avisoData}>{aviso.data}</Text>
            <View style={[styles.prioridadeBadge, { backgroundColor: getPrioridadeCor(aviso.prioridade) }]}>
              <Text style={styles.prioridadeText}>
                {aviso.prioridade.charAt(0).toUpperCase() + aviso.prioridade.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyStateIcon}>📭</Text>
      <Text style={styles.emptyStateTitle}>Nenhum aviso encontrado</Text>
      <Text style={styles.emptyStateDescription}>
        Você não possui avisos ou notificações no momento.
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#121a29" />
      <Text style={styles.loadingText}>Carregando avisos...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>💊 PillCheck</Text>
            <Text style={styles.subtitle}>Olá, {user?.email?.split('@')[0] || 'Usuário'} 👋</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>

        {/* Botões de Ação Rápida - Estilo Bancário */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('AlertasMenu')}
          >
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionIconText}>⏰</Text>
            </View>
            <Text style={styles.quickActionText}>Alarmes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('RemediosMenu')}
          >
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionIconText}>💊</Text>
            </View>
            <Text style={styles.quickActionText}>Remédios</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('DependentesMenu')}
          >
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionIconText}>🩺</Text>
            </View>
            <Text style={styles.quickActionText}>Dependentes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('HistoricoMenu')}
          >
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionIconText}>📊</Text>
            </View>
            <Text style={styles.quickActionText}>Histórico</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de Avisos */}
      <View style={styles.avisosSection}>
        <View style={styles.avisosSectionHeader}>
          <Text style={styles.avisosSectionTitle}>📢 Avisos e Notificações</Text>
          <TouchableOpacity style={styles.verTodosButton}>
          </TouchableOpacity>
        </View>

        {loading ? (
          renderLoadingState()
        ) : (
          <ScrollView 
            style={styles.avisosScrollView}
            showsVerticalScrollIndicator={false}
          >
            {avisos.length > 0 ? avisos.map(renderAvisoItem) : renderEmptyState()}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#121a29',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#cbd5e0',
  },
  logoutButton: {
    backgroundColor: '#ffffff15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ffffff15',
    paddingVertical: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff25',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionIconText: {
    fontSize: 18,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -15,
    marginBottom: 20,
    gap: 12,
  },
  statusCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statusNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#121a29',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
  },
  avisosSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  avisosSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  avisosSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121a29',
  },
  verTodosButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
  },
  verTodosText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
  },
  avisosScrollView: {
    flex: 1,
  },
  avisoCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#121a29',
  },
  avisoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avisoIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avisoIcon: {
    fontSize: 20,
  },
  avisoContent: {
    flex: 1,
  },
  avisoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121a29',
    marginBottom: 4,
  },
  avisoDescricao: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
    marginBottom: 12,
  },
  avisoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avisoData: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  prioridadeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  prioridadeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
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
    color: '#718096',
    fontWeight: '500',
  },

  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#121a29',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#121a29',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  adicionarAvisoButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 15,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  adicionarAvisoText: {
    color: '#718096',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Index;