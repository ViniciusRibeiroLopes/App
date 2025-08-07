import React, { useState } from 'react';
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
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width, height } = Dimensions.get('window');

// Breakpoints responsivos
const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

const RegisterScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const navigation = useNavigation();

  const goToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

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

  const signUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      console.log('Usuário criado com sucesso:', userCredential);
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
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithGoogle = () => {
    console.log('Algum dia');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />
      
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../images/logoComNome.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.welcomeText}>Criar Conta</Text>
          </View>
        </View>

        {/* Formulário */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>E-mail</Text>
            <TextInput
              style={[
                styles.input,
                emailFocused && styles.inputFocused
              ]}
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

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Senha</Text>
            <TextInput
              style={[
                styles.input,
                passwordFocused && styles.inputFocused
              ]}
              placeholder="Crie uma senha (mín. 6 caracteres)"
              placeholderTextColor="#8A8A8A"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
          </View>

          <TouchableOpacity 
            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]} 
            onPress={signUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.registerButtonText}>Criar Conta</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={signUpWithGoogle}
          >
            <Icon name="google" size={16} color="#FFFFFF" />
            <Text style={styles.googleButtonText}>Continuar com Google</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <TouchableOpacity onPress={goToLogin} style={styles.loginContainer}>
            <Text style={styles.loginText}>
              Já possui uma conta? 
            </Text>
            <Text style={styles.loginHighlight}> Entrar</Text>
          </TouchableOpacity>
          
          <Text style={styles.termsText}>
            Ao criar uma conta, você concorda com nossos{'\n'}
            <Text style={styles.termsLink}>Termos de Uso</Text> e{' '}
            <Text style={styles.termsLink}>Política de Privacidade</Text>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121A29',
  },
  content: {
    height: height,
    paddingHorizontal: isSmallScreen ? 20 : isMediumScreen ? 24 : 28,
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  logoContainer: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -300 / 2 }],
    alignItems: 'center',
  },
  logo: {
    marginTop: -30,
    height: isSmallScreen ? 210 : isMediumScreen ? 260 : 310,
    maxWidth: 300,
  },
  titleContainer: {
    alignItems: 'flex-start',
  },
  welcomeText: {
    marginTop: 150,
    fontSize: isSmallScreen ? 24 : isMediumScreen ? 26 : 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  formContainer: {
    marginTop: 10,
    marginBottom: 60,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    height: 50,
    backgroundColor: '#1E2A3A',
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  inputFocused: {
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
  registerButton: {
    height: 52,
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
    shadowOpacity: 0.3,
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
    fontSize: 16,
    fontWeight: 'bold',
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
    marginHorizontal: 16,
    color: '#8A8A8A',
    fontSize: 14,
  },
  googleButton: {
    height: 50,
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
  },
  footerContainer: {
    position: 'absolute',
    bottom: 30,
    left: isSmallScreen ? 20 : isMediumScreen ? 24 : 28,
    right: isSmallScreen ? 20 : isMediumScreen ? 24 : 28,
    alignItems: 'center',
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
  },
  loginHighlight: {
    color: '#4D97DB',
    fontSize: 15,
    fontWeight: 'bold',
  },
  termsText: {
    color: '#6A6A6A',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  termsLink: {
    color: '#4D97DB',
    fontWeight: '500',
  },
});

export default RegisterScreen;