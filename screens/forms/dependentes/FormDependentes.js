import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Platform,
  SafeAreaView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

/**
 * Componente para adicionar e editar dependentes no sistema.
 * Permite o cadastro de pessoas sob os cuidados do usuário atual,
 * criando automaticamente uma conta no Firebase Authentication para o dependente.
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.navigation - Objeto de navegação do React Navigation
 * @param {Object} props.route - Objeto de rota contendo parâmetros de navegação
 * @param {Object} [props.route.params.dependente] - Dados do dependente para edição (opcional)
 * @returns {JSX.Element} Componente de cadastro/edição de dependentes
 */
const AdicionarDependentes = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  
  /**
   * Estado do formulário contendo todos os dados do dependente
   * @type {Object}
   * @property {string} nomeCompleto - Nome completo do dependente
   * @property {string} email - Email do dependente
   * @property {string} senha - Senha para criação da conta
   * @property {string} parentesco - Tipo de parentesco com o usuário
   * @property {string} genero - Gênero do dependente (masculino/feminino)
   * @property {Date} dataNascimento - Data de nascimento do dependente
   */
  const [formData, setFormData] = useState({
    nomeCompleto: '',
    email: '',
    senha: '',
    parentesco: '',
    genero: '',
    dataNascimento: new Date(),
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showParentescoModal, setShowParentescoModal] = useState(false);
  const user = auth().currentUser;
  const isEditing = route?.params?.dependente;

  // Referências para animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  /**
   * Hook de efeito para inicializar as animações da tela
   * Configura animações de fade-in, slide-up e animação contínua de fundo
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
   * Hook de efeito para preencher o formulário quando em modo de edição
   * Carrega os dados do dependente existente nos campos do formulário
   */
  React.useEffect(() => {
    if (isEditing) {
      const dep = route.params.dependente;
      setFormData({
        nomeCompleto: dep.nome || dep.nomeCompleto || '',
        email: dep.email || '',
        senha: '',
        parentesco: dep.parentesco || '',
        genero: dep.genero || '',
        dataNascimento: dep.dataNascimento?.toDate ? dep.dataNascimento.toDate() : new Date(),
      });
    }
  }, [isEditing]);

  /**
   * Array de opções de parentesco disponíveis para seleção
   * @type {Array<Object>}
   * @property {string} id - Identificador único da opção
   * @property {string} label - Texto exibido para o usuário
   * @property {string} icon - Nome do ícone do Ionicons
   */
  const parentescoOptions = [
    { id: 'pai-mae', label: 'Pai/Mãe', icon: 'people' },
    { id: 'avo-avo', label: 'Avô/Avó', icon: 'people-outline' },
    { id: 'filho', label: 'Filho(a)', icon: 'person-outline' },
    { id: 'irmao', label: 'Irmão/Irmã', icon: 'people-circle' },
    { id: 'esposo', label: 'Marido/Esposa', icon: 'heart' },
    { id: 'tio', label: 'Tio(a)', icon: 'people' },
    { id: 'primo', label: 'Primo(a)', icon: 'people-outline' },
    { id: 'sogro', label: 'Sogro(a)', icon: 'people-circle-outline' },
    { id: 'genro', label: 'Genro/Nora', icon: 'person-circle' },
    { id: 'outro', label: 'Outro', icon: 'person-add' }
  ];

  /**
   * Valida todos os campos do formulário antes do envio
   * Verifica se todos os campos obrigatórios estão preenchidos
   * e se os valores estão no formato correto
   * 
   * @returns {boolean} true se o formulário é válido, false caso contrário
   */
  const validarFormulario = () => {
    const { nomeCompleto, email, senha, parentesco, genero } = formData;

    if (!nomeCompleto.trim()) {
      Alert.alert('Erro', 'Nome completo é obrigatório.');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Erro', 'Email é obrigatório.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Erro', 'Digite um email válido.');
      return false;
    }

    if (!genero) {
      Alert.alert('Erro', 'Selecione o gênero.');
      return false;
    }

    if (!isEditing) {
      if (!senha) {
        Alert.alert('Erro', 'Senha é obrigatória.');
        return false;
      }

      if (senha.length < 6) {
        Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
        return false;
      }
    }

    if (!parentesco) {
      Alert.alert('Erro', 'Selecione o parentesco.');
      return false;
    }

    if (formData.dataNascimento > new Date()) {
      Alert.alert('Erro', 'Data de nascimento não pode ser futura.');
      return false;
    }

    return true;
  };

  /**
   * Cria um novo usuário no Firebase Authentication através da API externa
   * Faz uma requisição HTTP POST para o backend que gerencia a criação de usuários
   * 
   * @param {string} email - Email do novo usuário
   * @param {string} senha - Senha do novo usuário
   * @returns {Promise<string>} UID do usuário criado no Firebase
   * @throws {Error} Erro com mensagem personalizada baseada no tipo de erro
   */
  const criarUsuarioViaAPI = async (email, senha) => {
    try {
      const response = await fetch('https://pillcheck-backend.onrender.com/criar-usuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          senha: senha
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao criar usuário');
      }

      return data.uid;
    } catch (error) {
      console.error('Erro na API:', error);
      
      let mensagemErro = 'Não foi possível criar o usuário.';
      
      if (error.message.includes('email-already-in-use') || error.message.includes('already exists')) {
        mensagemErro = 'Este email já está sendo usado por outra conta.';
      } else if (error.message.includes('weak-password')) {
        mensagemErro = 'A senha é muito fraca.';
      } else if (error.message.includes('invalid-email')) {
        mensagemErro = 'Email inválido.';
      } else if (error.message) {
        mensagemErro = error.message;
      }
      
      throw new Error(mensagemErro);
    }
  };

  /**
   * Salva ou atualiza os dados do dependente no Firestore
   * No modo de criação: cria um novo usuário via API e salva os dados
   * No modo de edição: apenas atualiza os dados existentes
   * 
   * @async
   * @returns {Promise<void>}
   */
  const salvarDependente = async () => {
    if (!validarFormulario()) return;

    setLoading(true);

    try {
      let dependenteUid = null;

      // Criar usuário apenas se não estiver editando
      if (!isEditing) {
        dependenteUid = await criarUsuarioViaAPI(
          formData.email,
          formData.senha,
        );
      }

      // Dados para salvar no Firestore
      const dadosDependente = {
        usuarioId: user.uid,
        dependenteUid: isEditing ? route.params.dependente.dependenteUid : dependenteUid,
        nome: formData.nomeCompleto.trim(),
        nomeCompleto: formData.nomeCompleto.trim(),
        email: formData.email.trim(),
        parentesco: formData.parentesco,
        genero: formData.genero,
        dataNascimento: firestore.Timestamp.fromDate(formData.dataNascimento),
      };

      if (isEditing) {
        // Atualizar dependente existente
        await firestore()
          .collection('users_dependentes')
          .doc(route.params.dependente.id)
          .update(dadosDependente);
        
        Alert.alert('Sucesso', 'Dependente atualizado com sucesso!');
      } else {
        // Criar novo dependente
        await firestore()
          .collection('users_dependentes')
          .doc(dadosDependente.dependenteUid)
          .set(dadosDependente);
        
        Alert.alert(
          'Sucesso', 
          'Dependente cadastrado com sucesso!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
        return;
      }

      navigation.goBack();
    } catch (error) {
      console.error('Erro ao salvar dependente:', error);
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Manipula a mudança de data no DateTimePicker
   * Atualiza o estado do formulário com a nova data selecionada
   * 
   * @param {Object} event - Evento do DateTimePicker
   * @param {Date} selectedDate - Data selecionada pelo usuário
   */
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setFormData(prev => ({
        ...prev,
        dataNascimento: selectedDate
      }));
    }
  };

  /**
   * Formata uma data para exibição no formato brasileiro (DD/MM/AAAA)
   * 
   * @param {Date} data - Data a ser formatada
   * @returns {string} Data formatada como string
   */
  const formatarData = (data) => {
    return data.toLocaleDateString('pt-BR');
  };

  /**
   * Obtém o texto do parentesco selecionado ou placeholder
   * 
   * @returns {string} Label do parentesco ou texto padrão
   */
  const getParentescoLabel = () => {
    const parentesco = parentescoOptions.find(p => p.label === formData.parentesco);
    return parentesco ? parentesco.label : 'Selecionar parentesco';
  };

  /**
   * Renderiza o modal de seleção de parentesco
   * Exibe uma lista scrollável com todas as opções de parentesco disponíveis
   * 
   * @returns {JSX.Element} Modal com opções de parentesco
   */
  const renderParentescoModal = () => (
    <Modal
      visible={showParentescoModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowParentescoModal(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowParentescoModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerHeader}>
                <View style={styles.pickerHeaderLeft}>
                  <View style={styles.pickerIconContainer}>
                    <Icon name="people" size={20} color="#4D97DB" />
                  </View>
                  <Text style={styles.pickerTitle}>Selecionar Parentesco</Text>
                </View>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowParentescoModal(false)}
                >
                  <Icon name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.customPickerScrollView}>
                {parentescoOptions.map((opcao) => (
                  <TouchableOpacity
                    key={opcao.id}
                    style={[
                      styles.customPickerItem,
                      formData.parentesco === opcao.label && styles.customPickerItemSelected
                    ]}
                    onPress={() => {
                      setFormData(prev => ({...prev, parentesco: opcao.label}));
                      setShowParentescoModal(false);
                    }}
                  >
                    <View style={styles.customPickerItemContent}>
                      <View style={[
                        styles.customPickerIconContainer,
                        formData.parentesco === opcao.label && styles.customPickerIconContainerSelected
                      ]}>
                        <Icon 
                          name={opcao.icon} 
                          size={18} 
                          color={formData.parentesco === opcao.label ? "#FFFFFF" : "#4D97DB"} 
                        />
                      </View>
                      <Text style={[
                        styles.customPickerItemText,
                        formData.parentesco === opcao.label && styles.customPickerItemTextSelected
                      ]}>
                        {opcao.label}
                      </Text>
                    </View>
                    {formData.parentesco === opcao.label && (
                      <Icon name="checkmark-circle" size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  /**
   * Renderiza o seletor de gênero com botões estilizados
   * Permite selecionar entre masculino e feminino com feedback visual
   * 
   * @returns {JSX.Element} Seção de seleção de gênero
   */
  const renderGeneroSelector = () => (
    <Animated.View 
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideUpAnim}],
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
          <Icon name="person" size={18} color="#4D97DB" />
        </View>
        <Text style={styles.sectionTitle}>Gênero</Text>
      </View>
      <View style={styles.generoContainer}>
        <TouchableOpacity
          style={[
            styles.generoOption,
            formData.genero === 'masculino' && styles.generoOptionSelected
          ]}
          onPress={() => setFormData(prev => ({...prev, genero: 'masculino'}))}
          activeOpacity={0.8}
        >
          <View style={[
            styles.generoIconContainer,
            formData.genero === 'masculino' && styles.generoIconContainerSelected
          ]}>
            <Icon 
              name="man" 
              size={24} 
              color={formData.genero === 'masculino' ? '#FFFFFF' : '#4D97DB'} 
            />
          </View>
          <Text style={[
            styles.generoText,
            formData.genero === 'masculino' && styles.generoTextSelected
          ]}>
            Masculino
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.generoOption,
            formData.genero === 'feminino' && styles.generoOptionSelected
          ]}
          onPress={() => setFormData(prev => ({...prev, genero: 'feminino'}))}
          activeOpacity={0.8}
        >
          <View style={[
            styles.generoIconContainer,
            formData.genero === 'feminino' && styles.generoIconContainerSelected
          ]}>
            <Icon 
              name="woman" 
              size={24} 
              color={formData.genero === 'feminino' ? '#FFFFFF' : '#4D97DB'} 
            />
          </View>
          <Text style={[
            styles.generoText,
            formData.genero === 'feminino' && styles.generoTextSelected
          ]}>
            Feminino
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />
      
      {/* Círculos de fundo animados para efeito visual */}
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
      
      {/* Cabeçalho da tela com botão de voltar e título */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Icon name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Editar Dependente' : 'Novo Dependente'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isEditing ? 'Atualize as informações' : 'Cadastre uma pessoa sob seus cuidados'}
          </Text>
        </View>
        
        <View style={styles.headerRight} />
      </Animated.View>

      {/* Conteúdo scrollável com formulário */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Campo Nome Completo */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideUpAnim}],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Icon name="person-outline" size={18} color="#4D97DB" />
            </View>
            <Text style={styles.sectionTitle}>Nome Completo</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <View style={styles.inputContent}>
              <View style={styles.inputIconContainer}>
                <Icon name="person-outline" size={18} color="#4D97DB" />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Digite o nome completo"
                placeholderTextColor="#64748b"
                value={formData.nomeCompleto}
                onChangeText={(text) => setFormData(prev => ({...prev, nomeCompleto: text}))}
                autoCapitalize="words"
              />
            </View>
          </View>
        </Animated.View>

        {/* Campo Email */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideUpAnim}],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Icon name="mail-outline" size={18} color="#4D97DB" />
            </View>
            <Text style={styles.sectionTitle}>Email</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <View style={styles.inputContent}>
              <View style={styles.inputIconContainer}>
                <Icon name="mail-outline" size={18} color="#4D97DB" />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Digite o email"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({...prev, email: text}))}
              />
            </View>
          </View>
        </Animated.View>

        {renderGeneroSelector()}

        {/* Campo Senha - apenas no modo de criação */}
        {!isEditing && (
          <Animated.View 
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{translateY: slideUpAnim}],
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Icon name="lock-closed-outline" size={18} color="#4D97DB" />
              </View>
              <Text style={styles.sectionTitle}>Senha</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <View style={styles.inputContent}>
                <View style={styles.inputIconContainer}>
                  <Icon name="lock-closed-outline" size={18} color="#4D97DB" />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={formData.senha}
                  onChangeText={(text) => setFormData(prev => ({...prev, senha: text}))}
                />
              </View>
            </View>
          </Animated.View>
        )}

        {/* Campo Parentesco */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideUpAnim}],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Icon name="people-outline" size={18} color="#4D97DB" />
            </View>
            <Text style={styles.sectionTitle}>Parentesco</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.inputContainer}
            onPress={() => setShowParentescoModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.inputContent}>
              <View style={styles.inputIconContainer}>
                <Icon name="people-outline" size={18} color="#4D97DB" />
              </View>
              <Text style={[
                styles.inputText,
                !formData.parentesco && styles.inputPlaceholder
              ]}>
                {getParentescoLabel()}
              </Text>
              <Icon name="chevron-down" size={20} color="#64748b" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Campo Data de Nascimento */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideUpAnim}],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Icon name="calendar-outline" size={18} color="#4D97DB" />
            </View>
            <Text style={styles.sectionTitle}>Data de Nascimento</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.inputContainer}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <View style={styles.inputContent}>
              <View style={styles.inputIconContainer}>
                <Icon name="calendar-outline" size={18} color="#4D97DB" />
              </View>
              <Text style={styles.inputText}>
                {formatarData(formData.dataNascimento)}
              </Text>
              <Icon name="chevron-down" size={20} color="#64748b" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Card informativo com detalhes sobre o processo */}
        <Animated.View 
          style={[
            styles.infoCard,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideUpAnim}],
            },
          ]}
        >
          <View style={styles.infoHeader}>
            <View style={styles.infoIconContainer}>
              <Icon name="information-circle" size={18} color="#4D97DB" />
            </View>
            <Text style={styles.infoTitle}>Informações Importantes</Text>
          </View>
          <View style={styles.infoContent}>
            <View style={styles.infoItem}>
              <View style={styles.infoItemIconContainer}>
                <Icon name="checkmark-circle" size={14} color="#10B981" />
              </View>
              <Text style={styles.infoText}>
                Uma conta será criada automaticamente para o dependente
              </Text>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.infoItemIconContainer}>
                <Icon name="information-circle-outline" size={14} color="#F59E0B" />
              </View>
              <Text style={styles.infoText}>
                O login NÃO será feito automaticamente no dispositivo
              </Text>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.infoItemIconContainer}>
                <Icon name="key" size={14} color="#6366F1" />
              </View>
              <Text style={styles.infoText}>
                O dependente poderá acessar com email e senha fornecidos
              </Text>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.infoItemIconContainer}>
                <MaterialIcons name="medication" size={14} color="#EC4899" />
              </View>
              <Text style={styles.infoText}>
                Você gerenciará os medicamentos desta pessoa
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Botão de salvar/atualizar */}
        <Animated.View 
          style={{
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          }}
        >
          <TouchableOpacity 
            style={[
              styles.saveButton,
              loading && styles.saveButtonDisabled
            ]}
            onPress={salvarDependente}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  {isEditing ? 'Atualizando...' : 'Cadastrando...'}
                </Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Icon 
                  name={isEditing ? "checkmark-circle" : "person-add"} 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={styles.saveButtonText}>
                  {isEditing ? 'Atualizar Dependente' : 'Cadastrar Dependente'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* DateTimePicker para seleção de data */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.dataNascimento}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {renderParentescoModal()}
    </SafeAreaView>
  );
};

