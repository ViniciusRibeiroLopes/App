import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const { width } = Dimensions.get('window');

const RemediosScreen = ({ navigation }) => {
  const [remedios, setRemedios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTomarVisible, setModalTomarVisible] = useState(false);
  const [remedioParaExcluir, setRemedioParaExcluir] = useState(null);
  const [remedioParaTomar, setRemedioParaTomar] = useState(null);
  const [dosagemInput, setDosagemInput] = useState('');
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
          try {
            if (!snapshot || !snapshot.docs) {
              console.warn('Snapshot vazio ou inválido');
              setLoading(false);
              return;
            }

            const lista = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setRemedios(lista);
            setLoading(false);
          } catch (error) {
            console.error('Erro ao processar medicamentos:', error);
            Alert.alert('Erro', 'Não foi possível processar os dados.');
            setLoading(false);
          }
        },
        error => {
          console.error('Erro ao buscar medicamentos:', error);
          Alert.alert('Erro', 'Não foi possível carregar os dados.');
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [user]);

  const confirmarExclusao = (remedio) => {
    setRemedioParaExcluir(remedio);
    setModalVisible(true);
  };

  const excluirRemedio = async () => {
    try {
      await firestore()
        .collection('remedios')
        .doc(remedioParaExcluir.id)
        .delete();
      
      setModalVisible(false);
      setRemedioParaExcluir(null);
      Alert.alert('Sucesso', 'Remédio excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir remédio:', error);
      Alert.alert('Erro', 'Não foi possível excluir o remédio.');
    }
  };

  const confirmarTomarRemedio = (remedio) => {
    setRemedioParaTomar(remedio);
    setDosagemInput(remedio.dosagem || "1");
    setModalTomarVisible(true);
  };

  const marcarComoTomado = async () => {
    try {
      const agora = new Date();
      const dia = agora.toISOString().split('T')[0];
      const horario = agora.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      await firestore()
        .collection('medicamentos_tomados')
        .add({
          dia: dia,
          dosagem: dosagemInput || "1",
          horario: horario,
          remedioId: remedioParaTomar.id,
          remedioNome: remedioParaTomar.nome,
          usuarioId: user.uid
        });
      
      setModalTomarVisible(false);
      setRemedioParaTomar(null);
      setDosagemInput('');
      
      Alert.alert(
        'Registrado!', 
        `${remedioParaTomar.nome} foi marcado como tomado às ${horario}\nDosagem: ${dosagemInput}`
      );
    } catch (error) {
      console.error('Erro ao registrar medicamento tomado:', error);
      Alert.alert('Erro', 'Não foi possível registrar que o medicamento foi tomado.');
    }
  };

  const renderRemedioCard = (remedio, index) => {
    if (!remedio) return null;
    
    return (
      <View key={remedio.id} style={[styles.remedioCard, { borderLeftColor: "#4CAF50" }]}>
        <View style={styles.remedioHeader}>
          <View style={styles.remedioTitleContainer}>
            <Text style={styles.remedioNome}>{remedio.nome || 'Nome não informado'}</Text>
            <Text style={styles.remedioUtilidade}>{remedio.utilidade || 'Utilidade não informada'}</Text>
          </View>
        </View>

        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={[styles.quickAction, styles.takenAction]}
            onPress={() => confirmarTomarRemedio(remedio)}
          >
            <Text style={styles.quickActionIcon}>💊</Text>
            <Text style={styles.quickActionText}>Tomar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('AdicionarRemedio', { remedio })}
          >
            <Text style={styles.quickActionIcon}>✏️</Text>
            <Text style={styles.quickActionText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => confirmarExclusao(remedio)}
          >
            <Text style={styles.quickActionIcon}>🗑️</Text>
            <Text style={styles.quickActionText}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#121a29" />
      <Text style={styles.loadingText}>Carregando medicamentos...</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💊</Text>
      <Text style={styles.emptyTitle}>Nenhum remédio cadastrado</Text>
      <Text style={styles.emptyDescription}>
        Toque no botão + para adicionar seu primeiro medicamento e começar a configurar alertas
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => navigation.navigate('AdicionarRemedio')}
      >
        <Text style={styles.emptyButtonText}>+ Adicionar Primeiro Remédio</Text>
      </TouchableOpacity>
    </View>
  );

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
          <Text style={styles.headerTitle}>💊 Meus Remédios</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? 'Carregando...' : `${remedios?.length || 0} medicamentos cadastrados`}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AdicionarRemedio')}
        >
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Remédios */}
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          renderLoadingState()
        ) : (!remedios || remedios.length === 0) ? (
          renderEmptyState()
        ) : (
          remedios.map((remedio, index) => renderRemedioCard(remedio, index))
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Excluir Remédio</Text>
            <Text style={styles.modalText}>
              Tem certeza que deseja excluir "{remedioParaExcluir?.nome}"?
            </Text>
            <Text style={styles.modalSubtext}>
              Esta ação também removerá todos os alertas relacionados a este medicamento.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={excluirRemedio}
              >
                <Text style={styles.modalConfirmText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmação para Tomar Remédio */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalTomarVisible}
        onRequestClose={() => setModalTomarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💊 Tomar Remédio</Text>
            <Text style={styles.modalText}>
              Confirma que tomou "{remedioParaTomar?.nome}"?
            </Text>
            
            <View style={styles.dosagemContainer}>
              <Text style={styles.dosagemLabel}>Dosagem:</Text>
              <TextInput
                style={styles.dosagemInput}
                value={dosagemInput}
                onChangeText={setDosagemInput}
                placeholder="Ex: 1 comprimido"
                placeholderTextColor="#999"
              />
            </View>
            
            <Text style={styles.modalSubtext}>
              Horário: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => {
                  setModalTomarVisible(false);
                  setDosagemInput('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalTomarButton}
                onPress={marcarComoTomado}
              >
                <Text style={styles.modalTomarText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 30,
  },
  // Estilos para Loading
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
  remedioCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  remedioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  remedioTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  remedioNome: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121a29',
    marginBottom: 6,
  },
  remedioUtilidade: {
    fontSize: 15,
    color: '#718096',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  takenAction: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },
  quickActionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  quickActionText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '600',
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
    marginBottom: 30,
  },
  emptyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121a29',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#718096',
    fontWeight: '600',
    fontSize: 16,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalTomarButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalTomarText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  dosagemContainer: {
    marginVertical: 20,
  },
  dosagemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121a29',
    marginBottom: 8,
  },
  dosagemInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#121a29',
  },
});

export default RemediosScreen;