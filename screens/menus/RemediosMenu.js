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
  TextInput,
  ActivityIndicator,
  StatusBar,
  Animated,
  TouchableWithoutFeedback,
  Platform,
  SafeAreaView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const {width, height} = Dimensions.get('window');

// Breakpoints responsivos
const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

const RemediosScreen = ({navigation}) => {
  const [remedios, setRemedios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTomarVisible, setModalTomarVisible] = useState(false);
  const [remedioParaExcluir, setRemedioParaExcluir] = useState(null);
  const [remedioParaTomar, setRemedioParaTomar] = useState(null);
  const [dosagemInput, setDosagemInput] = useState('');
  const user = auth().currentUser;

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-50)).current;

  const tipoIconMap = {
    comprimido: {name: 'medical', color: '#E53E3E', bg: '#E53E3E15'},
    capsula: {name: 'ellipse', color: '#4D97DB', bg: '#4D97DB15'},
    xarope: {name: 'flask', color: '#9F7AEA', bg: '#9F7AEA15'},
    gotas: {name: 'water', color: '#38B2AC', bg: '#38B2AC15'},
    pomada: {name: 'bandage', color: '#ED8936', bg: '#ED893615'},
    injecao: {name: 'medical-outline', color: '#F56565', bg: '#F5656515'},
    spray: {name: 'cloud', color: '#48BB78', bg: '#48BB7815'},
    outro: {name: 'help-circle', color: '#718096', bg: '#71809615'},
  };

  useEffect(() => {
    // Animações iniciais
    Animated.parallel([
      Animated.timing(headerSlideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        delay: 300,
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
  }, [backgroundAnim, fadeAnim, headerSlideAnim, slideUpAnim]);

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
              ...doc.data(),
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
        },
      );

    return () => unsubscribe();
  }, [user]);

  const confirmarExclusao = remedio => {
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

  const confirmarTomarRemedio = remedio => {
    setRemedioParaTomar(remedio);
    setDosagemInput(remedio.dosagem || '1');
    setModalTomarVisible(true);
  };

  const marcarComoTomado = async () => {
    try {
      const agora = new Date();
      const dia = agora.toISOString().split('T')[0];
      const horario = agora.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      await firestore()
        .collection('medicamentos_tomados')
        .add({
          dia: dia,
          dosagem: dosagemInput || '1',
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
        `${remedioParaTomar.nome} foi marcado como tomado às ${horario}\nDosagem: ${dosagemInput}`,
      );
    } catch (error) {
      console.error('Erro ao registrar medicamento tomado:', error);
      Alert.alert(
        'Erro',
        'Não foi possível registrar que o medicamento foi tomado.',
      );
    }
  };

  const getTipoIcon = tipo => {
    const tipoLower = tipo?.toLowerCase() || 'outro';
    return tipoIconMap[tipoLower] || tipoIconMap['outro'];
  };

  const formatarDataAtualizacao = timestamp => {
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

  const RemedioCard = ({remedio, index}) => {
    const cardAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(cardAnimation, {
        toValue: 1,
        duration: 600,
        delay: index * 150,
        useNativeDriver: true,
      }).start();
    }, [cardAnimation, index]);

    if (!remedio) {
      return null;
    }

    const tipoIcon = getTipoIcon(remedio.tipo);
    const dataAtualizacao = formatarDataAtualizacao(remedio.updatedAt);

    return (
      <Animated.View
        style={[
          styles.remedioCard,
          {
            opacity: cardAnimation,
            transform: [
              {
                translateY: cardAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.medicineIcon, {backgroundColor: tipoIcon.bg}]}>
            <Icon
              name={tipoIcon.name}
              size={isSmallScreen ? 18 : 20}
              color={tipoIcon.color}
            />
          </View>

          <View style={styles.medicineDetails}>
            <Text style={styles.remedioNome}>
              {remedio.nome || 'Nome não informado'}
            </Text>
            <View style={styles.tipoContainer}>
              <Text style={[styles.tipoText, {color: tipoIcon.color}]}>
                {remedio.tipo
                  ? remedio.tipo.charAt(0).toUpperCase() + remedio.tipo.slice(1)
                  : 'Não informado'}
              </Text>
              {dataAtualizacao && (
                <Text style={styles.dataAtualizacao}>• {dataAtualizacao}</Text>
              )}
            </View>
          </View>

          <View style={styles.statusIndicator}>
            <View
              style={[styles.statusDot, {backgroundColor: tipoIcon.color}]}
            />
          </View>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          {remedio.utilidade && (
            <View style={styles.infoItem}>
              <View style={styles.infoHeader}>
                <Icon
                  name="information-circle-outline"
                  size={14}
                  color="#64748b"
                />
                <Text style={styles.infoLabel}>Função</Text>
              </View>
              <Text style={styles.infoValue}>{remedio.utilidade}</Text>
            </View>
          )}

          {(remedio.quantidade || remedio.dosagem) && (
            <View style={styles.specificationsRow}>
              {remedio.quantidade && (
                <View style={styles.specItem}>
                  <View style={styles.specHeader}>
                    <Icon name="layers-outline" size={12} color="#64748b" />
                    <Text style={styles.specLabel}>Quantidade</Text>
                  </View>
                  <Text style={styles.specValue}>{remedio.quantidade}</Text>
                </View>
              )}

              {remedio.dosagem && (
                <View style={styles.specItem}>
                  <View style={styles.specHeader}>
                    <Icon name="scale-outline" size={12} color="#64748b" />
                    <Text style={styles.specLabel}>Dosagem</Text>
                  </View>
                  <Text style={styles.specValue}>{remedio.dosagem}</Text>
                </View>
              )}
            </View>
          )}

          {remedio.observacoes && (
            <View style={styles.observacoesContainer}>
              <View style={styles.observacoesHeader}>
                <Icon name="document-text-outline" size={14} color="#64748b" />
                <Text style={styles.observacoesLabel}>Observações</Text>
              </View>
              <Text style={styles.observacoesText}>{remedio.observacoes}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.takenAction]}
            onPress={() => confirmarTomarRemedio(remedio)}
            activeOpacity={0.8}>
            <View
              style={[
                styles.actionIconContainer,
                {backgroundColor: '#4D97DB15'},
              ]}>
              <Icon name="checkmark-circle" size={16} color="#4D97DB" />
            </View>
            <Text style={[styles.actionText, {color: '#4D97DB'}]}>Tomar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AdicionarRemedio', {remedio})}
            activeOpacity={0.8}>
            <View
              style={[
                styles.actionIconContainer,
                {backgroundColor: '#F59E0B15'},
              ]}>
              <Icon name="create" size={14} color="#F59E0B" />
            </View>
            <Text style={[styles.actionText, {color: '#F59E0B'}]}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteAction]}
            onPress={() => confirmarExclusao(remedio)}
            activeOpacity={0.8}>
            <View
              style={[
                styles.actionIconContainer,
                {backgroundColor: '#E53E3E15'},
              ]}>
              <Icon name="trash" size={14} color="#E53E3E" />
            </View>
            <Text style={[styles.actionText, {color: '#E53E3E'}]}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderLoadingState = () => (
    <Animated.View
      style={[
        styles.loadingContainer,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideUpAnim}],
        },
      ]}>
      <View style={styles.loadingIconContainer}>
        <ActivityIndicator size="large" color="#4D97DB" />
      </View>
      <Text style={styles.loadingText}>Carregando medicamentos...</Text>
      <Text style={styles.loadingSubtext}>Aguarde um momento</Text>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <Animated.View
      style={[
        styles.emptyContainer,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideUpAnim}],
        },
      ]}>
      <View style={styles.emptyIconContainer}>
        <MaterialIcons
          name="medication"
          size={isSmallScreen ? 40 : 48}
          color="#64748b"
        />
      </View>
      <Text style={styles.emptyTitle}>Nenhum remédio cadastrado</Text>
      <Text style={styles.emptyDescription}>
        Comece adicionando seu primeiro medicamento para manter o controle da
        sua saúde
      </Text>
      <TouchableOpacity
        style={styles.emptyActionButton}
        onPress={() => navigation.navigate('AdicionarRemedio')}
        activeOpacity={0.9}>
        <Icon name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyActionButtonText}>
          Adicionar Primeiro Remédio
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />

      {/* Círculos de fundo animados */}
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
            transform: [{translateY: headerSlideAnim}],
          },
        ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}>
          <Icon name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Meus Remédios</Text>
          <Text style={styles.headerSubtitle}>
            {loading
              ? 'Carregando...'
              : `${remedios.length} medicamento${
                  remedios.length !== 1 ? 's' : ''
                } cadastrado${remedios.length !== 1 ? 's' : ''}`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AdicionarRemedio')}
          activeOpacity={0.8}>
          <Icon name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          !loading && (!remedios || remedios.length === 0) && {flex: 1},
        ]}>
        {loading ? (
          renderLoadingState()
        ) : !remedios || remedios.length === 0 ? (
          renderEmptyState()
        ) : (
          <Animated.View
            style={[
              styles.remediosList,
              {
                opacity: fadeAnim,
                transform: [{translateY: slideUpAnim}],
              },
            ]}>
            {remedios.map((remedio, index) => (
              <RemedioCard key={remedio.id} remedio={remedio} index={index} />
            ))}
          </Animated.View>
        )}
      </ScrollView>

      {/* Modal de Exclusão */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={styles.modalContent}>
                <View
                  style={[
                    styles.modalIconContainer,
                    {backgroundColor: '#E53E3E15'},
                  ]}>
                  <Icon name="warning" size={28} color="#E53E3E" />
                </View>

                <Text style={styles.modalTitle}>Excluir Remédio</Text>
                <Text style={styles.modalText}>
                  Tem certeza que deseja excluir "{remedioParaExcluir?.nome}"?
                </Text>
                <Text style={styles.modalSubtext}>
                  Esta ação não pode ser desfeita.
                </Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setModalVisible(false)}
                    activeOpacity={0.8}>
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={excluirRemedio}
                    activeOpacity={0.8}>
                    <Icon name="trash" size={16} color="#FFFFFF" />
                    <Text style={styles.modalConfirmText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal de Tomar Remédio */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalTomarVisible}
        onRequestClose={() => setModalTomarVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalTomarVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={styles.modalContent}>
                <View
                  style={[
                    styles.modalIconContainer,
                    {backgroundColor: '#4D97DB15'},
                  ]}>
                  <Icon name="medical" size={28} color="#4D97DB" />
                </View>

                <Text style={styles.modalTitle}>Tomar Remédio</Text>
                <Text style={styles.modalText}>
                  Confirma que tomou "{remedioParaTomar?.nome}"?
                </Text>

                <View style={styles.dosagemContainer}>
                  <Text style={styles.dosagemLabel}>Dosagem tomada:</Text>
                  <View style={styles.inputContainer}>
                    <Icon name="scale-outline" size={16} color="#64748b" />
                    <TextInput
                      style={styles.dosagemInput}
                      value={dosagemInput}
                      onChangeText={setDosagemInput}
                      placeholder="Ex: 1 comprimido"
                      placeholderTextColor="#64748b"
                    />
                  </View>
                </View>

                <View style={styles.timeContainer}>
                  <Icon name="time-outline" size={14} color="#64748b" />
                  <Text style={styles.modalSubtext}>
                    Horário:{' '}
                    {new Date().toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setModalTomarVisible(false);
                      setDosagemInput('');
                    }}
                    activeOpacity={0.8}>
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalTomarButton}
                    onPress={marcarComoTomado}
                    activeOpacity={0.8}>
                    <Icon name="checkmark-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.modalTomarText}>Confirmar</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
    backgroundColor: '#4D97DB',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 70,
    paddingBottom: 30,
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
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
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
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E53E3E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E53E3E',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 16 : 24,
  },
  scrollContent: {
    paddingVertical: 25,
  },
  remediosList: {
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  loadingText: {
    fontSize: isSmallScreen ? 16 : 18,
    color: '#e2e8f0',
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  remedioCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,

    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.3)',
  },
  medicineIcon: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 36 : 40,
    borderRadius: isSmallScreen ? 18 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  medicineDetails: {
    flex: 1,
  },
  remedioNome: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  tipoText: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  dataAtualizacao: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
    fontWeight: '400',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  statusIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardContent: {
    padding: 20,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  infoValue: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#e2e8f0',
    lineHeight: 20,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  specificationsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 20,
  },
  specItem: {
    flex: 1,
  },
  specHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  specLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  specValue: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#f8fafc',
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  observacoesContainer: {
    marginBottom: 8,
  },
  observacoesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  observacoesLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  observacoesText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#e2e8f0',
    lineHeight: 20,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.3)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 8,
  },
  takenAction: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(51, 65, 85, 0.3)',
  },
  deleteAction: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(51, 65, 85, 0.3)',
  },
  actionIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
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
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    marginBottom: 32,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E53E3E',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#E53E3E',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,

    gap: 8,
  },
  emptyActionButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  modalContent: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 24,
    padding: 30,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  modalText: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalSubtext: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 6,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCancelText: {
    color: '#94a3b8',
    fontWeight: '500',
    fontSize: isSmallScreen ? 14 : 15,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#E53E3E',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#E53E3E',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: isSmallScreen ? 14 : 15,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalTomarButton: {
    flex: 1,
    backgroundColor: '#4D97DB',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4D97DB',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalTomarText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: isSmallScreen ? 14 : 15,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  dosagemContainer: {
    width: '100%',
    marginBottom: 16,
  },
  dosagemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e2e8f0',
    marginBottom: 8,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  dosagemInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: isSmallScreen ? 14 : 15,
    color: '#f8fafc',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default RemediosScreen;
