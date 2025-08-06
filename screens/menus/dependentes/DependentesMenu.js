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
  Dimensions,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 360;

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

  const getAvatarColor = (genero) => {
    return genero === 'masculino' ? '#4D97DB' : '#9F7AEA';
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
    const avatarColor = getAvatarColor(dependente.genero);

    return (
      <View key={dependente.id} style={styles.dependenteCard}>
        <View 
          style={styles.cardContent}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.avatarContainer, { backgroundColor: `${avatarColor}20` }]}>
              <Text style={styles.avatar}>{avatar}</Text>
            </View>
            
            <View style={styles.dependenteInfo}>
              <Text style={styles.nomeDependente}>{dependente.nome}</Text>
              <View style={styles.parentescoContainer}>
                <Text style={styles.parentesco}>{dependente.parentesco}</Text>
                <Text style={styles.idade}>• {idade} anos</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('IndexDependentes', {dependenteId: dependente.id})}
          >
            <Icon name="medical-outline" size={16} color="#4D97DB" />
            <Text style={[styles.actionText, { color: '#4D97DB' }]}>Administrar</Text>
          </TouchableOpacity>

          {/*<TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEditarDependente(dependente)}
          >
            <Icon name="create-outline" size={16} color="#B0B7C3" />
            <Text style={styles.actionText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteAction]}
            onPress={() => handleRemoverDependente(dependente.id)}
          >
            <Icon name="trash-outline" size={16} color="#E53E3E" />
            <Text style={[styles.actionText, { color: '#E53E3E' }]}>Remover</Text>
          </TouchableOpacity>*/}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="people" size={48} color="#8A8A8A" />
      </View>
      <Text style={styles.emptyTitle}>Nenhum dependente cadastrado</Text>
      <Text style={styles.emptyDescription}>
        Adicione familiares ou pessoas sob seus cuidados para gerenciar seus medicamentos
      </Text>
      <TouchableOpacity 
        style={styles.emptyActionButton}
        onPress={handleAdicionarDependente}
      >
        <Icon name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyActionButtonText}>Adicionar Dependente</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4D97DB" />
      <Text style={styles.loadingText}>Carregando dependentes...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Dependentes</Text>
          <Text style={styles.headerSubtitle}>
            Veja seus familiares sob seus cuidados
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAdicionarDependente}
        >
          <Icon name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          renderLoadingState()
        ) : dependentes.length > 0 ? (
          <View style={styles.dependentesContainer}>
            {dependentes.map(renderDependenteCard)}
          </View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2b3241ff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121A29',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8A8A8A',
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4D97DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  dependentesContainer: {
    flex: 1,
  },
  dependenteCard: {
    backgroundColor: '#1E2329',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatar: {
    fontSize: 24,
  },
  dependenteInfo: {
    flex: 1,
  },
  nomeDependente: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  parentescoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  parentesco: {
    fontSize: 14,
    color: '#4D97DB',
    fontWeight: '500',
  },
  idade: {
    fontSize: 14,
    color: '#8A8A8A',
    marginLeft: 4,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.05)',
  },
  deleteAction: {
    borderRightWidth: 0,
  },
  actionText: {
    fontSize: 13,
    color: '#B0B7C3',
    fontWeight: '500',
    marginLeft: 6,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#8A8A8A',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4D97DB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default Dependentes;