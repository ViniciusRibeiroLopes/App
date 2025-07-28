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
  ActivityIndicator
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

import notifee from '@notifee/react-native';

const { width } = Dimensions.get('window');

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
    <View key={alerta.id} style={[styles.alertaCard, { borderLeftColor: alerta.cor || '#4CAF50' }]}>
      <View style={styles.alertaHeader}>
        <View style={styles.horarioContainer}>
          <Text style={styles.horarioText}>{alerta.horario}</Text>
          <Text style={styles.frequenciaText}>{alerta.frequencia}</Text>
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => confirmarExclusao(alerta)}
          >
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.alertaContent}>
        <Text style={styles.medicamentoNome}>{alerta.nomeRemedio}</Text>
        <Text style={styles.dosagem}>Dosagem: {alerta.dosagem}</Text>
        {alerta.proximaTomada && (
          <Text style={styles.proximaTomada}>Próxima: {alerta.proximaTomada}</Text>
        )}
        
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
      <ActivityIndicator size="large" color="#121a29" />
      <Text style={styles.loadingText}>Carregando alertas...</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>⏰</Text>
      <Text style={styles.emptyTitle}>Nenhum alerta configurado</Text>
      <Text style={styles.emptyDescription}>
        Toque no botão + para adicionar seu primeiro alerta de medicação
      </Text>
      <TouchableOpacity 
        style={styles.emptyActionButton}
        onPress={() => navigation.navigate('AdicionarAlerta')}
      >
        <Text style={styles.emptyActionButtonText}>Adicionar Alerta</Text>
      </TouchableOpacity>
    </View>
  );

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
          <Text style={styles.headerTitle}>⏰ Meus Alertas</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? 'Carregando...' : `${alertas.length} alertas configurados`}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AdicionarAlerta')}
        >
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          renderLoadingState()
        ) : alertas.length === 0 ? (
          renderEmptyState()
        ) : (
          alertas.map(renderAlertaCard)
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
            <Text style={styles.modalTitle}>Excluir Alerta</Text>
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
    paddingTop: 20,
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
  alertaCard: {
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
  alertaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  horarioContainer: {
    flex: 1,
  },
  horarioText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#121a29',
    fontFamily: 'monospace',
    letterSpacing: -1,
  },
  frequenciaText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
    marginTop: -2,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleButton: {
    padding: 5,
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 16,
  },
  alertaContent: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 7,
  },
  medicamentoNome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#121a29',
    marginBottom: 6,
  },
  dosagem: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 4,
  },
  proximaTomada: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginBottom: 12,
  },
  diasContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  diasLabel: {
    fontSize: 14,
    color: '#718096',
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
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bee3f8',
  },
  diaText: {
    fontSize: 11,
    color: '#2b6cb0',
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#121a29',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionButton: {
    backgroundColor: '#121a29',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyActionButtonText: {
    color: '#fff',
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
});

export default AlertasScreen;