import React, {useState} from 'react';
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
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width, height } = Dimensions.get('window');

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const navigation = useNavigation();

  const goToRegister = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Register' }],
    });
  }

  const signIn = async () => {
    if (!email || !password) {
      console.log('Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
      console.log("Usuário logado!");
    } catch (error) {
      console.log('Erro no login:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const signInWithGoogle = () => {
    console.log('Ainda vai vir');
  }

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
          <Text style={styles.welcomeText}>Bem-vindo de volta!</Text>
          <Text style={styles.subtitleText}>Entre na sua conta para continuar</Text>
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
              placeholder="Digite sua senha"
              placeholderTextColor="#8A8A8A"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
            onPress={signIn}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator size="large" color="#FFFFFF" /> : <Text style={styles.loginButtonText}>Entrar</Text> }
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={signInWithGoogle}
          >
            <View>
              <Icon name="google" size={20} color="#FFFFFF">  </Icon>
            </View>
            <Text style={styles.googleButtonText}>Continuar com Google</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <TouchableOpacity onPress={goToRegister} style={styles.registerContainer}>
            <Text style={styles.registerText}>
              Não tem uma conta? 
            </Text>
            <Text style={styles.registerHighlight}> Criar conta</Text>
          </TouchableOpacity>
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
    paddingTop: 180,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 32,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: '#4D97DB',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    height: 56,
    backgroundColor: '#D03D61',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D03D61',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
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
    marginBottom: 32,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  footerContainer: {
    paddingBottom: 50,
    paddingTop: 40,
    alignItems: 'center',
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerText: {
    color: '#8A8A8A',
    fontSize: 16,
  },
  registerHighlight: {
    color: '#4D97DB',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;