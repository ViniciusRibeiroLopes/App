import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Animated,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const {width, height} = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

const RemedioForm = ({route, navigation}) => {
  const isEdit = !!route.params?.remedio;
  const [nome, setNome] = useState('');
  const [utilidade, setUtilidade] = useState('');
  const [tipo, setTipo] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [dosagem, setDosagem] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [modalTipoVisible, setModalTipoVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  const tiposRemedio = [
    {
      label: 'Comprimido',
      value: 'comprimido',
      icon: 'medical',
      color: '#E53E3E',
    },
    {label: 'Cápsula', value: 'capsula', icon: 'ellipse', color: '#4D97DB'},
    {label: 'Xarope', value: 'xarope', icon: 'flask', color: '#9F7AEA'},
    {label: 'Gotas', value: 'gotas', icon: 'water', color: '#38B2AC'},
    {label: 'Pomada', value: 'pomada', icon: 'bandage', color: '#ED8936'},
    {
      label: 'Injeção',
      value: 'injecao',
      icon: 'medical-outline',
      color: '#F56565',
    },
    {label: 'Spray', value: 'spray', icon: 'cloud', color: '#48BB78'},
    {label: 'Outro', value: 'outro', icon: 'help-circle', color: '#718096'},
  ];

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
    if (isEdit) {
      const remedio = route.params.remedio;
      setNome(remedio.nome || '');
      setUtilidade(remedio.utilidade || '');
      setTipo(remedio.tipo || '');
      setQuantidade(remedio.quantidade || '');
      setDosagem(remedio.dosagem || '');
      setObservacoes(remedio.observacoes || '');
    }
  }, []);

  const handleSalvar = async () => {
    const uid = auth().currentUser?.uid;
    if (!nome || !utilidade || !tipo) {
      Alert.alert(
        'Campos obrigatórios',
        'Preencha pelo menos o nome, função e tipo do medicamento.',
      );
      return;
    }

    setLoading(true);

    try {
      const remedioData = {
        nome: nome.trim(),
        utilidade: utilidade.trim(),
        tipo,
        quantidade: quantidade.trim(),
        dosagem: dosagem.trim(),
        observacoes: observacoes.trim(),
        usuarioId: uid,
      };

      if (isEdit) {
        await firestore()
          .collection('remedios')
          .doc(route.params.remedio.id)
          .update(remedioData);
        Alert.alert('Sucesso!', 'Medicamento atualizado com sucesso!', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      } else {
        await firestore()
          .collection('remedios')
          .add({
            ...remedioData,
          });
        Alert.alert('Sucesso!', 'Medicamento adicionado com sucesso!', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      }
    } catch (error) {
      console.error('Erro ao salvar medicamento:', error);
      Alert.alert(
        'Erro',
        `Não foi possível salvar o medicamento.\n\nDetalhes: ${error.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const getTipoLabel = value => {
    const tipo = tiposRemedio.find(t => t.value === value);
    return tipo ? tipo.label : 'Selecionar tipo';
  };

  const getTipoIcon = value => {
    const tipo = tiposRemedio.find(t => t.value === value);
    return tipo ? tipo.icon : 'chevron-down';
  };

  const getTipoColor = value => {
    const tipo = tiposRemedio.find(t => t.value === value);
    return tipo ? tipo.color : '#E53E3E';
  };

  const renderTipoSelector = () => (
    <TouchableOpacity
      style={styles.inputContainer}
      onPress={() => setModalTipoVisible(true)}>
      <View style={styles.inputContent}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: tipo
                ? getTipoColor(tipo) + '15'
                : 'rgba(229, 62, 62, 0.15)',
            },
          ]}>
          <Icon
            name={getTipoIcon(tipo)}
            size={18}
            color={tipo ? getTipoColor(tipo) : '#E53E3E'}
          />
        </View>
        <Text style={[styles.inputText, !tipo && styles.inputPlaceholder]}>
          {getTipoLabel(tipo)}
        </Text>
        <Icon name="chevron-down" size={20} color="#94a3b8" />
      </View>
    </TouchableOpacity>
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

      {/* Header */}
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
            {isEdit ? 'Editar Medicamento' : 'Novo Medicamento'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isEdit
              ? 'Atualize as informações'
              : 'Adicione um novo medicamento'}
          </Text>
        </View>

        <View style={styles.headerRight} />
      </Animated.View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          },
        ]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="medication" size={20} color="#E53E3E" />
              <Text style={styles.sectionTitle}>Informações Básicas</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome do Medicamento *</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputContent}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons
                      name="medication"
                      size={18}
                      color="#E53E3E"
                    />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ex: Paracetamol"
                    placeholderTextColor="#64748b"
                    value={nome}
                    onChangeText={setNome}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Função/Indicação *</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputContent}>
                  <View style={styles.iconContainer}>
                    <Icon name="medical" size={18} color="#E53E3E" />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ex: Dor de cabeça, febre"
                    placeholderTextColor="#64748b"
                    value={utilidade}
                    onChangeText={setUtilidade}
                    multiline
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tipo de Medicamento *</Text>
              {renderTipoSelector()}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="flask" size={20} color="#E53E3E" />
              <Text style={styles.sectionTitle}>Especificações</Text>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInputContainer}>
                <Text style={styles.inputLabel}>Quantidade</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputContent}>
                    <View style={styles.iconContainer}>
                      <Icon name="layers" size={18} color="#E53E3E" />
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ex: 20"
                      placeholderTextColor="#64748b"
                      value={quantidade}
                      onChangeText={setQuantidade}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.halfInputContainer}>
                <Text style={styles.inputLabel}>Dosagem</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputContent}>
                    <View style={styles.iconContainer}>
                      <Icon name="fitness" size={18} color="#E53E3E" />
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ex: 500mg"
                      placeholderTextColor="#64748b"
                      value={dosagem}
                      onChangeText={setDosagem}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="document-text" size={20} color="#E53E3E" />
              <Text style={styles.sectionTitle}>Observações</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Observações Adicionais</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <View style={[styles.inputContent, styles.textAreaContent]}>
                  <View style={styles.iconContainer}>
                    <Icon name="create" size={18} color="#E53E3E" />
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Ex: Tomar com alimentos, efeitos colaterais observados..."
                    placeholderTextColor="#64748b"
                    value={observacoes}
                    onChangeText={setObservacoes}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSalvar}
            disabled={loading}
            activeOpacity={0.8}>
            {loading ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  {isEdit
                    ? 'Salvando alterações...'
                    : 'Adicionando medicamento...'}
                </Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Icon name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  {isEdit ? 'Salvar Alterações' : 'Adicionar Medicamento'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalTipoVisible}
        onRequestClose={() => setModalTipoVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tipo de Medicamento</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalTipoVisible(false)}>
                <Icon name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalList}
              showsVerticalScrollIndicator={false}>
              {tiposRemedio.map(tipoItem => (
                <TouchableOpacity
                  key={tipoItem.value}
                  style={[
                    styles.modalItem,
                    tipo === tipoItem.value && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    setTipo(tipoItem.value);
                    setModalTipoVisible(false);
                  }}>
                  <View style={styles.modalItemContent}>
                    <View
                      style={[
                        styles.modalItemIcon,
                        {backgroundColor: tipoItem.color + '15'},
                      ]}>
                      <Icon
                        name={tipoItem.icon}
                        size={18}
                        color={tipoItem.color}
                      />
                    </View>
                    <View style={styles.modalItemInfo}>
                      <Text
                        style={[
                          styles.modalItemText,
                          tipo === tipoItem.value &&
                            styles.modalItemTextSelected,
                        ]}>
                        {tipoItem.label}
                      </Text>
                    </View>
                  </View>
                  {tipo === tipoItem.value && (
                    <Icon name="checkmark-circle" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: Platform.OS === 'ios' ? 40 : 50,
    paddingBottom: isMediumScreen ? 20 : 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: isSmallScreen ? -30 : isMediumScreen ? -20 : -5,
  },
  backButton: {
    width: isMediumScreen ? 38 : 44,
    height: isMediumScreen ? 38 : 44,
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
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: isMediumScreen ? 22 : 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
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
  headerRight: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 16 : 24,
  },
  scrollContent: {
    paddingTop: 25,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e2e8f0',
    marginBottom: 8,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  inputContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconContainer: {
    width: isSmallScreen ? 32 : 36,
    height: isSmallScreen ? 32 : 36,
    borderRadius: isSmallScreen ? 16 : 18,
    backgroundColor: 'rgba(229, 62, 62, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inputText: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
    flex: 1,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  inputPlaceholder: {
    color: '#64748b',
    fontWeight: '400',
  },
  textInput: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
    flex: 1,
    minHeight: 20,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  textAreaContainer: {
    minHeight: 120,
  },
  textAreaContent: {
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInputContainer: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#E53E3E',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#E53E3E',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#64748b',
    shadowOpacity: 0.1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: height * 0.7,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.6)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalList: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.3)',
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.4)',
  },
  modalItemSelected: {
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
    borderColor: 'rgba(229, 62, 62, 0.25)',
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalItemIcon: {
    width: isSmallScreen ? 32 : 36,
    height: isSmallScreen ? 32 : 36,
    borderRadius: isSmallScreen ? 16 : 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default RemedioForm;
