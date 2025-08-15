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
  FlatList,
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

const {width} = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

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
    // Animações iniciais
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

    // Animação de fundo contínua
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
  }, [backgroundAnim, fadeAnim, slideUpAnim]);

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
        Alert.alert(
          'Erro',
          'Não foi possível carregar os dados do dependente.',
        );
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
              Alert.alert(
                'Erro',
                'Não foi possível carregar os dados dos medicamentos.',
              );
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

      if (
        alertaParaExcluir.remedioId &&
        alertaParaExcluir.dependenteId &&
        alertaParaExcluir.dias
      ) {
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

  const renderDiasSemana = dias => {
    if (!dias) return null;

    let diasArray = dias;
    if (typeof dias === 'string') {
      diasArray = dias.split(',').map(d => d.trim());
    }

    if (!Array.isArray(diasArray) || diasArray.length === 0) {
      return null;
    }

    const diasMap = {
      Dom: 'DOM',
      Seg: 'SEG',
      Ter: 'TER',
      Qua: 'QUA',
      Qui: 'QUI',
      Sex: 'SEX',
      Sáb: 'SÁB',
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

  const renderAlertaCard = ({item: alerta}) => (
    <Animated.View
      style={[
        styles.alertaCard,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideUpAnim}],
        },
      ]}>
      <View style={styles.alertaHeader}>
        <View style={styles.horarioContainer}>
          <View
            style={[
              styles.horarioBadge,
              {borderLeftColor: alerta.cor || '#10B981'},
            ]}>
            <Icon name="time-outline" size={16} color="#10B981" />
            <Text style={styles.horarioText}>{alerta.horario}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => confirmarExclusao(alerta)}>
          <Icon name="trash-outline" size={18} color="#E53E3E" />
        </TouchableOpacity>
      </View>

      <View style={styles.alertaContent}>
        <View style={styles.medicamentoInfo}>
          <View style={styles.medicamentoIconContainer}>
            <MaterialIcons name="medication" size={20} color="#10B981" />
          </View>
          <View style={styles.medicamentoDetails}>
            <Text style={styles.medicamentoNome}>{alerta.nomeRemedio}</Text>
            <Text style={styles.dosagem}>Dosagem: {alerta.dosagem}</Text>
          </View>
        </View>

        {alerta.dias ? (
          renderDiasSemana(alerta.dias)
        ) : (
          <View style={styles.diasContainer}>
            <Text style={styles.diasLabel}>Frequência:</Text>
            <View style={styles.diasChips}>
              <View style={styles.diaChip}>
                <Text style={styles.diaText}>Todos os dias</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#10B981" />
      <Text style={styles.loadingText}>Carregando avisos...</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyStateIconContainer}>
        <Icon
          name="notifications-off"
          size={isSmallScreen ? 40 : 48}
          color="#64748b"
        />
      </View>
      <Text style={styles.emptyTitle}>Nenhum aviso configurado</Text>
      <Text style={styles.emptyDescription}>
        Configure alertas de medicamentos para seus dependentes
      </Text>
      <TouchableOpacity
        style={styles.emptyActionButton}
        onPress={() =>
          navigation.navigate('AdicionarAlertaDependente', {dependenteId})
        }>
        <View style={styles.buttonContent}>
          <Icon name="add-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.emptyActionButtonText}>Adicionar Aviso</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <Animated.View
      style={[
        styles.menuHeader,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideUpAnim}],
        },
      ]}>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardHistory]}
          onPress={() =>
            navigation.navigate('HistoricoDependentes', {dependenteId})
          }>
          <View
            style={[
              styles.actionIconContainer,
              {backgroundColor: 'rgba(245, 158, 11, 0.15)'},
            ]}>
            <MaterialIcons name="history" size={20} color="#F59E0B" />
          </View>
          <Text style={styles.actionTitle}>Histórico</Text>
          <Text style={styles.actionSubtitle}>Ver medicações anteriores</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardAdd]}
          onPress={() =>
            navigation.navigate('AdicionarAlertaDependente', {dependenteId})
          }>
          <View
            style={[
              styles.actionIconContainer,
              {backgroundColor: 'rgba(16, 185, 129, 0.15)'},
            ]}>
            <Icon name="add" size={20} color="#10B981" />
          </View>
          <Text style={styles.actionTitle}>Novo Aviso</Text>
          <Text style={styles.actionSubtitle}>Configurar medicamento</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />

      <Animated.View
        style={[
          styles.backgroundCircle,
          {
            opacity: backgroundAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.03, 0.08],
            }),
            transform: [
              {
                scale: backgroundAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.1],
                }),
              },
            ],
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
            transform: [
              {
                scale: backgroundAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.1, 1],
                }),
              },
            ],
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
          <Icon name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Avisos de{' '}
            {dependente?.nome || dependente?.nomeCompleto}
          </Text>
          <Text style={styles.headerSubtitle}>
            Administre os alertas do dependente
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </Animated.View>

      <FlatList
        style={styles.scrollContainer}
        data={alertasDependentes}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={renderAlertaCard}
        ListEmptyComponent={loading ? renderLoadingState() : renderEmptyState()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          alertasDependentes.length === 0 ? styles.flexGrow : null
        }
      />

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, {opacity: fadeAnim}]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Icon name="warning" size={32} color="#E53E3E" />
              </View>
              <Text style={styles.modalTitle}>Excluir Aviso</Text>
            </View>

            <Text style={styles.modalText}>
              Tem certeza que deseja excluir o aviso de "
              {alertaParaExcluir?.nomeRemedio}" para{' '}
              {alertaParaExcluir?.nomeDependente}?
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
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121A29',
  },
  backgroundCircle: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    borderRadius: width,
    backgroundColor: '#10B981',
    top: -width * 0.8,
    left: -width * 0.5,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: '#E53E3E',
    bottom: -width * 0.6,
    right: -width * 0.4,
  },
  flexGrow: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 60,
    paddingBottom: isMediumScreen ? 20 : 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: isMediumScreen ? -30 : 0,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    width: isMediumScreen ? 38 : 44,
    height: isMediumScreen ? 38 : 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontSize: isMediumScreen ? 20 : 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: isMediumScreen ? 13 : 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  headerSpacer: {
    width: 44,
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
    paddingVertical: isSmallScreen ? 16 : 20,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionCardHistory: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  actionCardAdd: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  actionIconContainer: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 36 : 40,
    borderRadius: isSmallScreen ? 18 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionTitle: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  actionSubtitle: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
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
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  alertaCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: isSmallScreen ? 16 : 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,

    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  alertaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  horarioContainer: {
    flex: 1,
  },
  horarioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderLeftWidth: 3,
    gap: 6,
  },
  horarioText: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#e2e8f0',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(229, 62, 62, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 62, 62, 0.25)',
  },
  alertaContent: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.6)',
    paddingTop: 16,
  },
  medicamentoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicamentoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicamentoDetails: {
    flex: 1,
  },
  medicamentoNome: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  dosagem: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  diasContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  diasLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#94a3b8',
    fontWeight: '500',
    marginRight: 8,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  diasChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  diaChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  diaText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
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
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  emptyTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  emptyDescription: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  emptyActionButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 25,
    padding: 25,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(229, 62, 62, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 62, 62, 0.25)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
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
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.8)',
  },
  modalCancelText: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#E53E3E',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#E53E3E',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default MenuAvisosScreen;
