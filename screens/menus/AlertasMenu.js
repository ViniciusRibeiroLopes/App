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
  ActivityIndicator,
  StatusBar
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import notifee from '@notifee/react-native';

const { width, height } = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

const AlertasScreen = ({ navigation }) => {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [alertaParaExcluir, setAlertaParaExcluir] = useState(null);
  const user = auth().currentUser;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = firestore()
      .collection('alertas')
      .where('usuarioId', '==', user.uid)
      .orderBy('horario')
      .onSnapshot(
        async snapshot => {
          try {
            if (!snapshot || !snapshot.docs) {
              console.warn('Snapshot vazio ou inválido');
              setLoading(false);
              return;
            }

            const alertasData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            const alertasComNomes = await Promise.all(
              alertasData.map(async (alerta) => {
                if (alerta.remedioId) {
                  try {
                    const remedioDoc = await firestore()
                      .collection('remedios')
                      .doc(alerta.remedioId)
                      .get();
                    
                    if (remedioDoc.exists) {
                      const remedioData = remedioDoc.data();
                      return {
                        ...alerta,
                        nomeRemedio: remedioData.nome || alerta.titulo || 'Remédio não encontrado'
                      };
                    }
                  } catch (error) {
                    console.error('Erro ao buscar remédio:', error);
                  }
                }
                
                return {
                  ...alerta,
                  nomeRemedio: alerta.titulo || 'Medicamento'
                };
              })
            );

            setAlertas(alertasComNomes);
            setLoading(false);
          } catch (error) {
            console.error('Erro ao processar alertas:', error);
            Alert.alert('Erro', 'Não foi possível carregar os dados dos medicamentos.');
            setLoading(false);
          }
        },
        error => {
          console.error('Erro ao buscar alertas:', error);
          Alert.alert('Erro', 'Não foi possível carregar os dados.');
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [user]);

  const confirmarExclusao = (alerta) => {
    setAlertaParaExcluir(alerta);
    setModalVisible(true);
  };

  const cancelarNotificacoesRemedio = async (remedioId, dias) => {
    for (let dia of dias) {
      const id = `${remedioId}_${dia}`;
      await notifee.cancelTriggerNotification(id);
    }
  };

  const excluirAlerta = async () => {
    try {
      await firestore()
        .collection('alertas')
        .doc(alertaParaExcluir.id)
        .delete();
      
      Alert.alert('Sucesso', 'Alerta excluído com sucesso!');
      cancelarNotificacoesRemedio();
      setModalVisible(false);
    } catch (error) {
      console.error('Erro ao excluir alerta:', error);
      Alert.alert('Erro', 'Não foi possível excluir o alerta.');
    }
  };

  const toggleAlerta = async (alertaId) => {
    try {
      const alerta = alertas.find(a => a.id === alertaId);
      const novoStatus = !alerta.ativo;
      
      await firestore()
        .collection('alertas')
        .doc(alertaId)
        .update({ ativo: novoStatus });
        
      setAlertas(prev => 
        prev.map(alerta => 
          alerta.id === alertaId 
            ? { ...alerta, ativo: novoStatus }
            : alerta
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar alerta:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o alerta.');
    }
  };

  const renderDiasSemana = (dias) => {
    if (!dias) {
      console.log('Dias é null/undefined');
      return null;
    }
    
    let diasArray = dias;
    if (typeof dias === 'string') {
      diasArray = dias.split(',').map(d => d.trim());
    }

    if (!Array.isArray(diasArray) || diasArray.length === 0) {
      console.log('Dias não é array ou está vazio:', diasArray);
      return null;
    }
    
    const diasMap = {
        'Dom': 'DOM',
        'Seg': 'SEG',
        'Ter': 'TER',
        'Qua': 'QUA',
        'Qui': 'QUI',
        'Sex': 'SEX',
        'Sáb': 'SÁB'
    };
    
    return (
      <View style={styles.diasContainer}>
        <Text style={styles.diasLabel}>Dias:</Text>
        <View style={styles.diasChips}>
          {diasArray.map((dia, index) => {
            const diaFormatado = diasMap[dia.toLowerCase()] || dia.toUpperCase();
            return (
              <View key={index} style={styles.diaChip}>
                <Text style={styles.diaText}>
                  {diaFormatado}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderAlertaCard = (alerta) => (
    <View key={alerta.id} style={[
      styles.alertaCard, 
      { 
        opacity: alerta.ativo !== false ? 1 : 0.6 
      }
    ]}>
      <View style={styles.alertaHeader}>
        <View style={styles.alertaMainInfo}>
          <View style={styles.horarioContainer}>
            <Text style={styles.horarioText}>{alerta.horario}</Text>
            {alerta.frequencia && (
              <Text style={styles.frequenciaText}>{alerta.frequencia}</Text>
            )}
          </View>
          
          <View style={styles.medicamentoInfo}>
            <Text style={styles.medicamentoNome}>{alerta.nomeRemedio}</Text>
            <Text style={styles.dosagem}>Dosagem: {alerta.dosagem}</Text>
            {alerta.proximaTomada && (
              <Text style={styles.proximaTomada}>Próxima: {alerta.proximaTomada}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => confirmarExclusao(alerta)}
          >
            <Icon name="trash-outline" size={16} color="#E53E3E" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.alertaFooter}>
        {alerta.dias ? (
          renderDiasSemana(alerta.dias)
        ) : (
          <View style={styles.diasContainer}>
            <Text style={styles.diasLabel}>Dias:</Text>
            <View style={styles.diasChips}>
              <View style={styles.diaChip}>
                <Text style={styles.diaText}>Todos os dias</Text>
              </View>
            </View>
          </View>
        )}
        
      </View>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4D97DB" />
      <Text style={styles.loadingText}>Carregando alertas...</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="alarm" size={isSmallScreen ? 40 : 48} color="#8A8A8A" />
      </View>
      <Text style={styles.emptyTitle}>Nenhum alerta configurado</Text>
      <Text style={styles.emptyDescription}>
        Toque no botão + para adicionar seu primeiro alerta de medicação
      </Text>
      <TouchableOpacity 
        style={styles.emptyActionButton}
        onPress={() => navigation.navigate('AdicionarAlerta')}
      >
        <Icon name="add" size={20} color="#FFFFFF" style={styles.emptyActionIcon} />
        <Text style={styles.emptyActionButtonText}>Adicionar Alerta</Text>
      </TouchableOpacity>
    </View>
  );

  const getAlertsStats = () => {
    const ativos = alertas.filter(alerta => alerta.ativo !== false).length;
    const inativos = alertas.length - ativos;
    return { ativos, inativos, total: alertas.length };
  };

  const stats = getAlertsStats();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Meus Alertas</Text>
            <Text style={styles.headerSubtitle}>Veja seus lembretes</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AdicionarAlerta')}
          >
            <Icon name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {loading ? (
            renderLoadingState()
          ) : alertas.length === 0 ? (
            renderEmptyState()
          ) : (
            alertas.map(renderAlertaCard)
          )}
        </ScrollView>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Icon name="warning" size={24} color="#E53E3E" />
              </View>
              <Text style={styles.modalTitle}>Excluir Alerta</Text>
            </View>
            
            <Text style={styles.modalText}>
              Tem certeza que deseja excluir o alerta para "{alertaParaExcluir?.nomeRemedio}"?
            </Text>
            <Text style={styles.modalSubtext}>Esta ação não pode ser desfeita.</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={excluirAlerta}
              >
                <Text style={styles.modalConfirmText}>Excluir</Text>
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4D97DB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4D97DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statNumber: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 25,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
  alertaCard: {
    backgroundColor: '#121A29',
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
    elevation: 3,
    borderWidth: 1,
  },
  alertaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  alertaMainInfo: {
    flex: 1,
    marginRight: 16,
  },
  horarioContainer: {
    marginBottom: 12,
  },
  horarioText: {
    fontSize: isSmallScreen ? 28 : 32,
    fontWeight: '300',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    letterSpacing: -1,
  },
  frequenciaText: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#B0B7C3',
    fontWeight: '500',
    marginTop: -2,
  },
  medicamentoInfo: {
    flex: 1,
  },
  medicamentoNome: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  dosagem: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#B0B7C3',
    marginBottom: 4,
  },
  proximaTomada: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#10B981',
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 8,
    alignItems: 'center',
  },
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleActive: {
    backgroundColor: '#10B981',
  },
  toggleInactive: {
    backgroundColor: '#6B7280',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(229, 62, 62, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 62, 62, 0.3)',
  },
  alertaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 16,
  },
  diasContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  diasLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#B0B7C3',
    fontWeight: '500',
    marginRight: 8,
  },
  diasChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  diaChip: {
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
    paddingHorizontal: isSmallScreen ? 8 : 10,
    paddingVertical: isSmallScreen ? 4 : 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.3)',
  },
  diaText: {
    fontSize: isSmallScreen ? 10 : 11,
    color: '#4D97DB',
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
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
    marginBottom: 24,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4D97DB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#4D97DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyActionIcon: {
    marginRight: 8,
  },
  emptyActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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
    backgroundColor: '#1E2329',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(229, 62, 62, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#B0B7C3',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#8A8A8A',
    textAlign: 'center',
    marginBottom: 25,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCancelText: {
    color: '#B0B7C3',
    fontWeight: '600',
    fontSize: 16,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#E53E3E',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#E53E3E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default AlertasScreen;