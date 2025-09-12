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
  ActivityIndicator,
  Image,
  Animated,
  ScrollView,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/FontAwesome';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Obtém as dimensões da tela do dispositivo
 * @type {Object}
 * @property {number} width - Largura da tela
 * @property {number} height - Altura da tela
 */
const {width, height} = Dimensions.get('window');

/**
 * Determina se a tela é considerada pequena (largura < 360px)
 * @type {boolean}
 */
const isSmallScreen = width < 360;

/**
 * Determina se a tela é considerada média (largura entre 360px e 400px)
 * @type {boolean}
 */
const isMediumScreen = width >= 360 && width < 400;

/**
 * Determina se a tela é considerada grande (largura >= 400px)
 * @type {boolean}
 */
const isLargeScreen = width >= 400;

/**
 * Componente de tela de login com autenticação Firebase
 * 
 * Este componente oferece uma interface completa de login com:
 * - Autenticação por email/senha
 * - Integração com Firebase Auth
 * - Animações personalizadas
 * - Modal de sucesso com animação Lottie
 * - Responsividade para diferentes tamanhos de tela
 * - Validação de campos
 * - Tratamento de erros
 * 
 * @component
 * @returns {React.JSX.Element} O componente da tela de login
 * 
 * @example
 * // Uso básico do componente
 * <LoginScreen />
 * 
 * @author Seu Nome
 * @version 1.0.0
 * @since 2024
 */
