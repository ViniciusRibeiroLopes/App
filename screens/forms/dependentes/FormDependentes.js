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
  Dimensions,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 360;

const AdicionarDependentes = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
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

  const getParentescoLabel = () => {
    const parentesco = parentescoOptions.find(p => p.label === formData.parentesco);
    return parentesco ? parentesco.label : 'Selecionar parentesco';
  };

  const renderParentescoModal = () => (
    <Modal
      visible={showParentescoModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowParentescoModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.pickerModalContent}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Selecionar Parentesco</Text>
            <View style={styles.pickerHeaderActions}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowParentescoModal(false)}
              >
                <Icon name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.customPickerContainer}>
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
                    <Icon name={opcao.icon} size={20} color="#4D97DB" />
                    <View style={styles.customPickerItemInfo}>
                      <Text style={styles.customPickerItemText}>{opcao.label}</Text>
                    </View>
                  </View>
                  {formData.parentesco === opcao.label && (
                    <Icon name="checkmark-circle" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderGeneroSelector = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon name="person" size={20} color="#4D97DB" />
        <Text style={styles.sectionTitle}>Gênero</Text>
      </View>
      <View style={styles.generoContainer}>
        <TouchableOpacity
          style={[
            styles.generoOption,
            formData.genero === 'masculino' && styles.generoOptionSelected
          ]}
          onPress={() => setFormData(prev => ({...prev, genero: 'masculino'}))}
        >
          <View style={styles.generoIconContainer}>
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
        >
          <View style={styles.generoIconContainer}>
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
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
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
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="person-outline" size={20} color="#4D97DB" />
            <Text style={styles.sectionTitle}>Nome Completo</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <View style={styles.inputContent}>
              <View style={styles.iconContainer}>
                <Icon name="person-outline" size={18} color="#4D97DB" />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Digite o nome completo"
                placeholderTextColor="#6B7280"
                value={formData.nomeCompleto}
                onChangeText={(text) => setFormData(prev => ({...prev, nomeCompleto: text}))}
                autoCapitalize="words"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="mail-outline" size={20} color="#4D97DB" />
            <Text style={styles.sectionTitle}>Email</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <View style={styles.inputContent}>
              <View style={styles.iconContainer}>
                <Icon name="mail-outline" size={18} color="#4D97DB" />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Digite o email"
                placeholderTextColor="#6B7280"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({...prev, email: text}))}
              />
            </View>
          </View>
        </View>

        {renderGeneroSelector()}

        {!isEditing && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="lock-closed-outline" size={20} color="#4D97DB" />
                <Text style={styles.sectionTitle}>Senha</Text>
              </View>
              
              <View style={styles.inputContainer}>
                <View style={styles.inputContent}>
                  <View style={styles.iconContainer}>
                    <Icon name="lock-closed-outline" size={18} color="#4D97DB" />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#6B7280"
                    secureTextEntry
                    value={formData.senha}
                    onChangeText={(text) => setFormData(prev => ({...prev, senha: text}))}
                  />
                </View>
              </View>
            </View>
          </>
        )}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="people-outline" size={20} color="#4D97DB" />
            <Text style={styles.sectionTitle}>Parentesco</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.inputContainer}
            onPress={() => setShowParentescoModal(true)}
          >
            <View style={styles.inputContent}>
              <View style={styles.iconContainer}>
                <Icon name="people-outline" size={18} color="#4D97DB" />
              </View>
              <Text style={[
                styles.inputText,
                !formData.parentesco && styles.inputPlaceholder
              ]}>
                {getParentescoLabel()}
              </Text>
              <Icon name="chevron-down" size={20} color="#8A8A8A" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Data de Nascimento */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="calendar-outline" size={20} color="#4D97DB" />
            <Text style={styles.sectionTitle}>Data de Nascimento</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.dateContainer}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.dateContent}>
              <View style={styles.iconContainer}>
                <Icon name="calendar-outline" size={18} color="#4D97DB" />
              </View>
              <Text style={styles.dateText}>
                {formatarData(formData.dataNascimento)}
              </Text>
              <Icon name="chevron-down" size={20} color="#8A8A8A" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Icon name="information-circle" size={20} color="#4D97DB" />
            <Text style={styles.infoTitle}>Informações Importantes</Text>
          </View>
          <View style={styles.infoContent}>
            <View style={styles.infoItem}>
              <Icon name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.infoText}>
                Uma conta será criada automaticamente para o dependente
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="information-circle-outline" size={16} color="#F59E0B" />
              <Text style={styles.infoText}>
                O login NÃO será feito automaticamente no dispositivo
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="key" size={16} color="#6366F1" />
              <Text style={styles.infoText}>
                O dependente poderá acessar com email e senha fornecidos
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="medical" size={16} color="#EC4899" />
              <Text style={styles.infoText}>
                Você gerenciará os medicamentos desta pessoa
              </Text>
            </View>
          </View>
        </View>

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
      </ScrollView>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2b3241ff',
  },
  header: {
    backgroundColor: '#121A29',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#8A8A8A',
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 16 : 24,
  },
  scrollContent: {
    paddingTop: 25,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textInput: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  inputText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  inputPlaceholder: {
    color: '#8A8A8A',
    fontWeight: '400',
  },
  generoContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  generoOption: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 20,
    alignItems: 'center',
  },
  generoOptionSelected: {
    backgroundColor: '#4D97DB',
    borderColor: '#4D97DB',
  },
  generoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  generoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  generoTextSelected: {
    color: '#FFFFFF',
  },
  dateContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  dateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dateText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  infoCard: {
    backgroundColor: 'rgba(77, 151, 219, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.2)',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoContent: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#D1D5DB',
    flex: 1,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#4D97DB',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Estilos do Modal Picker (do primeiro código)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#2b3241ff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: height * 0.7,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  customPickerContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    maxHeight: 300,
  },
  customPickerScrollView: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  customPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  customPickerItemSelected: {
    backgroundColor: 'rgba(77, 151, 219, 0.1)',
  },
  customPickerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  customPickerItemInfo: {
    flex: 1,
  },
  customPickerItemText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  }
});

export default AdicionarDependentes;