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
  ActivityIndicator,
  StatusBar
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

// Breakpoints responsivos
const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

const RemediosScreen = ({ navigation }) => {
  const [remedios, setRemedios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTomarVisible, setModalTomarVisible] = useState(false);
  const [remedioParaExcluir, setRemedioParaExcluir] = useState(null);
  const [remedioParaTomar, setRemedioParaTomar] = useState(null);
  const [dosagemInput, setDosagemInput] = useState('');
  const user = auth().currentUser;

  const tipoIconMap = {
    'comprimido': { name: 'medical', color: '#E53E3E' },
    'capsula': { name: 'ellipse', color: '#4D97DB' },
    'xarope': { name: 'flask', color: '#9F7AEA' },
    'gotas': { name: 'water', color: '#38B2AC' },
    'pomada': { name: 'bandage', color: '#ED8936' },
    'injecao': { name: 'medical-outline', color: '#F56565' },
    'spray': { name: 'cloud', color: '#48BB78' },
    'outro': { name: 'help-circle', color: '#718096' }
  };

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
          usuarioId: user.uid,
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

  const getTipoIcon = (tipo) => {
    const tipoLower = tipo?.toLowerCase() || 'outro';
    return tipoIconMap[tipoLower] || tipoIconMap['outro'];
  };

  const formatarDataAtualizacao = (timestamp) => {
    if (!timestamp) return null;
    
    try {
      const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const agora = new Date();
      const diferenca = agora - data;
      const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
      
      if (dias === 0) {
        return 'Hoje';
      } else if (dias === 1) {
        return 'Ontem';
      } else if (dias < 7) {
        return `${dias} dias atrás`;
      } else {
        return data.toLocaleDateString('pt-BR');
      }
    } catch (error) {
      return null;
    }
  };

  const renderRemedioCard = (remedio, index) => {
    if (!remedio) return null;
    
    const tipoIcon = getTipoIcon(remedio.tipo);
    const dataAtualizacao = formatarDataAtualizacao(remedio.updatedAt);
    
    return (
      <View key={remedio.id} style={styles.remedioCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.medicineIcon}>
            <Icon name={tipoIcon.name} size={20} color={tipoIcon.color} />
          </View>
          
          <View style={styles.medicineDetails}>
            <Text style={styles.remedioNome}>{remedio.nome || 'Nome não informado'}</Text>
            <View style={styles.tipoContainer}>
              <Text style={[styles.tipoText, { color: tipoIcon.color }]}>
                {remedio.tipo ? remedio.tipo.charAt(0).toUpperCase() + remedio.tipo.slice(1) : 'Não informado'}
              </Text>
              {dataAtualizacao && (
                <Text style={styles.dataAtualizacao}>• {dataAtualizacao}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          {remedio.utilidade && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Função</Text>
              <Text style={styles.infoValue}>{remedio.utilidade}</Text>
            </View>
          )}

          {(remedio.quantidade || remedio.dosagem) && (
            <View style={styles.specificationsRow}>
              {remedio.quantidade && (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Quantidade</Text>
                  <Text style={styles.specValue}>{remedio.quantidade}</Text>
                </View>
              )}
              
              {remedio.dosagem && (
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Dosagem</Text>
                  <Text style={styles.specValue}>{remedio.dosagem}</Text>
                </View>
              )}
            </View>
          )}

          {remedio.observacoes && (
            <View style={styles.observacoesContainer}>
              <Text style={styles.observacoesLabel}>Observações</Text>
              <Text style={styles.observacoesText}>{remedio.observacoes}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.takenAction]}
            onPress={() => confirmarTomarRemedio(remedio)}
          >
            <Icon name="checkmark-circle-outline" size={18} color="#4D97DB" />
            <Text style={[styles.actionText, { color: '#4D97DB' }]}>Tomar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('AdicionarRemedio', { remedio })}
          >
            <Icon name="create-outline" size={16} color="#B0B7C3" />
            <Text style={styles.actionText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteAction]}
            onPress={() => confirmarExclusao(remedio)}
          >
            <Icon name="trash-outline" size={16} color="#E53E3E" />
            <Text style={[styles.actionText, { color: '#E53E3E' }]}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4D97DB" />
      <Text style={styles.loadingText}>Carregando medicamentos...</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <MaterialIcons name="medication" size={48} color="#8A8A8A" />
      </View>
      <Text style={styles.emptyTitle}>Nenhum remédio cadastrado</Text>
      <Text style={styles.emptyDescription}>
        Toque no botão + para adicionar seu primeiro medicamento
      </Text>
      <TouchableOpacity 
        style={styles.emptyActionButton}
        onPress={() => navigation.navigate('AdicionarRemedio')}
      >
        <Icon name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyActionButtonText}>Adicionar Remédio</Text>
      </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Meus Remédios</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AdicionarRemedio')}
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
        ) : (!remedios || remedios.length === 0) ? (
          renderEmptyState()
        ) : (
          remedios.map((remedio, index) => renderRemedioCard(remedio, index))
        )}
      </ScrollView>

      {/* Modal Excluir */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Icon name="warning" size={24} color="#E53E3E" />
            </View>
            
            <Text style={styles.modalTitle}>Excluir Remédio</Text>
            <Text style={styles.modalText}>
              Tem certeza que deseja excluir "{remedioParaExcluir?.nome}"?
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

      {/* Modal Tomar */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalTomarVisible}
        onRequestClose={() => setModalTomarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(77, 151, 219, 0.15)' }]}>
              <Icon name="medical" size={24} color="#4D97DB" />
            </View>
            
            <Text style={styles.modalTitle}>Tomar Remédio</Text>
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
                placeholderTextColor="#8A8A8A"
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
    backgroundColor: '#2b3241ff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121A29',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
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
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
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
  remedioCard: {
    backgroundColor: '#1E2329',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  medicineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  medicineDetails: {
    flex: 1,
  },
  remedioNome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tipoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dataAtualizacao: {
    fontSize: 12,
    color: '#8A8A8A',
    marginLeft: 8,
  },
  cardContent: {
    padding: 20,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8A8A8A',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  specificationsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  specItem: {
    flex: 1,
  },
  specLabel: {
    fontSize: 12,
    color: '#8A8A8A',
    marginBottom: 4,
    fontWeight: '500',
  },
  specValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  observacoesContainer: {
    marginBottom: 8,
  },
  observacoesLabel: {
    fontSize: 12,
    color: '#8A8A8A',
    marginBottom: 4,
    fontWeight: '500',
  },
  observacoesText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
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
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  takenAction: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.05)',
  },
  deleteAction: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionText: {
    fontSize: 13,
    color: '#B0B7C3',
    fontWeight: '500',
    marginLeft: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  modalContent: {
    backgroundColor: '#1E2329',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(229, 62, 62, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#B0B7C3',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalSubtext: {
    fontSize: 12,
    color: '#8A8A8A',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#B0B7C3',
    fontWeight: '500',
    fontSize: 14,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#E53E3E',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 14,
  },
  modalTomarButton: {
    flex: 1,
    backgroundColor: '#4D97DB',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalTomarText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 14,
  },
  dosagemContainer: {
    width: '100%',
    marginBottom: 10,
  },
  dosagemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  dosagemInput: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#FFFFFF',
  },
});

export default RemediosScreen;