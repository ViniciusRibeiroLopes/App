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

/**
 * Constantes para responsividade baseadas no tamanho da tela
 */
const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

/**
 * Componente RemedioForm - Formulário para criação e edição de medicamentos
 * 
 * @component
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.route - Parâmetros da rota, contém dados do medicamento para edição
 * @param {Object} props.navigation - Objeto de navegação do React Navigation
 * @returns {JSX.Element} Componente renderizado
 * 
 * @description
 * Este componente permite ao usuário criar novos medicamentos ou editar existentes.
 * Inclui campos para nome, função/indicação, tipo, quantidade, dosagem e observações.
 * Integra com Firebase Firestore para persistência de dados.
 * 
 * Funcionalidades principais:
 * - Criação de novos medicamentos
 * - Edição de medicamentos existentes
 * - Validação de campos obrigatórios
 * - Seletor customizado para tipos de medicamento
 * - Animações fluidas e interface responsiva
 * 
 * @example
 * // Para criar novo medicamento
 * <RemedioForm navigation={navigation} route={{params: {}}} />
 * 
 * // Para editar medicamento existente
 * <RemedioForm navigation={navigation} route={{params: {remedio: remedioData}}} />
 */
const RemedioForm = ({route, navigation}) => {
  // === VERIFICAÇÃO DE MODO ===
  
  /**
   * Verifica se está em modo de edição baseado nos parâmetros da rota
   * @type {boolean}
   */
  const isEdit = !!route.params?.remedio;
  
  // === ESTADOS DO FORMULÁRIO ===
  
  /**
   * Nome do medicamento
   * @type {string}
   */
  const [nome, setNome] = useState('');
  
  /**
   * Função/utilidade do medicamento
   * @type {string}
   */
  const [utilidade, setUtilidade] = useState('');
  
  /**
   * Tipo do medicamento (comprimido, cápsula, etc.)
   * @type {string}
   */
  const [tipo, setTipo] = useState('');
  
  /**
   * Quantidade disponível do medicamento
   * @type {string}
   */
  const [quantidade, setQuantidade] = useState('');
  
  /**
   * Dosagem do medicamento
   * @type {string}
   */
  const [dosagem, setDosagem] = useState('');
  
  /**
   * Observações adicionais sobre o medicamento
   * @type {string}
   */
  const [observacoes, setObservacoes] = useState('');
  
  /**
   * Controla visibilidade do modal de seleção de tipo
   * @type {boolean}
   */
  const [modalTipoVisible, setModalTipoVisible] = useState(false);
  
  /**
   * Estado de loading para operação de salvamento
   * @type {boolean}
   */
  const [loading, setLoading] = useState(false);

  // === ANIMAÇÕES ===
  
  /**
   * Animação de fade in para entrada da tela
   * @type {Animated.Value}
   */
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  /**
   * Animação de slide up para entrada da tela
   * @type {Animated.Value}
   */
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  
  /**
   * Animação contínua do fundo
   * @type {Animated.Value}
   */
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  /**
   * Array com tipos de medicamento disponíveis
   * @constant {Array<Object>} tiposRemedio
   * @property {string} label - Nome exibido para o usuário
   * @property {string} value - Valor interno do tipo
   * @property {string} icon - Nome do ícone
   * @property {string} color - Cor associada ao tipo
   */
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

  /**
   * Hook de efeito para inicializar animações da tela
   * 
   * @description
   * Executa animações de entrada (fade in e slide up) e inicia
   * animação contínua do fundo em loop infinito
   */
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

  /**
   * Hook de efeito para pré-preencher campos em modo de edição
   * 
   * @description
   * Quando o componente está em modo de edição, preenche todos os
   * campos do formulário com os dados do medicamento recebido via route.params
   */
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

  /**
   * Função assíncrona para salvar ou atualizar medicamento
   * 
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Erro ao salvar no Firestore
   * 
   * @description
   * Valida os campos obrigatórios e salva o medicamento no Firestore.
   * Se estiver em modo de edição, atualiza o documento existente;
   * caso contrário, cria um novo documento.
   * Inclui tratamento de erros e feedback ao usuário.
   */
  const handleSalvar = async () => {
    const uid = auth().currentUser?.uid;
    
    // Validação de campos obrigatórios
    if (!nome || !utilidade || !tipo) {
      Alert.alert(
        'Campos obrigatórios',
        'Preencha pelo menos o nome, função e tipo do medicamento.',
      );
      return;
    }

    setLoading(true);

    try {
      // Preparar dados do medicamento
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
        // Atualizar medicamento existente
        await firestore()
          .collection('remedios')
          .doc(route.params.remedio.id)
          .update(remedioData);
        Alert.alert('Sucesso!', 'Medicamento atualizado com sucesso!', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      } else {
        // Criar novo medicamento
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

  /**
   * Função para obter label do tipo de medicamento
   * 
   * @param {string} value - Valor do tipo de medicamento
   * @returns {string} Label do tipo ou placeholder padrão
   * 
   * @description
   * Busca no array de tipos de medicamento o item correspondente
   * ao valor fornecido e retorna seu label para exibição
   */
  const getTipoLabel = value => {
    const tipo = tiposRemedio.find(t => t.value === value);
    return tipo ? tipo.label : 'Selecionar tipo';
  };

  /**
   * Função para obter ícone do tipo de medicamento
   * 
   * @param {string} value - Valor do tipo de medicamento
   * @returns {string} Nome do ícone ou ícone padrão
   * 
   * @description
   * Busca no array de tipos de medicamento o item correspondente
   * ao valor fornecido e retorna o nome do ícone associado
   */
  const getTipoIcon = value => {
    const tipo = tiposRemedio.find(t => t.value === value);
    return tipo ? tipo.icon : 'chevron-down';
  };

  /**
   * Função para obter cor do tipo de medicamento
   * 
   * @param {string} value - Valor do tipo de medicamento
   * @returns {string} Código hexadecimal da cor ou cor padrão
   * 
   * @description
   * Busca no array de tipos de medicamento o item correspondente
   * ao valor fornecido e retorna a cor associada para estilização
   */
  const getTipoColor = value => {
    const tipo = tiposRemedio.find(t => t.value === value);
    return tipo ? tipo.color : '#E53E3E';
  };

  /**
   * Função para renderizar seletor customizado de tipo de medicamento
   * 
   * @returns {JSX.Element} Componente TouchableOpacity estilizado
   * 
   * @description
   * Renderiza um botão customizado que simula um picker/select,
   * mostrando o tipo selecionado com ícone e cor correspondentes.
   * Ao ser pressionado, abre o modal de seleção de tipos.
   */
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

      {/* Header da tela */}
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

      {/* Conteúdo principal */}
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
          
          {/* Seção: Informações Básicas */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="medication" size={20} color="#E53E3E" />
              <Text style={styles.sectionTitle}>Informações Básicas</Text>
            </View>

            {/* Campo: Nome do Medicamento */}
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

            {/* Campo: Função/Indicação */}
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

            {/* Campo: Tipo de Medicamento */}
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

            {/* Linha com campos Quantidade e Dosagem */}
            <View style={styles.row}>
              {/* Campo: Quantidade */}
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

              {/* Campo: Dosagem */}
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

          {/* Seção: Observações */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="document-text" size={20} color="#E53E3E" />
              <Text style={styles.sectionTitle}>Observações</Text>
            </View>

            {/* Campo: Observações Adicionais */}
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

          {/* Botão Salvar */}
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

      {/* Modal de seleção de tipo de medicamento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalTipoVisible}
        onRequestClose={() => setModalTipoVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header do modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tipo de Medicamento</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalTipoVisible(false)}>
                <Icon name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Lista de tipos de medicamento */}
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

/**
 * Objeto de estilos do componente RemedioForm
 * @constant {Object} styles
 * 
 * @description
 * Define todos os estilos utilizados no componente RemedioForm.
 * Inclui estilos responsivos, animações e temas consistentes.
 * 
 * Principais características:
 * - Design system com cores padronizadas (#E53E3E como cor principal)
 * - Responsividade para diferentes tamanhos de tela
 * - Glassmorphism e efeitos modernos
 * - Estados visuais para elementos interativos
 * - Modal customizado para seleção de tipos
 */
const styles = StyleSheet.create({
  /**
   * Container principal da tela
   * @property {Object} container
   */
  container: {
    flex: 1,
    backgroundColor: '#121A29',
  },
  
  /**
   * Círculo de fundo animado (principal)
   * @property {Object} backgroundCircle
   */
  backgroundCircle: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    borderRadius: width,
    backgroundColor: '#4D97DB',
    top: -width * 0.8,
    left: -width * 0.5,
  },
  
  /**
   * Círculo de fundo animado (secundário)
   * @property {Object} backgroundCircle2
   */
  backgroundCircle2: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: '#E53E3E',
    bottom: -width * 0.6,
    right: -width * 0.4,
  },
  
  /**
   * Header da tela com título e navegação
   * @property {Object} header
   */
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
  
  /**
   * Botão de voltar no header
   * @property {Object} backButton
   */
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
  
  /**
   * Container central do header
   * @property {Object} headerCenter
   */
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  
  /**
   * Título principal do header
   * @property {Object} headerTitle
   */
  headerTitle: {
    fontSize: isMediumScreen ? 22 : 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  
  /**
   * Subtítulo do header
   * @property {Object} headerSubtitle
   */
  headerSubtitle: {
    fontSize: isMediumScreen ? 13 : 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Espaçador direito do header
   * @property {Object} headerRight
   */
  headerRight: {
    width: 44,
  },
  
  /**
   * Container do conteúdo principal
   * @property {Object} content
   */
  content: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 16 : 24,
  },
  
  /**
   * Conteúdo do ScrollView
   * @property {Object} scrollContent
   */
  scrollContent: {
    paddingTop: 25,
    paddingBottom: 30,
  },
  
  /**
   * Seção do formulário
   * @property {Object} section
   */
  section: {
    marginBottom: 25,
  },
  
  /**
   * Header de cada seção com ícone e título
   * @property {Object} sectionHeader
   */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  
  /**
   * Título da seção
   * @property {Object} sectionTitle
   */
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  
  /**
   * Grupo de input com label
   * @property {Object} inputGroup
   */
  inputGroup: {
    marginBottom: 16,
  },
  
  /**
   * Label dos campos de input
   * @property {Object} inputLabel
   */
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e2e8f0',
    marginBottom: 8,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Container de input com estilo glassmorphism
   * @property {Object} inputContainer
   */
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
  
  /**
   * Conteúdo interno do input
   * @property {Object} inputContent
   */
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  
  /**
   * Container do ícone nos inputs
   * @property {Object} iconContainer
   */
  iconContainer: {
    width: isSmallScreen ? 32 : 36,
    height: isSmallScreen ? 32 : 36,
    borderRadius: isSmallScreen ? 16 : 18,
    backgroundColor: 'rgba(229, 62, 62, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  /**
   * Texto dos inputs (para seletores)
   * @property {Object} inputText
   */
  inputText: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
    flex: 1,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Estilo do placeholder nos inputs
   * @property {Object} inputPlaceholder
   */
  inputPlaceholder: {
    color: '#64748b',
    fontWeight: '400',
  },
  
  /**
   * TextInput editável
   * @property {Object} textInput
   */
  textInput: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
    flex: 1,
    minHeight: 20,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Container especial para textarea (observações)
   * @property {Object} textAreaContainer
   */
  textAreaContainer: {
    minHeight: 120,
  },
  
  /**
   * Conteúdo do textarea com alinhamento superior
   * @property {Object} textAreaContent
   */
  textAreaContent: {
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  
  /**
   * Estilo específico do textarea
   * @property {Object} textArea
   */
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  /**
   * Linha horizontal para campos lado a lado
   * @property {Object} row
   */
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  
  /**
   * Container para campos que ocupam metade da largura
   * @property {Object} halfInputContainer
   */
  halfInputContainer: {
    flex: 1,
  },
  
  /**
   * Botão principal para salvar
   * @property {Object} saveButton
   */
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
  
  /**
   * Estado desabilitado do botão salvar
   * @property {Object} saveButtonDisabled
   */
  saveButtonDisabled: {
    backgroundColor: '#64748b',
    shadowOpacity: 0.1,
  },
  
  /**
   * Conteúdo do botão (ícone + texto)
   * @property {Object} buttonContent
   */
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  /**
   * Conteúdo do botão durante loading
   * @property {Object} loadingContent
   */
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  /**
   * Texto do botão salvar
   * @property {Object} saveButtonText
   */
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Overlay escuro do modal
   * @property {Object} modalOverlay
   */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  
  /**
   * Conteúdo do modal de seleção de tipo
   * @property {Object} modalContent
   */
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
  
  /**
   * Header do modal de seleção
   * @property {Object} modalHeader
   */
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.6)',
  },
  
  /**
   * Título do modal
   * @property {Object} modalTitle
   */
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  
  /**
   * Botão de fechar modal
   * @property {Object} modalCloseButton
   */
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
  
  /**
   * Lista scrollável do modal
   * @property {Object} modalList
   */
  modalList: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  
  /**
   * Item individual da lista do modal
   * @property {Object} modalItem
   */
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
  
  /**
   * Estado selecionado do item do modal
   * @property {Object} modalItemSelected
   */
  modalItemSelected: {
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
    borderColor: 'rgba(229, 62, 62, 0.25)',
  },
  
  /**
   * Conteúdo do item do modal
   * @property {Object} modalItemContent
   */
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  
  /**
   * Container do ícone no item do modal
   * @property {Object} modalItemIcon
   */
  modalItemIcon: {
    width: isSmallScreen ? 32 : 36,
    height: isSmallScreen ? 32 : 36,
    borderRadius: isSmallScreen ? 16 : 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  /**
   * Informações do item do modal
   * @property {Object} modalItemInfo
   */
  modalItemInfo: {
    flex: 1,
  },
  
  /**
   * Texto principal do item do modal
   * @property {Object} modalItemText
   */
  modalItemText: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Texto do item selecionado no modal
   * @property {Object} modalItemTextSelected
   */
  modalItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

/**
 * Exportação padrão do componente RemedioForm
 * @exports RemedioForm
 */
export default RemedioForm;