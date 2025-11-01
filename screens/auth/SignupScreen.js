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
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/FontAwesome';

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
 * Componente de tela de registro/cadastro com autenticação Firebase
 * 
 * Este componente oferece uma interface completa de registro com:
 * - Criação de conta com email/senha
 * - Integração com Firebase Auth
 * - Validação de formulário
 * - Animações suaves e interativas
 * - Design responsivo para diferentes tamanhos de tela
 * - Tratamento de erros específicos
 * - Opção futura para registro com Google
 * - Navegação para tela de login
 * - Termos de uso e política de privacidade
 * 
 * @component
 * @returns {React.JSX.Element} O componente da tela de registro
 * 
 * @example
 * // Uso básico do componente
 * <RegisterScreen />
 * 
 * @example
 * // Integrado com navegação
 * <Stack.Screen 
 *   name="Register" 
 *   component={RegisterScreen} 
 *   options={{headerShown: false}}
 * />
 * 
 * @version 1.0.0
 * @since 2025
 */
const RegisterScreen = () => {
  // Estados do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Referências para animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const googleButtonScaleAnim = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  const navigation = useNavigation();

  /**
   * Efeito para inicializar as animações da tela
   * Executa animações paralelas de entrada suave dos elementos
   * e uma animação infinita do fundo
   * 
   * @function
   * @name useEffect
   */
  useEffect(() => {
    // Entrada suave dos elementos
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

    // Animação infinita do fundo
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
   * Navega para a tela de login
   * Reseta a pilha de navegação e direciona para a tela de login
   * 
   * @function goToLogin
   * 
   * @example
   * // Chamado quando usuário clica em "Entrar"
   * goToLogin();
   */
  const goToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{name: 'Login'}],
    });
  };

  /**
   * Valida os campos do formulário de registro
   * Verifica se email e senha foram preenchidos corretamente
   * e se a senha atende aos critérios mínimos
   * 
   * @function validateForm
   * @returns {boolean} true se o formulário é válido, false caso contrário
   * 
   * @example
   * // Antes de criar a conta
   * if (!validateForm()) return;
   */
  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Por favor, digite seu email');
      return false;
    }
    if (!password) {
      Alert.alert('Erro', 'Por favor, digite uma senha');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return false;
    }
    return true;
  };

  /**
   * Cria uma nova conta de usuário com Firebase Auth
   * Valida o formulário, executa animação do botão e cria a conta
   * com tratamento específico de erros do Firebase
   * 
   * @async
   * @function signUp
   * @throws {Error} Erros específicos do Firebase Auth
   * 
   * @example
   * // Chamado quando usuário pressiona "Criar Conta"
   * await signUp();
   */
  const signUp = async () => {
    if (!validateForm()) return;

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
      const userCredential = await auth().createUserWithEmailAndPassword(
        email,
        password,
      );
      console.log('Usuário criado com sucesso:', userCredential);
      // Mantém isLoading como true - será false apenas quando sair da tela
      // ou quando houver erro
    } catch (error) {
      console.error('Erro ao criar conta:', error);

      let errorMessage = 'Erro inesperado ao criar conta';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já possui uma conta!';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido!';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'A senha é muito fraca!';
      }

      Alert.alert('Erro', errorMessage);
      setIsLoading(false); // Só desativa o loading em caso de erro
    }
  };

  /**
   * Inicia o processo de registro com Google
   * Executa animação do botão Google
   * Funcionalidade ainda não implementada
   * 
   * @function signUpWithGoogle
   * @todo Implementar integração com Google Sign-In
   * 
   * @example
   * // Chamado quando usuário pressiona "Continuar com Google"
   * signUpWithGoogle();
   */
  const signUpWithGoogle = () => {
    // Animação do botão Google
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

    console.log('Algum dia');
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
            {/* Título da tela */}
            <Text style={styles.welcomeText}>Vamos começar?</Text>

            {/* Container do formulário */}
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
                />
              </View>

              {/* Campo de senha */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Senha</Text>
                <TextInput
                  style={[styles.input, passwordFocused && styles.inputFocused]}
                  placeholder="Crie uma senha (mín. 6 caracteres)"
                  placeholderTextColor="#8A8A8A"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
              </View>

              {/* Botão de criar conta */}
              <Animated.View style={{transform: [{scale: buttonScaleAnim}]}}>
                <TouchableOpacity
                  style={[
                    styles.registerButton,
                    isLoading && styles.registerButtonDisabled,
                  ]}
                  onPress={signUp}
                  disabled={isLoading}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.registerButtonText}>Criar Conta</Text>
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
                  style={styles.googleButton}
                  onPress={signUpWithGoogle}>
                  <Icon name="google" size={16} color="#FFFFFF" />
                  <Text style={styles.googleButtonText}>
                    Continuar com Google
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Rodapé com link de login e termos */}
            <View style={styles.footerContainer}>
              {/* Link para tela de login */}
              <TouchableOpacity
                onPress={goToLogin}
                style={styles.loginContainer}>
                <Text style={styles.loginText}>Já possui uma conta?</Text>
                <Text style={styles.loginHighlight}> Entrar</Text>
              </TouchableOpacity>

              {/* Termos de uso e política de privacidade */}
              <Text style={styles.termsText}>
                Ao criar uma conta, você concorda com nossos{'\n'}
                <Text style={styles.termsLink}>Termos de Uso</Text> e{' '}
                <Text style={styles.termsLink}>Política de Privacidade</Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/**
 * Estilos do componente RegisterScreen
 * Define a aparência visual de todos os elementos da tela de registro,
 * incluindo responsividade para diferentes tamanhos de tela e estados
 * de foco dos campos de entrada
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
  registerButton: {
    height: 56,
    backgroundColor: '#D03D61',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
  registerButtonDisabled: {
    backgroundColor: '#8A4A5C',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  registerButtonText: {
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
  footerContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loginText: {
    color: '#8A8A8A',
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  loginHighlight: {
    color: '#4D97DB',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  termsText: {
    color: '#6A6A6A',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    letterSpacing: 0.2,
  },
  termsLink: {
    color: '#4D97DB',
    fontWeight: '500',
  },
});

export default RegisterScreen;