/**
 * Estilos do componente AdicionarDependentes
 * Contém todos os estilos visuais organizados por seção:
 * - Layout principal e background
 * - Header e navegação
 * - Formulário e inputs
 * - Modais e seletores
 * - Botões e interações
 * - Responsividade para diferentes tamanhos de tela
 */
const styles = StyleSheet.create({
  /**
   * Container principal da tela
   */
  container: {
    flex: 1,
    backgroundColor: '#121A29',
  },
  
  /**
   * Círculo de fundo animado - principal
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
   * Círculo de fundo animado - secundário
   */
  backgroundCircle2: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: '#10B981',
    bottom: -width * 0.6,
    right: -width * 0.4,
  },
  
  /**
   * Cabeçalho da tela com título e botão de voltar
   */
  header: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: Platform.OS === 'ios' ? 40 : 50,
    paddingBottom: 15,
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
    marginTop: isMediumScreen ? -30 : 0,
  },
  
  /**
   * Botão de voltar no cabeçalho
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
   * Container central do cabeçalho
   */
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  
  /**
   * Título principal do cabeçalho
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
   * Subtítulo do cabeçalho
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
   * Espaçador direito do cabeçalho
   */
  headerRight: {
    width: 44,
  },
  
  /**
   * Área de conteúdo scrollável
   */
  content: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 16 : 24,
  },
  
  /**
   * Container do scroll com padding
   */
  scrollContent: {
    paddingTop: 25,
    paddingBottom: 30,
  },
  
  /**
   * Seção do formulário
   */
  section: {
    marginBottom: 25,
  },
  
  /**
   * Cabeçalho de cada seção
   */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  
  /**
   * Container do ícone da seção
   */
  sectionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  /**
   * Título da seção
   */
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  
  /**
   * Container do campo de input
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
   */
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 12,
  },
  
  /**
   * Container do ícone do input
   */
  inputIconContainer: {
    width: isSmallScreen ? 32 : 36,
    height: isSmallScreen ? 32 : 36,
    borderRadius: isSmallScreen ? 16 : 18,
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  /**
   * Campo de texto editável
   */
  textInput: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#f8fafc',
    fontWeight: '500',
    flex: 1,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Texto do input não editável
   */
  inputText: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#f8fafc',
    fontWeight: '500',
    flex: 1,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Estilo para placeholder dos inputs
   */
  inputPlaceholder: {
    color: '#64748b',
    fontWeight: '400',
  },
  
  /**
   * Container dos botões de gênero
   */
  generoContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  
  /**
   * Botão de opção de gênero
   */
  generoOption: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  
  /**
   * Estado selecionado do botão de gênero
   */
  generoOptionSelected: {
    backgroundColor: '#4D97DB',
    borderColor: '#4D97DB',
    shadowColor: '#4D97DB',
    shadowOpacity: 0.3,
  },
  
  /**
   * Container do ícone de gênero
   */
  generoIconContainer: {
    width: isSmallScreen ? 40 : 48,
    height: isSmallScreen ? 40 : 48,
    borderRadius: isSmallScreen ? 20 : 24,
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
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
  
  /**
   * Estado selecionado do ícone de gênero
   */
  generoIconContainerSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  /**
   * Texto do botão de gênero
   */
  generoText: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
    color: '#e2e8f0',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Estado selecionado do texto de gênero
   */
  generoTextSelected: {
    color: '#FFFFFF',
  },
  
  /**
   * Card informativo
   */
  infoCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 18,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    borderLeftWidth: 4,
    borderLeftColor: '#4D97DB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  
  /**
   * Cabeçalho do card informativo
   */
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  
  /**
   * Container do ícone do card informativo
   */
  infoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  /**
   * Título do card informativo
   */
  infoTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#f8fafc',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Conteúdo do card informativo
   */
  infoContent: {
    gap: 12,
  },
  
  /**
   * Item individual do card informativo
   */
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  
  /**
   * Container do ícone do item informativo
   */
  infoItemIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  
  /**
   * Texto do item informativo
   */
  infoText: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#94a3b8',
    flex: 1,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Botão principal de salvar
   */
  saveButton: {
    backgroundColor: '#4D97DB',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#4D97DB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.3)',
  },
  
  /**
   * Estado desabilitado do botão de salvar
   */
  saveButtonDisabled: {
    backgroundColor: '#64748b',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  
  /**
   * Container do conteúdo do botão
   */
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  /**
   * Container do conteúdo de loading
   */
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  /**
   * Texto do botão de salvar
   */
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Overlay do modal
   */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  
  /**
   * Conteúdo do modal de seleção
   */
  pickerModalContent: {
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
   * Cabeçalho do modal de seleção
   */
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.6)',
  },
  
  /**
   * Lado esquerdo do cabeçalho do modal
   */
  pickerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  
  /**
   * Container do ícone do modal
   */
  pickerIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  /**
   * Título do modal de seleção
   */
  pickerTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  
  /**
   * Botão de fechar do modal
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
   * ScrollView do modal de seleção
   */
  customPickerScrollView: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  
  /**
   * Item da lista de seleção
   */
  customPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.3)',
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  
  /**
   * Estado selecionado do item
   */
  customPickerItemSelected: {
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
    borderBottomColor: 'rgba(77, 151, 219, 0.3)',
  },
  
  /**
   * Conteúdo do item de seleção
   */
  customPickerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  
  /**
   * Container do ícone do item
   */
  customPickerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  /**
   * Estado selecionado do ícone do item
   */
  customPickerIconContainerSelected: {
    backgroundColor: '#4D97DB',
  },
  
  /**
   * Texto do item de seleção
   */
  customPickerItemText: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#e2e8f0',
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default AdicionarDependentes;