const LoginScreen = () => {
  // Estados do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Referências para animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const googleButtonScaleAnim = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef(null);

  const navigation = useNavigation();

  /**
   * Efeito para inicializar as animações da tela
   * Executa animações paralelas de fade, slide e escala do logo,
   * além de uma animação contínua do fundo
   * 
   * @function
   * @name useEffect
   */
  useEffect(() => {
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

    return () => backgroundAnimation.stop();
  }, [backgroundAnim, fadeAnim, logoScaleAnim, slideAnim]);

  /**
   * Navega para a tela de registro
   * Reseta a pilha de navegação e direciona para a tela de registro
   * 
   * @function goToRegister
   */
  const goToRegister = () => {
    navigation.reset({
      index: 0,
      routes: [{name: 'Register'}],
    });
  };

  /**
   * Exibe o modal de animação de sucesso
   * Ativa o estado que controla a exibição do modal com animação Lottie
   * 
   * @function showSuccessAnimationOverlay
   */
  const showSuccessAnimationOverlay = () => {
    console.log('🎯 Iniciando modal de sucesso');
    setShowSuccessAnimation(true);
  };

  /**
   * Manipula o fim da animação Lottie de sucesso
   * Salva o estado da animação no AsyncStorage e fecha o modal após delay
   * 
   * @async
   * @function handleLottieAnimationFinish
   * @throws {Error} Erro ao salvar no AsyncStorage
   */
  const handleLottieAnimationFinish = async () => {
    console.log('🎬 Animação Lottie finalizada!');
    
    try {
      await AsyncStorage.setItem('loginAnimationCompleted', 'true');
      console.log('✅ AsyncStorage atualizado - animação concluída');
    } catch (error) {
      console.error('Erro ao salvar no AsyncStorage:', error);
    }
    
    setTimeout(() => {
      console.log('⏰ Fechando modal de sucesso');
      setShowSuccessAnimation(false);
    }, 500);
  };

  /**
   * Efeito para controlar a reprodução da animação Lottie
   * Monitora o estado showSuccessAnimation e gerencia a reprodução da animação,
   * incluindo timers de debug e fallback
   * 
   * @function
   * @name useEffect
   */
  useEffect(() => {
    if (showSuccessAnimation) {
      console.log('📺 Modal está visível, verificando Lottie...');
      
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
        console.log('⚠️ Fallback timer - finalizando');
        await handleLottieAnimationFinish();
      }, 3000);
      
      return () => {
        clearTimeout(debugTimer);
        clearTimeout(fallbackTimer);
      };
    }
  }, [showSuccessAnimation]);

  /**
   * Realiza o login do usuário com email e senha
   * Valida os campos, executa animação do botão, autentica via Firebase
   * e gerencia estados de loading e erros
   * 
   * @async
   * @function signIn
   * @throws {Error} Erros de autenticação do Firebase
   * 
   * @example
   * // Chamado quando o usuário pressiona o botão "Entrar"
   * await signIn();
   */
  const signIn = async () => {
    if (!email || !password) {
      Alert.alert('Campos obrigatórios', 'Por favor, preencha todos os campos');
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

    setIsLoading(true);
    
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      console.log('Login realizado com sucesso:', userCredential.user.email);
      
      setIsLoading(false);
      
      showSuccessAnimationOverlay();
      
    } catch (error) {
      console.log('Erro no login:', error.code, error.message);
      setIsLoading(false);
      
      let errorMessage = 'Erro no login. Tente novamente.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuário não encontrado.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Senha incorreta.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas. Tente mais tarde.';
          break;
      }
      
      Alert.alert('Erro no Login', errorMessage);
    }
  };

  /**
   * Inicia o processo de login com Google
   * Executa animação do botão e exibe alerta temporário sobre implementação futura
   * 
   * @function signInWithGoogle
   * @todo Implementar integração com Google Sign-In
   * 
   * @example
   * // Chamado quando o usuário pressiona "Continuar com Google"
   * signInWithGoogle();
   */
  const signInWithGoogle = () => {
    Animated.sequence([
      Animated.timing(googleButtonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(googleButtonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    Alert.alert('Em breve', 'Login com Google será implementado em breve.');
  };

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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          
          {/* Container do logo com animação */}
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

          {/* Conteúdo principal do formulário */}
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}],
              },
            ]}>
            <Text style={styles.welcomeText}>Bem-vindo de volta!</Text>

            <View style={styles.formContainer}>
              {/* Campo de email */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>E-mail</Text>
                <TextInput
                  style={[styles.input, emailFocused && styles.inputFocused]}
                  placeholder="Digite seu e-mail"
                  placeholderTextColor="#8A8A8A"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoCapitalize="none"
                  editable={!isLoading && !showSuccessAnimation}
                />
              </View>

              {/* Campo de senha */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Senha</Text>
                <TextInput
                  style={[styles.input, passwordFocused && styles.inputFocused]}
                  placeholder="Digite sua senha"
                  placeholderTextColor="#8A8A8A"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  editable={!isLoading && !showSuccessAnimation}
                />
              </View>

              {/* Link "Esqueceu a senha?" */}
              <TouchableOpacity 
                style={styles.forgotPassword}
                disabled={isLoading || showSuccessAnimation}>
                <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
              </TouchableOpacity>

              {/* Botão de login */}
              <Animated.View style={{transform: [{scale: buttonScaleAnim}]}}>
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    (isLoading || showSuccessAnimation) && styles.loginButtonDisabled,
                  ]}
                  onPress={signIn}
                  disabled={isLoading || showSuccessAnimation}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Entrar</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>

              {/* Divisor "ou" */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Botão do Google */}
              <Animated.View
                style={{transform: [{scale: googleButtonScaleAnim}]}}>
                <TouchableOpacity
                  style={[
                    styles.googleButton,
                    (isLoading || showSuccessAnimation) && styles.buttonDisabled
                  ]}
                  onPress={signInWithGoogle}
                  disabled={isLoading || showSuccessAnimation}>
                  <Icon name="google" size={16} color="#FFFFFF" />
                  <Text style={styles.googleButtonText}>
                    Continuar com Google
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Rodapé com link para registro */}
            <View style={styles.footerContainer}>
              <TouchableOpacity
                onPress={goToRegister}
                style={styles.registerContainer}
                disabled={isLoading || showSuccessAnimation}>
                <Text style={styles.registerText}>Não tem uma conta?</Text>
                <Text style={styles.registerHighlight}> Criar conta</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
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
 * Estilos do componente LoginScreen
 * Define a aparência visual de todos os elementos da tela de login,
 * incluindo responsividade para diferentes tamanhos de tela
 * 
 * @type {Object}
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121A29',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: isSmallScreen ? 16 : isMediumScreen ? 18 : 20,
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
    paddingTop: isSmallScreen ? 5 : isMediumScreen ? 10 : 20,
    marginBottom: -10,
  },
  logo: {
    height: isSmallScreen ? 180 : isMediumScreen ? 200 : 240,
    maxWidth: 250,
  },
  content: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  welcomeText: {
    fontSize: isSmallScreen ? 22 : isMediumScreen ? 26 : 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: -20,
    letterSpacing: 0.5,
    fontFamily: 'Georgia',
  },
  formContainer: {
    maxWidth: 400,
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#E1E7ED',
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  input: {
    height: 56,
    backgroundColor: '#1E2A3A',
    borderRadius: 14,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2A3441',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    fontWeight: '400',
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotPasswordText: {
    color: '#4D97DB',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  loginButton: {
    height: 56,
    backgroundColor: '#D03D61',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#D03D61',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: '#8A4A5C',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2A3441',
  },
  dividerText: {
    marginHorizontal: 20,
    color: '#8A8A8A',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  googleButton: {
    height: 56,
    backgroundColor: '#1E2A3A',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A3441',
    gap: 12,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  registerText: {
    color: '#8A8A8A',
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  registerHighlight: {
    color: '#4D97DB',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
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

export default LoginScreen;