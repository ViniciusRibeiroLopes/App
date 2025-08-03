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
  ScrollView,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width, height } = Dimensions.get('window');

const RegisterScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const navigation = useNavigation();

  const goToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Por favor, digite seu nome');
      return false;
    }
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
    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
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
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.welcomeText}>Criar Conta</Text>
          <Text style={styles.subtitleText}>Preencha os dados para começar</Text>
        </View>

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
            {isLoading ? <ActivityIndicator size="large" color="#FFFFFF" /> : <Text style={styles.registerButtonText}>Criar Conta</Text> }
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
            <View>
              <Icon name="google" size={20} color="#FFFFFF">  </Icon>
            </View>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121A29',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerContainer: {
    alignItems: 'center',
    paddingTop: 160,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D03D61',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D03D61',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: '#8A8A8A',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    height: 56,
    backgroundColor: '#1E2A3A',
    borderRadius: 16,
    paddingHorizontal: 20,
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
  inputError: {
    borderColor: '#D03D61',
    shadowColor: '#D03D61',
  },
  errorText: {
    color: '#D03D61',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  registerButton: {
    height: 56,
    backgroundColor: '#D03D61',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
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
    height: 56,
    backgroundColor: '#1E2A3A',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A3441',
    marginTop: 20,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  footerContainer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginText: {
    color: '#8A8A8A',
    fontSize: 16,
  },
  loginHighlight: {
    color: '#4D97DB',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsText: {
    color: '#6A6A6A',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#4D97DB',
    fontWeight: '500',
  },
});

export default RegisterScreen;