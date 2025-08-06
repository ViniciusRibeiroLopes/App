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
  FlatList,
  StatusBar
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import notifee from '@notifee/react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');


const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

const MenuAvisosScreen = ({ navigation, route }) => {
  const [alertasDependentes, setAlertasDependentes] = useState([]);
  const [dependente, setDependente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [alertaParaExcluir, setAlertaParaExcluir] = useState(null);
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

    const buscarAlertasDependente = async (dependenteData) => {
      if (!dependenteData) {
        setLoading(false);
        return;
      }

      const unsubscribe = firestore()
        .collection('alertas_dependentes')
        .where('dependenteId', '==', dependenteId)
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

              const alertasComDetalhes = await Promise.all(
                alertasData.map(async (alerta) => {
                  let nomeRemedio = alerta.titulo || 'Medicamento';
                  
                  if (alerta.remedioId) {
                    try {
                      const remedioDoc = await firestore()
                        .collection('remedios')
                        .doc(alerta.remedioId)
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
                    ...alerta,
                    nomeRemedio,
                    nomeDependente: dependenteData.nome || dependenteData.nomeCompleto || 'Dependente'
                  };
                })
              );

              setAlertasDependentes(alertasComDetalhes);
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

      return unsubscribe;
    };

    const inicializar = async () => {
      const dependenteData = await buscarDependente();
      const unsubscribe = await buscarAlertasDependente(dependenteData);
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

  const confirmarExclusao = (alerta) => {
    setAlertaParaExcluir(alerta);
    setModalVisible(true);
  };

  const cancelarNotificacoesRemedio = async (remedioId, dependenteId, dias) => {
    if (dias && Array.isArray(dias)) {
      for (let dia of dias) {
        const id = `${remedioId}_${dependenteId}_${dia}`;
        await notifee.cancelTriggerNotification(id);
      }
    }
  };

  const excluirAlerta = async () => {
    try {
      await firestore()
        .collection('alertas_dependentes')
        .doc(alertaParaExcluir.id)
        .delete();
      
      Alert.alert('Sucesso', 'Alerta excluído com sucesso!');
      
      if (alertaParaExcluir.remedioId && alertaParaExcluir.dependenteId && alertaParaExcluir.dias) {
        await cancelarNotificacoesRemedio(
          alertaParaExcluir.remedioId, 
          alertaParaExcluir.dependenteId, 
          alertaParaExcluir.dias
        );
      }
      
      setModalVisible(false);
    } catch (error) {
      console.error('Erro ao excluir alerta:', error);
      Alert.alert('Erro', 'Não foi possível excluir o alerta.');
    }
  };

  const renderDiasSemana = (dias) => {
    if (!dias) return null;
    
    let diasArray = dias;
    if (typeof dias === 'string') {
      diasArray = dias.split(',').map(d => d.trim());
    }

    if (!Array.isArray(diasArray) || diasArray.length === 0) {
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
            const diaFormatado = diasMap[dia] || dia.toUpperCase();
            return (
              <View key={index} style={styles.diaChip}>
                <Text style={styles.diaText}>{diaFormatado}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderAlertaCard = ({ item: alerta }) => (
    <View style={[styles.alertaCard, { borderLeftColor: alerta.cor || '#4D97DB' }]}>
      <View style={styles.alertaHeader}>
        <View style={styles.horarioContainer}>
          <Text style={styles.horarioText}>{alerta.horario}</Text>
          <Text style={styles.frequenciaText}>{alerta.frequencia}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => confirmarExclusao(alerta)}
        >
          <Icon name="trash-outline" size={18} color="#E53E3E" />
        </TouchableOpacity>
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
      <ActivityIndicator size="large" color="#4D97DB" />
      <Text style={styles.loadingText}>Carregando avisos...</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyStateIconContainer}>
        <Icon name="notifications-off" size={isSmallScreen ? 40 : 48} color="#8A8A8A" />
      </View>
      <Text style={styles.emptyTitle}>Nenhum aviso configurado</Text>
      <Text style={styles.emptyDescription}>
        Configure alertas de medicamentos para seus dependentes
      </Text>
      <TouchableOpacity 
        style={styles.emptyActionButton}
        onPress={() => navigation.navigate('AdicionarAlertaDependente', { dependenteId })}
      >
        <Text style={styles.emptyActionButtonText}>Adicionar Aviso</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.menuHeader}>
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('HistoricoDependentes', { dependenteId })}
        >
          <View style={styles.actionIconContainer}>
            <MaterialIcons name="history" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.actionTitle}>Histórico</Text>
          <Text style={styles.actionSubtitle}>Ver medicações anteriores</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('AdicionarAlertaDependente', { dependenteId })}
        >
          <View style={styles.actionIconContainer}>
            <Icon name="add" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.actionTitle}>Novo Aviso</Text>
          <Text style={styles.actionSubtitle}>Configurar medicamento</Text>
        </TouchableOpacity>
      </View>
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
          <Icon name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Avisos de {dependente?.nome || dependente?.nomeCompleto || 'Medicamentos'}</Text>
          <Text style={styles.headerSubtitle}>Administre os alertas do dependente</Text>
        </View>
        
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        style={styles.scrollContainer}
        data={alertasDependentes}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={renderAlertaCard}
        ListEmptyComponent={loading ? renderLoadingState() : renderEmptyState()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={alertasDependentes.length === 0 ? styles.flexGrow : null}
      />

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon name="warning" size={32} color="#E53E3E" />
              <Text style={styles.modalTitle}>Excluir Aviso</Text>
            </View>
            
            <Text style={styles.modalText}>
              Tem certeza que deseja excluir o aviso de "{alertaParaExcluir?.nomeRemedio}" 
              para {alertaParaExcluir?.nomeDependente}?
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
  flexGrow: {
    flexGrow: 1,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
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
  headerSpacer: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  menuHeader: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 25,
    paddingBottom: 10,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#d03d6298',
    paddingVertical: isSmallScreen ? 16 : 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ce224d98',
    minHeight: 100,
  },
  actionIconContainer: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 36 : 40,
    borderRadius: isSmallScreen ? 18 : 20,
    backgroundColor: 'rgba(228, 161, 161, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#ffffffb6',
    textAlign: 'center',
    lineHeight: 16,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: isSmallScreen ? 16 : 24,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  alertaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  horarioContainer: {
    flex: 1,
  },
  horarioText: {
    fontSize: isSmallScreen ? 28 : 32,
    fontWeight: '300',
    color: '#121A29',
    fontFamily: 'monospace',
    letterSpacing: -1,
  },
  frequenciaText: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: -2,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertaContent: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  medicamentoNome: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#121A29',
    marginBottom: 6,
  },
  dosagem: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  proximaTomada: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#4D97DB',
    fontWeight: '500',
    marginBottom: 12,
  },
  diasContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  diasLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#6B7280',
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
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BEE3F8',
  },
  diaText: {
    fontSize: 10,
    color: '#2B6CB0',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    flex: 1,
    justifyContent: 'center',
  },
  emptyStateIconContainer: {
    width: isSmallScreen ? 64 : 80,
    height: isSmallScreen ? 64 : 80,
    borderRadius: isSmallScreen ? 32 : 40,
    backgroundColor: '#F1F3F4',
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
    backgroundColor: '#4D97DB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxWidth: 350,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121A29',
    textAlign: 'center',
    marginTop: 8,
  },
  modalText: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 25,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalCancelText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 16,
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
    fontWeight: '600',
    fontSize: 16,
  },
});

export default MenuAvisosScreen;