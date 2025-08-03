import React, { useState } from 'react';
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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const AdicionarDependentes = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nomeCompleto: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    parentesco: '',
    genero: '',
    dataNascimento: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const user = auth().currentUser;
  const isEditing = route?.params?.dependente;

  React.useEffect(() => {
    if (isEditing) {
      const dep = route.params.dependente;
      setFormData({
        nomeCompleto: dep.nome || dep.nomeCompleto || '',
        email: dep.email || '',
        senha: '',
        confirmarSenha: '',
        parentesco: dep.parentesco || '',
        genero: dep.genero || '',
        dataNascimento: dep.dataNascimento?.toDate ? dep.dataNascimento.toDate() : new Date(),
      });
    }
  }, [isEditing]);

  const parentescoOptions = [
    'Pai/Mãe',
    'Avô/Avó',
    'Filho(a)',
    'Irmão/Irmã',
    'Marido/Esposa',
    'Tio(a)',
    'Primo(a)',
    'Sogro(a)',
    'Genro/Nora',
    'Outro'
  ];

  const validarFormulario = () => {
    const { nomeCompleto, email, senha, confirmarSenha, parentesco, genero } = formData;

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

      if (senha !== confirmarSenha) {
        Alert.alert('Erro', 'As senhas não coincidem.');
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
      
      // Tratamento de erros específicos
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

  const salvarDependente = async () => {
    if (!validarFormulario()) return;

    setLoading(true);

    try {
      let dependenteUid = null;

      if (!isEditing) {
        dependenteUid = await criarUsuarioViaAPI(
          formData.email,
          formData.senha,
        );
      }

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
        await firestore()
          .collection('users_dependentes')
          .doc(route.params.dependente.id)
          .update(dadosDependente);
        
        Alert.alert('Sucesso', 'Dependente atualizado com sucesso!');
      } else {
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

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setFormData(prev => ({
        ...prev,
        dataNascimento: selectedDate
      }));
    }
  };

  const formatarData = (data) => {
    return data.toLocaleDateString('pt-BR');
  };

  const renderGeneroSelector = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>👤 Gênero</Text>
      <View style={styles.generoContainer}>
        <TouchableOpacity
          style={[
            styles.generoOption,
            formData.genero === 'masculino' && styles.generoOptionSelected
          ]}
          onPress={() => setFormData(prev => ({...prev, genero: 'masculino'}))}
        >
          <Text style={styles.generoEmoji}>👨</Text>
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
        >
          <Text style={styles.generoEmoji}>👩</Text>
          <Text style={[
            styles.generoText,
            formData.genero === 'feminino' && styles.generoTextSelected
          ]}>
            Feminino
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121a29" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {isEditing ? '✏️ Editar Dependente' : '👥 Novo Dependente'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isEditing ? 'Atualize as informações' : 'Cadastre uma pessoa sob seus cuidados'}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Nome Completo */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>👤 Nome Completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o nome completo"
            placeholderTextColor="#999"
            value={formData.nomeCompleto}
            onChangeText={(text) => setFormData(prev => ({...prev, nomeCompleto: text}))}
          />
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>📧 Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(text) => setFormData(prev => ({...prev, email: text}))}
          />
        </View>

        {/* Gênero */}
        {renderGeneroSelector()}

        {/* Senhas (apenas se não estiver editando) */}
        {!isEditing && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>🔒 Senha</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite a senha (mín. 6 caracteres)"
                placeholderTextColor="#999"
                secureTextEntry
                value={formData.senha}
                onChangeText={(text) => setFormData(prev => ({...prev, senha: text}))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>🔒 Confirmar Senha</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite a senha novamente"
                placeholderTextColor="#999"
                secureTextEntry
                value={formData.confirmarSenha}
                onChangeText={(text) => setFormData(prev => ({...prev, confirmarSenha: text}))}
              />
            </View>
          </>
        )}

        {/* Parentesco */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>👨‍👩‍👧‍👦 Parentesco</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.parentesco}
              onValueChange={(itemValue) => setFormData(prev => ({...prev, parentesco: itemValue}))}
              style={styles.picker}
              dropdownIconColor="#121a29"
            >
              <Picker.Item label="Selecione o parentesco" value="" color="#999" />
              {parentescoOptions.map(opcao => (
                <Picker.Item key={opcao} label={opcao} value={opcao} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Data de Nascimento */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>📅 Data de Nascimento</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {formatarData(formData.dataNascimento)}
            </Text>
            <Text style={styles.dateIcon}>📅</Text>
          </TouchableOpacity>
        </View>

        {/* Botão Salvar */}
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={salvarDependente}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.saveButtonIcon}>
                {isEditing ? '✓' : '+'}
              </Text>
              <Text style={styles.saveButtonText}>
                {isEditing ? 'ATUALIZAR DEPENDENTE' : 'CADASTRAR DEPENDENTE'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Informações importantes */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Informações Importantes</Text>
          <Text style={styles.infoText}>
            • Uma conta será criada automaticamente para o dependente via API{'\n'}
            • O login NÃO será feito automaticamente no dispositivo{'\n'}
            • O dependente poderá acessar o app com o email e senha fornecidos{'\n'}
            • Você será responsável por gerenciar os medicamentos desta pessoa
          </Text>
        </View>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.dataNascimento}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#121a29',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 25,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#cbd5e0',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121a29',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#121a29',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  generoContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  generoOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  generoOptionSelected: {
    borderColor: '#121a29',
    backgroundColor: '#121a29',
  },
  generoEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  generoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  generoTextSelected: {
    color: '#fff',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  picker: {
    height: 50,
    color: '#121a29',
  },
  dateButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  dateButtonText: {
    fontSize: 16,
    color: '#121a29',
  },
  dateIcon: {
    fontSize: 18,
  },
  saveButton: {
    backgroundColor: '#121a29',
    borderRadius: 25,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    marginTop: 10,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#718096',
  },
  saveButtonIcon: {
    fontSize: 18,
    color: '#fff',
    marginRight: 8,
    fontWeight: '600',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121a29',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
});

export default AdicionarDependentes;