import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const Dependentes = ({ navigation }) => {
  const [dependentes, setDependentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth().currentUser;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = firestore()
      .collection('users_dependentes')
      .where('usuarioId', '==', user.uid)
      .onSnapshot(
        snapshot => {
          if (!snapshot) {
            console.warn('Snapshot vazio');
            setLoading(false);
            return;
          }

          const lista = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setDependentes(lista);
          setLoading(false);
        },
        error => {
          console.error('Erro ao buscar dependentes:', error);
          Alert.alert('Erro', 'Não foi possível carregar os dependentes.');
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [user]);

  const handleAdicionarDependente = () => {
    navigation.navigate('AdicionarDependente');
  };

  const handleEditarDependente = (dependente) => {
    navigation.navigate('AdicionarDependente', { dependente });
  };

  const handleRemoverDependente = async (dependenteId) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja remover este dependente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection('users_dependentes')
                .doc(dependenteId)
                .delete();
              
              Alert.alert('Sucesso', 'Dependente removido com sucesso!');
            } catch (error) {
              console.error('Erro ao remover dependente:', error);
              Alert.alert('Erro', 'Não foi possível remover o dependente.');
            }
          }
        }
      ]
    );
  };

  const getAvatar = (genero, idade) => {
    if (idade < 18) {
      return genero === 'masculino' ? '👦' : '👧';
    } else if (idade < 60) {
      return genero === 'masculino' ? '👨' : '👩';
    } else {
      return genero === 'masculino' ? '👴' : '👵';
    }
  };

  const calcularIdade = (dataNascimento) => {
    if (!dataNascimento) return 0;
    
    const hoje = new Date();
    const nascimento = dataNascimento.toDate ? dataNascimento.toDate() : new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    
    return idade;
  };

  const renderDependenteCard = (dependente) => {
    const idade = calcularIdade(dependente.dataNascimento);
    const avatar = getAvatar(dependente.genero, idade);

    return (
      <TouchableOpacity 
        key={dependente.id} 
        style={styles.dependenteCard}
        onPress={() => navigation.navigate('IndexDependentes', {dependenteId: dependente.id})}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>{avatar}</Text>
          </View>
          
          <View style={styles.dependenteInfo}>
            <Text style={styles.nomeDependente}>{dependente.nome}</Text>
            <Text style={styles.parentesco}>
              {dependente.parentesco} • {idade} anos
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => handleEditarDependente(dependente)}
          >
            <Text style={styles.moreButtonText}>⋯</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyIcon}>👥</Text>
      </View>
      <Text style={styles.emptyTitle}>Nenhum dependente cadastrado</Text>
      <Text style={styles.emptyDescription}>
        Adicione familiares ou pessoas sob seus cuidados para gerenciar seus medicamentos
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#121a29" />
      <Text style={styles.loadingText}>Carregando dependentes...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121a29" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>👥 Dependentes</Text>
          <Text style={styles.headerSubtitle}>
            {dependentes.length} {dependentes.length === 1 ? 'pessoa' : 'pessoas'} sob seus cuidados
          </Text>
        </View>
      </View>

      {/* Lista de Dependentes */}
      <View style={styles.contentContainer}>
        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {loading ? (
            renderLoadingState()
          ) : dependentes.length > 0 ? (
            <View style={styles.dependentesContainer}>
              <Text style={styles.sectionTitle}>Seus Dependentes</Text>
              {dependentes.map(renderDependenteCard)}
            </View>
          ) : (
            renderEmptyState()
          )}
        </ScrollView>

        {/* Botão Flutuante para Adicionar */}
        <View style={styles.fabContainer}>
          <TouchableOpacity 
            style={styles.fabButton}
            onPress={handleAdicionarDependente}
            activeOpacity={0.8}
          >
            <Text style={styles.fabButtonIcon}>+</Text>
            <Text style={styles.fabButtonText}>Adicionar Dependente</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 50,
    paddingBottom: 25,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#cbd5e0',
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121a29',
    marginBottom: 15,
  },
  dependentesContainer: {
    flex: 1,
  },
  dependenteCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    fontSize: 32,
    width: 50,
    height: 50,
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 50,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusAtivo: {
    backgroundColor: '#4CAF50',
  },
  statusInativo: {
    backgroundColor: '#ff4757',
  },
  dependenteInfo: {
    flex: 1,
  },
  nomeDependente: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121a29',
    marginBottom: 3,
  },
  parentesco: {
    fontSize: 13,
    color: '#718096',
  },
  moreButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButtonText: {
    fontSize: 18,
    color: '#718096',
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121a29',
    marginBottom: 2,
  },
  statTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#718096',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 25,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtonIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#121a29',
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
  emptyIconContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#f8f9fa',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#121a29',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'transparent',
  },
  fabButton: {
    backgroundColor: '#121a29',
    borderRadius: 25,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabButtonIcon: {
    fontSize: 18,
    color: '#fff',
    marginRight: 8,
    fontWeight: '600',
  },
  fabButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export default Dependentes;