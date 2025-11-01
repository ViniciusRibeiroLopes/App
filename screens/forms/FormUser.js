import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  Animated,
  ScrollView,
  SafeAreaView,
  Modal,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/FontAwesome';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * Obtém as dimensões da tela do dispositivo
 * @constant {Object} dimensions - Largura e altura da tela
 */
const {width, height} = Dimensions.get('window');

/**
 * Verifica se a tela é pequena (menos de 360px de largura)
 * @constant {boolean} isSmallScreen
 */
const isSmallScreen = width < 360;

/**
 * Verifica se a tela é média (entre 360px e 400px de largura)
 * @constant {boolean} isMediumScreen
 */
const isMediumScreen = width >= 360 && width < 400;

/**
 * Verifica se a tela é grande (400px ou mais de largura)
 * @constant {boolean} isLargeScreen
 */
const isLargeScreen = width >= 400;

/**
 * Componente de tela para completar o perfil do usuário
 * @component
 * @param {Object} props - Propriedades do componente
 * @param {Function} props.onProfileCreated - Callback chamado quando o perfil é criado com sucesso
 * @returns {JSX.Element} Componente de tela para completar perfil
 */
const CompleteProfileScreen = ({onProfileCreated}) => {
  // Estados do componente
  /**
   * Estado do passo atual do formulário
   * @type {[number, Function]} currentStep - Passo atual (0 a 6)
   */
  const [currentStep, setCurrentStep] = useState(0);
  
  /**
   * Estado do nome do usuário
   * @type {[string, Function]} nome - Nome completo do usuário
   */
  const [nome, setnome] = useState('');
  
  /**
   * Estado da data de nascimento
   * @type {[Date, Function]} datanasc - Data de nascimento do usuário
   */
  const [datanasc, setDatanasc] = useState(new Date());
  
  /**
   * Estado de visibilidade do seletor de data
   * @type {[boolean, Function]} showDatePicker - Controla se o DateTimePicker está visível
   */
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  /**
   * Estado do gênero selecionado
   * @type {[string, Function]} genero - Gênero do usuário (Masculino, Feminino, Prefiro não informar)
   */
  const [genero, setGenero] = useState('');
  
  /**
   * Estados adicionais do formulário
   */
  const [telefone, setTelefone] = useState('');
  const [tipoSanguineo, setTipoSanguineo] = useState('');
  const [alergias, setAlergias] = useState('');
  const [condicoesEspeciais, setCondicoesEspeciais] = useState('');
  
  /**
   * Estado de carregamento
   * @type {[boolean, Function]} isLoading - Indica se uma operação está sendo executada
   */
  const [isLoading, setIsLoading] = useState(false);
  
  /**
   * Estado de foco do campo de entrada
   * @type {[boolean, Function]} inputFocused - Indica se o campo de texto está em foco
   */
  const [inputFocused, setInputFocused] = useState(false);
  
  /**
   * Estado de exibição da animação de sucesso
   * @type {[boolean, Function]} showSuccessAnimation - Controla se a animação de sucesso está sendo exibida
   */
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Referências para animações
  /**
   * Referência para animação de fade
   * @type {React.MutableRefObject<Animated.Value>} fadeAnim
   */
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  /**
   * Referência para animação de deslizamento
   * @type {React.MutableRefObject<Animated.Value>} slideAnim
   */
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  /**
   * Referência para animação de escala do logo
   * @type {React.MutableRefObject<Animated.Value>} logoScaleAnim
   */
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  
  /**
   * Referência para animação de escala do botão
   * @type {React.MutableRefObject<Animated.Value>} buttonScaleAnim
   */
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  
  /**
   * Referência para animação de fundo
   * @type {React.MutableRefObject<Animated.Value>} backgroundAnim
   */
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  
  /**
   * Referência para animação da barra de progresso
   * @type {React.MutableRefObject<Animated.Value>} progressAnim
   */
  const progressAnim = useRef(new Animated.Value(0.14)).current;
  
  /**
   * Referência para o componente LottieView
   * @type {React.MutableRefObject<LottieView>} lottieRef
   */
  const lottieRef = useRef(null);

  /**
   * Hook de navegação do React Navigation
   * @type {Object} navigation
   */
  const navigation = useNavigation();

  /**
   * Configuração dos passos do formulário
   * @constant {Array<Object>} steps - Array com configuração de cada passo
   */
  const steps = [
    {
      title: 'Qual é o seu nome?',
      subtitle: 'Como você gostaria de ser chamado?',
      placeholder: 'Digite seu nome completo',
      type: 'text',
      field: 'nome',
    },
    {
      title: 'Quando você nasceu?',
      subtitle: 'Precisamos da sua data de nascimento',
      type: 'date',
    },
    {
      title: 'Como você se identifica?',
      subtitle: 'Qual é o seu gênero?',
      type: 'genero',
    },
    {
      title: 'Qual é o seu telefone?',
      subtitle: 'Para contato de emergência',
      placeholder: '(00) 00000-0000',
      type: 'text',
      field: 'telefone',
      keyboardType: 'phone-pad',
    },
    {
      title: 'Qual é o seu tipo sanguíneo?',
      subtitle: 'Informação importante para emergências',
      type: 'tipoSanguineo',
    },
    {
      title: 'Você tem alguma alergia?',
      subtitle: 'Medicamentos, alimentos, etc. (Opcional)',
      placeholder: 'Ex: Penicilina, amendoim, etc.',
      type: 'text',
      field: 'alergias',
      multiline: true,
    },
    {
      title: 'Condições especiais de saúde?',
      subtitle: 'Diabetes, hipertensão, etc. (Opcional)',
      placeholder: 'Ex: Diabetes tipo 2, hipertensão',
      type: 'text',
      field: 'condicoesEspeciais',
      multiline: true,
    },
  ];

  /**
   * Efeito executado na montagem do componente
   * Inicia as animações de entrada
   */
  useEffect(() => {
    startAnimations();
  }, [startAnimations]);

  /**
   * Efeito executado quando o passo atual muda
   * Atualiza a animação da barra de progresso e transição de conteúdo
   */
  useEffect(() => {
    // Animar progresso
    const progressValue = (currentStep + 1) / steps.length;
    Animated.timing(progressAnim, {
      toValue: progressValue,
      duration: 400,
      useNativeDriver: false,
    }).start();

    // Animar transição de conteúdo
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep, fadeAnim, progressAnim, steps.length]);

  /**
   * Inicia as animações de entrada da tela
   * @function startAnimations
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    const backgroundAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]),
    );
    backgroundAnimation.start();
  };

  /**
   * Exibe o modal com animação de sucesso
   * @function showSuccessAnimationOverlay
   */
  const showSuccessAnimationOverlay = () => {
    console.log('🎯 Iniciando modal de sucesso do perfil');
    setShowSuccessAnimation(true);
  };

  /**
   * Manipula o fim da animação Lottie de sucesso
   * Salva o estado no AsyncStorage e chama o callback
   * @async
   * @function handleLottieAnimationFinish
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps, no-undef
  const handleLottieAnimationFinish = useCallback(async () => {
    console.log('🎬 Animação Lottie de perfil finalizada!');

    try {
      await AsyncStorage.setItem('profileAnimationCompleted', 'true');
      console.log('✅ AsyncStorage atualizado - perfil concluído');
    } catch (error) {
      console.error('Erro ao salvar no AsyncStorage:', error);
    }

    setTimeout(() => {
      console.log('⏰ Fechando modal de sucesso do perfil');
      setShowSuccessAnimation(false);

      // Chamar callback para atualizar o estado no App.js
      if (onProfileCreated) {
        onProfileCreated();
      }
    }, 500);
  });

  /**
   * Efeito executado quando a animação de sucesso é exibida
   * Controla a reprodução da animação Lottie e fallback
   */
  useEffect(() => {
    if (showSuccessAnimation) {
      console.log('📺 Modal do perfil está visível, verificando Lottie...');

      const debugTimer = setTimeout(() => {
        console.log('🔍 Verificando ref do Lottie:', lottieRef.current);
        if (lottieRef.current) {
          console.log('✅ Ref encontrada, tentando reproduzir...');
          try {
            lottieRef.current.play();
          } catch (error) {
            console.error('❌ Erro ao reproduzir Lottie:', error);
          }
        } else {
          console.log('❌ Ref do Lottie não encontrada');
        }
      }, 500);

      const fallbackTimer = setTimeout(async () => {
        console.log('⚠️ Fallback timer do perfil - finalizando');
        await handleLottieAnimationFinish();
      }, 3000);

      return () => {
        clearTimeout(debugTimer);
        clearTimeout(fallbackTimer);
      };
    }
  }, [handleLottieAnimationFinish, showSuccessAnimation]);

  /**
   * Formata um número de telefone para o padrão brasileiro
   * @function formatPhone
   * @param {string} text - Texto do telefone
   * @returns {string} Telefone formatado
   */
  const formatPhone = text => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return cleaned
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  /**
   * Formata uma data para o padrão brasileiro
   * @function formatDate
   * @param {Date} date - Data a ser formatada
   * @returns {string} Data formatada no padrão DD/MM/AAAA
   */
  const formatDate = date => {
    return date.toLocaleDateString('pt-BR');
  };

  /**
   * Manipula o clique no botão "Continuar/Finalizar"
   * Valida os dados e avança para o próximo passo ou finaliza o perfil
   * @function handleNext
   */
  const handleNext = () => {
    const step = steps[currentStep];

    // Validações por tipo de campo
    if (step.field === 'nome' && !nome.trim()) {
      Alert.alert('Atenção', 'Por favor, digite seu nome completo');
      return;
    }

    if (step.type === 'date') {
      const age = Math.floor(
        (new Date() - datanasc) / (365.25 * 24 * 60 * 60 * 1000),
      );
      if (age < 13) {
        Alert.alert(
          'Atenção',
          'Você deve ter pelo menos 13 anos para usar o aplicativo',
        );
        return;
      }
    }

    if (step.type === 'genero' && !genero) {
      Alert.alert('Atenção', 'Por favor, selecione seu gênero');
      return;
    }

    if (step.field === 'telefone' && !telefone.trim()) {
      Alert.alert('Atenção', 'Por favor, digite seu telefone');
      return;
    }

    if (step.type === 'tipoSanguineo' && !tipoSanguineo) {
      Alert.alert('Atenção', 'Por favor, selecione seu tipo sanguíneo');
      return;
    }

    // Campos opcionais: alergias e condicoesEspeciais não precisam de validação

    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeProfile();
    }
  };

  /**
   * Manipula o clique no botão "Voltar"
   * Retorna para o passo anterior
   * @function handleBack
   */
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Completa o perfil do usuário
   * Salva os dados no Firestore e exibe a animação de sucesso
   * @async
   * @function completeProfile
   */
  const completeProfile = async () => {
    setIsLoading(true);
    try {
      const user = auth().currentUser;
      if (user) {
        await firestore()
          .collection('users')
          .doc(user.uid)
          .set({
            nome,
            dataNascimento: datanasc.toISOString(),
            genero,
            telefone,
            tipoSanguineo,
            alergias: alergias.trim() || '',
            condicoesEspeciais: condicoesEspeciais.trim() || '',
            email: user.email,
            perfilCompleto: true,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });

        console.log('Perfil completo salvo com sucesso para:', user.email);
        setIsLoading(false);

        showSuccessAnimationOverlay();
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      setIsLoading(false);
      Alert.alert(
        'Erro',
        'Não foi possível salvar seu perfil. Tente novamente.',
      );
    }
  };

  /**
   * Manipula a mudança de data no DateTimePicker
   * @function onDateChange
   * @param {Event} event - Evento de mudança de data
   * @param {Date} selectedDate - Data selecionada
   */
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || datanasc;
    setShowDatePicker(Platform.OS === 'ios');
    setDatanasc(currentDate);
  };

  /**
   * Exibe o seletor de data
   * @function showDatepicker
   */
  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  /**
   * Renderiza o conteúdo específico de cada passo do formulário
   * @function renderStepContent
   * @returns {JSX.Element|null} Componente do conteúdo do passo atual
   */
  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.type) {
      case 'text':
        const value =
          step.field === 'nome'
            ? nome
            : step.field === 'telefone'
            ? telefone
            : step.field === 'alergias'
            ? alergias
            : condicoesEspeciais;

        const setValue =
          step.field === 'nome'
            ? setnome
            : step.field === 'telefone'
            ? text => setTelefone(formatPhone(text))
            : step.field === 'alergias'
            ? setAlergias
            : setCondicoesEspeciais;

        return (
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                inputFocused && styles.inputFocused,
                step.multiline && styles.textArea,
              ]}
              placeholder={step.placeholder}
              placeholderTextColor="#8A8A8A"
              value={value}
              onChangeText={setValue}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              autoFocus={currentStep === 0}
              autoCapitalize={step.field === 'nome' ? 'words' : 'sentences'}
              keyboardType={step.keyboardType || 'default'}
              multiline={step.multiline || false}
              numberOfLines={step.multiline ? 4 : 1}
              textAlignVertical={step.multiline ? 'top' : 'center'}
              editable={!isLoading && !showSuccessAnimation}
            />
          </View>
        );

      case 'date':
        return (
          <View style={styles.dateContainer}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={showDatepicker}
              activeOpacity={0.8}
              disabled={isLoading || showSuccessAnimation}>
              <Icon
                name="calendar"
                size={20}
                color="#4D97DB"
                style={styles.dateIcon}
              />
              <Text style={styles.dateButtonText}>{formatDate(datanasc)}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={datanasc}
                mode="date"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                textColor="#FFFFFF"
              />
            )}
          </View>
        );

      case 'genero':
        return (
          <View style={styles.generoContainer}>
            {['Masculino', 'Feminino', 'Prefiro não informar'].map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.generoOption,
                  genero === option && styles.generoOptionSelected,
                ]}
                onPress={() => setGenero(option)}
                activeOpacity={0.8}
                disabled={isLoading || showSuccessAnimation}>
                <View
                  style={[
                    styles.generoRadio,
                    genero === option && styles.generoRadioSelected,
                  ]}>
                  {genero === option && (
                    <View style={styles.generoRadioInner} />
                  )}
                </View>
                <Text
                  style={[
                    styles.generoOptionText,
                    genero === option && styles.generoOptionTextSelected,
                  ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'tipoSanguineo':
        const tiposSanguineos = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        return (
          <View style={styles.tipoSanguineoContainer}>
            {tiposSanguineos.map(tipo => (
              <TouchableOpacity
                key={tipo}
                style={[
                  styles.tipoSanguineoOption,
                  tipoSanguineo === tipo && styles.tipoSanguineoOptionSelected,
                ]}
                onPress={() => setTipoSanguineo(tipo)}
                activeOpacity={0.8}
                disabled={isLoading || showSuccessAnimation}>
                <Text
                  style={[
                    styles.tipoSanguineoText,
                    tipoSanguineo === tipo && styles.tipoSanguineoTextSelected,
                  ]}>
                  {tipo}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />

      {/* Fundo animado */}
      <Animated.View
        style={[
          styles.backgroundCircle,
          {
            opacity: backgroundAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.05, 0.15],
            }),
            transform: [
              {
                scale: backgroundAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.2],
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
              outputRange: [0.1, 0.05],
            }),
            transform: [
              {
                scale: backgroundAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.2, 1],
                }),
              },
            ],
          },
        ]}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header com botão de voltar - APENAS a partir do segundo step */}
        <View style={styles.header}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
              disabled={isLoading || showSuccessAnimation}>
              <Icon name="arrow-left" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [{scale: logoScaleAnim}],
                opacity: fadeAnim,
              },
            ]}>
            <Image
              source={require('../../images/logoComNome.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Conteúdo principal */}
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}],
              },
            ]}>
            {/* Título do step */}
            <View style={styles.titleContainer}>
              <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
              <Text style={styles.stepSubtitle}>
                {steps[currentStep].subtitle}
              </Text>
            </View>

            {/* Conteúdo do step */}
            <View style={styles.stepContent}>{renderStepContent()}</View>

            {/* Botão de continuar */}
            <Animated.View style={{transform: [{scale: buttonScaleAnim}]}}>
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  (isLoading || showSuccessAnimation) &&
                    styles.continueButtonDisabled,
                ]}
                onPress={handleNext}
                disabled={isLoading || showSuccessAnimation}
                activeOpacity={0.8}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.continueButtonText}>
                      {currentStep === steps.length - 1
                        ? 'Finalizar'
                        : 'Continuar'}
                    </Text>
                    {currentStep < steps.length - 1 && (
                      <Icon
                        name="arrow-right"
                        size={16}
                        color="#FFFFFF"
                        style={styles.buttonIcon}
                      />
                    )}
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </ScrollView>

        {/* Footer com progresso */}
        <View style={styles.footer}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentStep + 1} de {steps.length}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Modal de animação de sucesso */}
      {showSuccessAnimation && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          hardwareAccelerated={true}>
          <View style={styles.successOverlay}>
            <View style={styles.darkBackground} />
            <LottieView
              ref={lottieRef}
              source={require('../../assets/animations/success.json')}
              style={styles.lottieAnimation}
              loop={false}
              autoPlay={true}
              onAnimationFinish={handleLottieAnimationFinish}
              speed={1.0}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

/**
 * Estilos do componente CompleteProfileScreen
 * @constant {Object} styles - Objeto contendo todos os estilos do componente
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121A29',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingBottom: 15,
    minHeight: 60,
  },
  backButton: {
    width: isMediumScreen ? 38 : 44,
    height: isMediumScreen ? 38 : 44,
    borderRadius: 22,
    backgroundColor: '#1E2A3A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: isSmallScreen ? 16 : isMediumScreen ? 18 : 20,
    paddingTop: 10,
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
    backgroundColor: '#D03D61',
    bottom: -width * 0.6,
    right: -width * 0.4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    height: isSmallScreen ? 120 : isMediumScreen ? 140 : 160,
    maxWidth: 200,
  },
  content: {
    alignItems: 'center',
    paddingBottom: 40,
    flex: 1,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  stepTitle: {
    fontSize: isSmallScreen ? 24 : isMediumScreen ? 28 : 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
    fontFamily: 'Georgia',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#8A8A8A',
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  stepContent: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 40,
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 16,
    width: '100%',
  },
  input: {
    height: 56,
    backgroundColor: '#1E2A3A',
    borderRadius: 14,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2A3441',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    fontWeight: '500',
  },
  textArea: {
    height: 120,
    paddingTop: 16,
    textAlign: 'left',
  },
  inputFocused: {
    borderColor: '#4D97DB',
    shadowColor: '#4D97DB',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  dateContainer: {
    alignItems: 'center',
  },
  dateButton: {
    height: 56,
    backgroundColor: '#1E2A3A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3441',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
    marginBottom: 20,
  },
  dateIcon: {
    marginRight: 12,
  },
  dateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  generoContainer: {
    gap: 16,
    width: '100%',
  },
  generoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#1E2A3A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  generoOptionSelected: {
    borderColor: '#4D97DB',
    backgroundColor: '#1E2A3A',
  },
  generoRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8A8A8A',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generoRadioSelected: {
    borderColor: '#4D97DB',
  },
  generoRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4D97DB',
  },
  generoOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  generoOptionTextSelected: {
    color: '#4D97DB',
  },
  tipoSanguineoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
  },
  tipoSanguineoOption: {
    width: 70,
    height: 56,
    backgroundColor: '#1E2A3A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3441',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipoSanguineoOptionSelected: {
    borderColor: '#4D97DB',
    backgroundColor: '#1E2A3A',
    shadowColor: '#4D97DB',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  tipoSanguineoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  tipoSanguineoTextSelected: {
    color: '#4D97DB',
  },
  continueButton: {
    height: 56,
    backgroundColor: '#D03D61',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    minWidth: 200,
    shadowColor: '#D03D61',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonDisabled: {
    backgroundColor: '#8A4A5C',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  footer: {
    backgroundColor: 'rgba(255, 255, 255, 0)',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    maxWidth: 300,
    height: 6,
    backgroundColor: '#2A3441',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4D97DB',
    borderRadius: 3,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  progressText: {
    color: '#8A8A8A',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  successOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
});

export default CompleteProfileScreen;