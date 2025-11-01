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
  TouchableWithoutFeedback,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const {width, height} = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;

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
    {label: 'Cápsula', value: 'capsula', icon: 'ellipse', color: '#3B82F6'},
    {label: 'Xarope', value: 'xarope', icon: 'flask', color: '#9F7AEA'},
    {label: 'Gotas', value: 'gotas', icon: 'water', color: '#10B981'},
    {label: 'Pomada', value: 'pomada', icon: 'bandage', color: '#F59E0B'},
    {
      label: 'Injeção',
      value: 'injecao',
      icon: 'medical-outline',
      color: '#E53E3E',
    },
    {label: 'Spray', value: 'spray', icon: 'cloud', color: '#10B981'},
    {label: 'Outro', value: 'outro', icon: 'help-circle', color: '#64748b'},
  ];

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
  }, [isEdit, route.params.remedio]);

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
        await firestore().collection('remedios').add(remedioData);
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
    return tipo ? tipo.color : '#10B981';
  };

  const renderTipoSelector = () => (
    <TouchableOpacity
      style={styles.inputContainer}
      onPress={() => setModalTipoVisible(true)}
      activeOpacity={0.8}>
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

        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {isEdit ? 'Editar Medicamento' : 'Novo Medicamento'}
          </Text>
          <Text style={styles.subtitle}>
            {isEdit ? 'Atualize as informações' : 'Adicione um novo medicamento'}
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          }}>
          {/* Seção: Informações Básicas */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="medical" size={20} color="#E53E3E" />
              <Text style={styles.sectionTitle}>Informações Básicas</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome do Medicamento *</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputContent}>
                  <View
                    style={[
                      styles.iconContainer,
                      {backgroundColor: '#E53E3E15'},
                    ]}>
                    <MaterialIcons name="medication" size={18} color="#E53E3E" />
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
                  <View
                    style={[
                      styles.iconContainer,
                      {backgroundColor: '#E53E3E15'},
                    ]}>
                    <Icon name="information-circle" size={18} color="#E53E3E" />
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

          {/* Seção: Especificações */}
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
                    <View
                      style={[
                        styles.iconContainer,
                        {backgroundColor: '#E53E3E15'},
                      ]}>
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
                    <View
                      style={[
                        styles.iconContainer,
                        {backgroundColor: '#E53E3E15'},
                      ]}>
                      <Icon name="scale" size={18} color="#E53E3E" />
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

          {/* Seção: Observações */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="document-text" size={20} color="#E53E3E" />
              <Text style={styles.sectionTitle}>Observações</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Observações Adicionais</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <View style={[styles.inputContent, styles.textAreaContent]}>
                  <View
                    style={[
                      styles.iconContainer,
                      {backgroundColor: '#E53E3E15'},
                    ]}>
                    <Icon name="create" size={18} color="#E53E3E" />
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Ex: Tomar com alimentos, efeitos colaterais..."
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
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  {isEdit ? 'Salvando...' : 'Adicionando...'}
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
        </Animated.View>
      </ScrollView>

      {/* Modal de seleção de tipo */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalTipoVisible}
        onRequestClose={() => setModalTipoVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalTipoVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Tipo de Medicamento</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setModalTipoVisible(false)}>
                    <Icon name="close" size={20} color="#FFFFFF" />
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
                      }}
                      activeOpacity={0.8}>
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
                        <Text
                          style={[
                            styles.modalItemText,
                            tipo === tipoItem.value &&
                              styles.modalItemTextSelected,
                          ]}>
                          {tipoItem.label}
                        </Text>
                      </View>
                      {tipo === tipoItem.value && (
                        <Icon name="checkmark-circle" size={20} color="#10B981" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
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
    backgroundColor: '#0F172A',
  },
  backgroundCircle: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    borderRadius: width,
    backgroundColor: '#E53E3E',
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
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 25,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 25,
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
    shadowOffset: {width: 0, height: 2},
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#E53E3E',
    shadowOffset: {width: 0, height: 4},
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
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  modalContent: {
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: height * 0.7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.4,
    shadowRadius: 24,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.4)',
  },
  modalItemSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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