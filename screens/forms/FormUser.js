import React, {useState, useEffect, useRef} from 'react';
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

const {width, height} = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

const CompleteProfileScreen = ({onProfileCreated}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [nome, setnome] = useState('');
  const [datanasc, setDatanasc] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [genero, setGenero] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0.33)).current;
  const lottieRef = useRef(null);

  const navigation = useNavigation();

  const steps = [
    {
      title: 'Qual é o seu nome?',
      subtitle: 'Como você gostaria de ser chamado?',
      placeholder: 'Digite seu nome completo',
      type: 'text',
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
  ];

  useEffect(() => {
    startAnimations();
  }, []);

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
  }, [currentStep]);

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

  const showSuccessAnimationOverlay = () => {
    console.log('🎯 Iniciando modal de sucesso do perfil');
    setShowSuccessAnimation(true);
  };

  const handleLottieAnimationFinish = async () => {
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
  };

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
  }, [showSuccessAnimation]);

  const formatDate = date => {
    return date.toLocaleDateString('pt-BR');
  };

  const handleNext = () => {
    if (currentStep === 0 && !nome.trim()) {
      Alert.alert('Atenção', 'Por favor, digite seu nome completo');
      return;
    }

    if (currentStep === 1) {
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

    if (currentStep === 2 && !genero) {
      Alert.alert('Atenção', 'Por favor, selecione seu gênero');
      return;
    }

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

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeProfile = async () => {
    setIsLoading(true);
    try {
      const user = auth().currentUser;
      if (user) {
        await firestore().collection('users').doc(user.uid).set({
          nome,
          datanasc: datanasc.toISOString(),
          genero,
          email: user.email,
          perfilCompleto: true,
        });

        console.log('Perfil salvo com sucesso para:', user.email);
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

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || datanasc;
    setShowDatePicker(Platform.OS === 'ios');
    setDatanasc(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.type) {
      case 'text':
        return (
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, inputFocused && styles.inputFocused]}
              placeholder={step.placeholder}
              placeholderTextColor="#8A8A8A"
              value={nome}
              onChangeText={setnome}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              autoFocus={currentStep === 0}
              autoCapitalize="words"
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
