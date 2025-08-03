import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Dimensions,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

const { width } = Dimensions.get('window');

const Index = ({ navigation }) => {
  const [avisos, setAvisos] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    medicamentosAtivos: 0,
    alertasHoje: 0,
    dependentes: 0
  });
  
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
          setStats(prev => ({ ...prev, medicamentosAtivos: lista.length }));
          setLoading(false);
        },
        error => {
          console.error('Erro ao buscar medicamentos:', error);
          Alert.alert('Erro', 'Não foi possível carregar os dados.');
          setLoading(false);
        }
      );

    const unsubscribeDependentes = firestore()
      .collection('dependentes')
      .where('usuarioId', '==', user.uid)
      .onSnapshot(snapshot => {
        setStats(prev => ({ ...prev, dependentes: snapshot?.docs?.length || 0 }));
      });

    return () => {
      unsubscribe();
      unsubscribeDependentes();
    };
  }, [user]);

  const handleLogout = async () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await auth().signOut();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível sair da conta.');
            }
          }
        }
      ]
    );
  };

  const renderAvisoItem = (aviso) => (
    <TouchableOpacity key={aviso.id} style={styles.avisoCard}>
      <View style={styles.avisoHeader}>
        <View style={[styles.avisoIconContainer, { backgroundColor: getPrioridadeCor(aviso.prioridade) + '20' }]}>
          <Icon 
            name={getTipoIcon(aviso.tipo)} 
            size={20} 
            color={getPrioridadeCor(aviso.prioridade)} 
          />
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
      <View style={styles.emptyStateIconContainer}>
        <Icon name="notifications-off" size={48} color="#8A8A8A" />
      </View>
      <Text style={styles.emptyStateTitle}>Nenhum aviso encontrado</Text>
      <Text style={styles.emptyStateDescription}>
        Você não possui avisos ou notificações no momento.
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4D97DB" />
      <Text style={styles.loadingText}>Carregando avisos...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>PillCheck</Text>
            <Text style={styles.subtitle}>Olá, {user?.displayName || user?.email?.split('@')[0] || 'Usuário'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="log-out-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('AlertasMenu')}
          >
            <View style={styles.quickActionIcon}>
              <Icon name="alarm" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionText}>Alarmes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('RemediosMenu')}
          >
            <View style={styles.quickActionIcon}>
              <MaterialIcons name="medication" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionText}>Remédios</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('DependentesMenu')}
          >
            <View style={styles.quickActionIcon}>
              <FontAwesome5 name="user-friends" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionText}>Dependentes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('HistoricoMenu')}
          >
            <View style={styles.quickActionIcon}>
              <Icon name="bar-chart" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionText}>Histórico</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.avisosSection}>
        <View style={styles.avisosSectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Icon name="notifications" size={20} color="#ffffffb6" />
            <Text style={styles.avisosSectionTitle}>Avisos e Notificações</Text>
          </View>
          <TouchableOpacity style={styles.verTodosButton}>
            <Text style={styles.verTodosText}>Ver todos</Text>
            <Icon name="chevron-forward" size={14} color="#ffffffff" />
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
    backgroundColor: '#2b3241ff',
  },
  header: {
    backgroundColor: '#121A29',
    paddingHorizontal: 24,
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
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#8A8A8A',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#d03d6298',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ce224d98',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(228, 161, 161, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  avisosSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 25,
  },
  avisosSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avisosSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffffb6',
  },
  verTodosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4d96dbb6',
    borderRadius: 16,
    gap: 4,
  },
  verTodosText: {
    fontSize: 12,
    color: '#ffffffff',
    fontWeight: '600',
  },
  avisosScrollView: {
    flex: 1,
  },
  avisoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4D97DB',
  },
  avisoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avisoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avisoContent: {
    flex: 1,
  },
  avisoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121A29',
    marginBottom: 4,
  },
  avisoDescricao: {
    fontSize: 14,
    color: '#6B7280',
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
    color: '#9CA3AF',
    fontWeight: '500',
  },
  prioridadeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  prioridadeText: {
    fontSize: 10,
    color: '#FFFFFF',
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
    color: '#b3b3b3ff',
    fontWeight: '500',
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
    backgroundColor: '#F1F3F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3290e9b6',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#a2a6adff',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
});

export default Index;