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
import Ionicons from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {width, height} = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

/**
 * Componente de tela de login com autenticação Firebase e recuperação de senha
 */
const LoginScreen = () => {
  // Estados do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Estados do modal de recuperação de senha
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailFocused, setResetEmailFocused] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Referências para animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const googleButtonScaleAnim = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef(null);

  // Referências para animações do modal
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(50)).current;
  const successIconAnim = useRef(new Animated.Value(0)).current;

  const navigation = useNavigation();

  const [showPassword, setShowPassword] = useState(false);

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

  // Animações do modal de recuperação
  useEffect(() => {
    if (showForgotPasswordModal) {
      Animated.parallel([
        Animated.timing(modalFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(modalSlideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      modalFadeAnim.setValue(0);
      modalSlideAnim.setValue(50);
      successIconAnim.setValue(0);
      setResetEmailSent(false);
      setResetEmail('');
    }
  }, [showForgotPasswordModal, modalFadeAnim, modalSlideAnim, successIconAnim]);

  // Animação do ícone de sucesso
  useEffect(() => {
    if (resetEmailSent) {
      Animated.sequence([
        Animated.timing(successIconAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(successIconAnim, {
          toValue: 1.1,
          tension: 50,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(successIconAnim, {
          toValue: 1,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [resetEmailSent, successIconAnim]);

  const goToRegister = () => {
    navigation.reset({
      index: 0,
      routes: [{name: 'Register'}],
    });
  };

  const showSuccessAnimationOverlay = () => {
    console.log('🎯 Iniciando modal de sucesso');
    setShowSuccessAnimation(true);
  };

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
      const userCredential = await auth().signInWithEmailAndPassword(
        email,
        password,
      );
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

  // Abrir modal de recuperação de senha
  const openForgotPasswordModal = () => {
    console.log('📧 Tentando abrir modal de recuperação de senha');
    console.log('📧 isLoading:', isLoading);
    console.log('📧 showSuccessAnimation:', showSuccessAnimation);
    console.log('📧 Email atual:', email);

    setResetEmail(email); // Pré-preencher com o email do login
    setShowForgotPasswordModal(true);

    console.log('📧 Modal deve estar visível agora');
  };

  // Fechar modal de recuperação
  const closeForgotPasswordModal = () => {
    console.log('❌ Fechando modal de recuperação');
    setShowForgotPasswordModal(false);
  };

  // Validar email
  const validateEmail = emailToValidate => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailToValidate);
  };

  // Enviar email de recuperação
  const handlePasswordReset = async () => {
    console.log('🔄 Iniciando recuperação de senha para:', resetEmail);

    // Validações
    if (!resetEmail.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, digite seu email');
      return;
    }

    if (!validateEmail(resetEmail)) {
      Alert.alert('Email inválido', 'Por favor, digite um email válido');
      return;
    }

    setIsResettingPassword(true);

    try {
      await auth().sendPasswordResetEmail(resetEmail);
      console.log('✅ Email de recuperação enviado com sucesso');

      setIsResettingPassword(false);
      setResetEmailSent(true);

      // Fechar modal após 3 segundos
      setTimeout(() => {
        closeForgotPasswordModal();
      }, 3000);
    } catch (error) {
      console.error('❌ Erro ao enviar email de recuperação:', error);
      setIsResettingPassword(false);

      let errorMessage = 'Erro ao enviar email. Tente novamente.';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Email não encontrado. Verifique e tente novamente.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido. Digite um email válido.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas. Aguarde alguns minutos.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Erro de conexão. Verifique sua internet.';
          break;
      }

      Alert.alert('Erro', errorMessage);
    }
  };

  // Modal de recuperação de senha
  const renderForgotPasswordModal = () => {
    console.log('🎨 Renderizando modal. Visível:', showForgotPasswordModal);

    if (!showForgotPasswordModal) {
      return null;
    }

    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={closeForgotPasswordModal}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            console.log('🖱️ Clicou no overlay');
            closeForgotPasswordModal();
          }}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => {
              console.log('🖱️ Clicou no container do modal');
              e.stopPropagation();
            }}>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  opacity: modalFadeAnim,
                  transform: [{translateY: modalSlideAnim}],
                },
              ]}>
              {/* Conteúdo do modal - Estado normal */}
              {!resetEmailSent ? (
                <>
                  {/* Cabeçalho */}
                  <View style={styles.modalHeader}>
                    <View style={styles.modalIconContainer}>
                      <Ionicons name="key" size={28} color="#4D97DB" />
                    </View>
                    <Text style={styles.modalTitle}>Recuperar Senha</Text>
                    <Text style={styles.modalSubtitle}>
                      Digite seu email e enviaremos um link para redefinir sua
                      senha
                    </Text>
                  </View>

                  {/* Campo de email */}
                  <View style={styles.modalInputContainer}>
                    <Text style={styles.modalInputLabel}>E-mail</Text>
                    <TextInput
                      style={[
                        styles.modalInput,
                        resetEmailFocused && styles.modalInputFocused,
                      ]}
                      placeholder="Digite seu e-mail"
                      placeholderTextColor="#8A8A8A"
                      keyboardType="email-address"
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      onFocus={() => setResetEmailFocused(true)}
                      onBlur={() => setResetEmailFocused(false)}
                      autoCapitalize="none"
                      editable={!isResettingPassword}
                      autoFocus={true}
                    />
                  </View>

                  {/* Botões de ação */}
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.modalCancelButton}
                      onPress={closeForgotPasswordModal}
                      disabled={isResettingPassword}>
                      <Text style={styles.modalCancelText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modalConfirmButton,
                        isResettingPassword && styles.modalButtonDisabled,
                      ]}
                      onPress={handlePasswordReset}
                      disabled={isResettingPassword}>
                      {isResettingPassword ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="mail" size={18} color="#FFFFFF" />
                          <Text style={styles.modalConfirmText}>Enviar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                /* Conteúdo do modal - Estado de sucesso */
                <>
                  <Animated.View
                    style={[
                      styles.modalSuccessContainer,
                      {
                        opacity: successIconAnim,
                        transform: [{scale: successIconAnim}],
                      },
                    ]}>
                    <View style={styles.successIconCircle}>
                      <Ionicons
                        name="checkmark-circle"
                        size={64}
                        color="#10B981"
                      />
                    </View>
                    <Text style={styles.modalSuccessTitle}>Email Enviado!</Text>
                    <Text style={styles.modalSuccessMessage}>
                      Enviamos um link de recuperação para{'\n'}
                      <Text style={styles.modalSuccessEmail}>{resetEmail}</Text>
                    </Text>
                    <Text style={styles.modalSuccessHint}>
                      Verifique sua caixa de entrada e spam
                    </Text>
                  </Animated.View>

                  <TouchableOpacity
                    style={styles.modalSuccessButton}
                    onPress={closeForgotPasswordModal}>
                    <Text style={styles.modalSuccessButtonText}>Entendi</Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />

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

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Senha</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      passwordFocused && styles.inputFocused,
                    ]}
                    placeholder="Digite sua senha"
                    placeholderTextColor="#8A8A8A"
                    secureTextEntry={!showPassword} // Mudança aqui
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    editable={!isLoading && !showSuccessAnimation}
                  />
                  <TouchableOpacity
                    style={styles.eyeIconButton}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={isLoading || showSuccessAnimation}>
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="#8A8A8A"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Link Esqueceu a Senha */}
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => {
                  console.log('🖱️ CLICOU em Esqueceu a senha');
                  openForgotPasswordModal();
                }}
                disabled={isLoading || showSuccessAnimation}
                activeOpacity={0.7}>
                <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
              </TouchableOpacity>

              <Animated.View style={{transform: [{scale: buttonScaleAnim}]}}>
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    (isLoading || showSuccessAnimation) &&
                      styles.loginButtonDisabled,
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

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <Animated.View
                style={{transform: [{scale: googleButtonScaleAnim}]}}>
                <TouchableOpacity
                  style={[
                    styles.googleButton,
                    (isLoading || showSuccessAnimation) &&
                      styles.buttonDisabled,
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

      {/* Modal de sucesso do login */}
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

      {/* Modal de recuperação de senha */}
      {showForgotPasswordModal && renderForgotPasswordModal()}
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
  // ===== ESTILOS DO MODAL DE RECUPERAÇÃO =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1E2A3A',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8A8A8A',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalInputContainer: {
    marginBottom: 24,
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E1E7ED',
    marginBottom: 8,
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalInput: {
    height: 52,
    backgroundColor: '#121A29',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2A3441',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalInputFocused: {
    borderColor: '#4D97DB',
    shadowColor: '#4D97DB',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    height: 52,
    backgroundColor: 'transparent',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  modalCancelText: {
    color: '#8A8A8A',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalConfirmButton: {
    flex: 1,
    height: 52,
    backgroundColor: '#4D97DB',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#4D97DB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalButtonDisabled: {
    backgroundColor: '#2A5580',
    shadowOpacity: 0.1,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  // ===== ESTILOS DO ESTADO DE SUCESSO =====
  modalSuccessContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 24,
  },
  successIconCircle: {
    marginBottom: 20,
  },
  modalSuccessTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalSuccessMessage: {
    fontSize: 15,
    color: '#8A8A8A',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalSuccessEmail: {
    color: '#4D97DB',
    fontWeight: '600',
  },
  modalSuccessHint: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalSuccessButton: {
    height: 52,
    backgroundColor: '#10B981',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalSuccessButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  passwordInputWrapper: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIconButton: {
    position: 'absolute',
    right: 16,
    top: 17,
    padding: 4,
    zIndex: 1,
  },
});

export default LoginScreen;
