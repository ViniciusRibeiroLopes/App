import React, {useEffect, useState, useRef} from 'react';
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
  StatusBar,
  SafeAreaView,
  Platform,
  Animated,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import notifee from '@notifee/react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const {width, height} = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;

const MenuAvisosScreen = ({navigation, route}) => {
  const [alertasDependentes, setAlertasDependentes] = useState([]);
  const [dependente, setDependente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [alertaParaExcluir, setAlertaParaExcluir] = useState(null);

  const user = auth().currentUser;
  const {dependenteId} = route.params || {};

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    const backgroundAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundAnim, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ]),
    );
    backgroundAnimation.start();

    return () => backgroundAnimation.stop();
  }, []);

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
            ...dependenteDoc.data(),
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

    const buscarAlertasDependente = async dependenteData => {
      if (!dependenteData) {
        setLoading(false);
        return;
      }

      const unsubscribe = firestore()
        .collection('alertas_dependentes')
        .where('dependenteId', '==', dependenteId)
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
                ...doc.data(),
              }));

              const alertasComDetalhes = await Promise.all(
                alertasData.map(async alerta => {
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
                    nomeDependente:
                      dependenteData.nome ||
                      dependenteData.nomeCompleto ||
                      'Dependente',
                  };
                }),
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
          },
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

  const confirmarExclusao = alerta => {
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
          alertaParaExcluir.dias,
        );
      }

      setModalVisible(false);
    } catch (error) {
      console.error('Erro ao excluir alerta:', error);
      Alert.alert('Erro', 'Não foi possível excluir o alerta.');
    }
  };

  const formatarData = dataString => {
    if (!dataString) return '';
    try {
      const data = new Date(dataString);
      return data.toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  const renderDiasSemana = dias => {
    if (!dias) return null;

    let diasArray = dias;
    if (typeof dias === 'string') {
      diasArray = dias.split(',').map(d => d.trim());
    }

    if (!Array.isArray(diasArray) || diasArray.length === 0) {
      return null;
    }

    return (
      <View style={styles.diasGrid}>
        {diasArray.map((dia, index) => (
          <View key={index} style={styles.diaButton}>
            <Text style={styles.diaTexto}>{dia.toUpperCase()}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderAlertaCard = alerta => {
    const isIntervalo = alerta.tipoAlerta === 'intervalo';

    return (
      <Animated.View
        key={alerta.id}
        style={[
          styles.alertaCard,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          },
        ]}>
        <View style={styles.alertaMainContent}>
          <View style={styles.alertaInfo}>
            <View style={styles.medicamentoHeader}>
              <Icon 
                name={isIntervalo ? 'hourglass-outline' : 'alarm-outline'} 
                size={18} 
                color="#3B82F6" 
              />
              <Text style={styles.medicamentoNome}>{alerta.nomeRemedio}</Text>
            </View>
            
            <Text style={styles.dosagem}>{alerta.dosagem}</Text>

            {isIntervalo ? (
              <View style={styles.intervaloBox}>
                <View style={styles.intervaloRow}>
                  <Icon name="refresh-outline" size={16} color="#3B82F6" />
                  <Text style={styles.intervaloTexto}>
                    A cada {alerta.intervaloHoras}h
                  </Text>
                </View>
                <View style={styles.intervaloRow}>
                  <Icon name="play-outline" size={16} color="#94a3b8" />
                  <Text style={styles.horarioInicio}>
                    Início: {alerta.horarioInicio}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.horarioText}>{alerta.horario}</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => confirmarExclusao(alerta)}>
            <Icon name="trash-outline" size={20} color="#E53E3E" />
          </TouchableOpacity>
        </View>

        <View style={styles.alertaFooter}>
          {!isIntervalo && renderDiasSemana(alerta.dias)}

          {alerta.usarDataLimite && alerta.dataLimite && (
            <View style={styles.dataLimiteContainer}>
              <Icon name="calendar-outline" size={14} color="#F59E0B" />
              <Text style={styles.dataLimiteText}>
                Até {formatarData(alerta.dataLimite)}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIconContainer}>
        <Icon name="alarm-outline" size={48} color="#64748b" />
      </View>
      <Text style={styles.emptyStateTitle}>Nenhum alerta configurado</Text>
      <Text style={styles.emptyStateDescription}>
        Toque no botão + para adicionar seu primeiro alerta de medicação
      </Text>
      <TouchableOpacity
        style={styles.emptyActionButton}
        onPress={() => navigation.navigate('AdicionarAlertaDependente', {dependenteId})}>
        <Icon name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyActionButtonText}>Adicionar Alerta</Text>
      </TouchableOpacity>
    </View>
  );

  const alertasHorario = alertasDependentes.filter(a => a.tipoAlerta !== 'intervalo');
  const alertasIntervalo = alertasDependentes.filter(a => a.tipoAlerta === 'intervalo');

  const stats = {
    total: alertasDependentes.length,
    horario: alertasHorario.length,
    intervalo: alertasIntervalo.length,
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <Animated.View
        style={[
          styles.backgroundCircle,
          {
            opacity: backgroundAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.03, 0.08],
            }),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.backgroundCircle2,
          {
            opacity: backgroundAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.05, 0.03],
            }),
          },
        ]}
      />

      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          },
        ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Alertas de {dependente?.nome || 'Dependente'}
          </Text>
          <Text style={styles.headerSubtitle}>{stats.total} alerta(s)</Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AdicionarAlertaDependente', {dependenteId})}>
          <Icon name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          }}>
          {/* Botões de ação rápida */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() =>
                navigation.navigate('HistoricoDependentes', {dependenteId})
              }>
              <View style={[styles.actionIconContainer, {backgroundColor: 'rgba(245, 158, 11, 0.25)'}]}>
                <MaterialIcons name="history" size={22} color="#F59E0B" />
              </View>
              <Text style={styles.actionTitle}>Histórico</Text>
              <Text style={styles.actionSubtitle}>Ver medicações</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() =>
                navigation.navigate('AdicionarAlertaDependente', {dependenteId})
              }>
              <View style={[styles.actionIconContainer, {backgroundColor: 'rgba(59, 130, 246, 0.25)'}]}>
                <Icon name="add" size={22} color="#3B82F6" />
              </View>
              <Text style={styles.actionTitle}>Novo Aviso</Text>
              <Text style={styles.actionSubtitle}>Configurar alerta</Text>
            </TouchableOpacity>
          </View>

          {alertasDependentes.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {alertasHorario.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="alarm" size={20} color="#3B82F6" />
                    <Text style={styles.sectionTitle}>Horários Específicos</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{alertasHorario.length}</Text>
                    </View>
                  </View>
                  {alertasHorario.map(renderAlertaCard)}
                </View>
              )}

              {alertasIntervalo.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="hourglass" size={20} color="#3B82F6" />
                    <Text style={styles.sectionTitle}>Intervalos Regulares</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{alertasIntervalo.length}</Text>
                    </View>
                  </View>
                  {alertasIntervalo.map(renderAlertaCard)}
                </View>
              )}
            </>
          )}
        </Animated.View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
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
            <Text style={styles.modalSubtext}>
              Esta ação não pode ser desfeita.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={excluirAlerta}>
                <Text style={styles.modalConfirmText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  backgroundCircle: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    borderRadius: width,
    backgroundColor: '#3B82F6',
    top: -width * 0.8,
    left: -width * 0.5,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: '#3B82F6',
    bottom: -width * 0.6,
    right: -width * 0.4,
  },
  header: {
    backgroundColor: 'rgba(20, 30, 48, 0.95)',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 55,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 25,
    paddingBottom: 30,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 110,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  actionSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    flex: 1,
  },
  badge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.5,
  },
  alertaCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  alertaMainContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertaInfo: {
    flex: 1,
  },
  medicamentoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  medicamentoNome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  dosagem: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  horarioText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -1.5,
  },
  intervaloBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  intervaloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  intervaloTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  horarioInicio: {
    fontSize: 14,
    color: '#94a3b8',
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
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
    marginLeft: 12,
  },
  alertaFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.4)',
    paddingTop: 12,
    gap: 8,
  },
  diasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  diaButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  diaTexto: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  dataLimiteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  dataLimiteText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    flex: 1,
    justifyContent: 'center',
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  modalContent: {
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderRadius: 24,
    padding: 30,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.4,
    shadowRadius: 24,
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
    borderWidth: 1,
    borderColor: 'rgba(229, 62, 62, 0.3)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  modalText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 25,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalCancelText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#E53E3E',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default MenuAvisosScreen;