import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ScrollView, 
  StatusBar,
  Dimensions,
  Modal,
  ActivityIndicator
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import RemediosScreen from '../menus/RemediosMenu';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 360;

const RemedioForm = ({ route, navigation }) => {
  const isEdit = !!route.params?.remedio;
  const [nome, setNome] = useState('');
  const [utilidade, setUtilidade] = useState('');
  const [tipo, setTipo] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [dosagem, setDosagem] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [modalTipoVisible, setModalTipoVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const tiposRemedio = [
    { label: 'Comprimido', value: 'comprimido', icon: 'medical', color: '#E53E3E' },
    { label: 'Cápsula', value: 'capsula', icon: 'ellipse', color: '#4D97DB' },
    { label: 'Xarope', value: 'xarope', icon: 'flask', color: '#9F7AEA' },
    { label: 'Gotas', value: 'gotas', icon: 'water', color: '#38B2AC' },
    { label: 'Pomada', value: 'pomada', icon: 'bandage', color: '#ED8936' },
    { label: 'Injeção', value: 'injecao', icon: 'medical-outline', color: '#F56565' },
    { label: 'Spray', value: 'spray', icon: 'cloud', color: '#48BB78' },
    { label: 'Outro', value: 'outro', icon: 'help-circle', color: '#718096' }
  ];

  useEffect(() => {
    if (isEdit) {
      const remedio = route.params.remedio;
      setNome(remedio.nome || '');
      setUtilidade(remedio.utilidade || '');
      setTipo(remedio.tipo || '');
      setQuantidade(remedio.quantidade || '');
      setDosagem(remedio.dosagem || '');
      setObservacoes(remedio.observacoes || '');
    }
  }, []);

  const handleSalvar = async () => {
    const uid = auth().currentUser?.uid;
    if (!nome || !utilidade || !tipo) {
      Alert.alert('Campos obrigatórios', 'Preencha pelo menos o nome, função e tipo do medicamento.');
      return;
    }

    setLoading(true);

    try {
      const remedioData = {
        nome: nome.trim(),
        utilidade: utilidade.trim(),
        tipo,
        quantidade: quantidade.trim(),
        dosagem: dosagem.trim(),
        observacoes: observacoes.trim(),
        usuarioId: uid,
      };

      if (isEdit) {
        await firestore().collection('remedios').doc(route.params.remedio.id).update(remedioData);
        Alert.alert(
          'Sucesso!', 
          'Medicamento atualizado com sucesso!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        await firestore().collection('remedios').add({
          ...remedioData,
        });
        Alert.alert(
          'Sucesso!', 
          'Medicamento adicionado com sucesso!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Erro ao salvar medicamento:', error);
      Alert.alert('Erro', `Não foi possível salvar o medicamento.\n\nDetalhes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getTipoLabel = (value) => {
    const tipo = tiposRemedio.find(t => t.value === value);
    return tipo ? tipo.label : 'Selecionar tipo';
  };

  const getTipoIcon = (value) => {
    const tipo = tiposRemedio.find(t => t.value === value);
    return tipo ? tipo.icon : 'chevron-down';
  };

  const getTipoColor = (value) => {
    const tipo = tiposRemedio.find(t => t.value === value);
    return tipo ? tipo.color : '#8A8A8A';
  };

  const renderTipoSelector = () => (
    <TouchableOpacity 
      style={styles.inputContainer}
      onPress={() => setModalTipoVisible(true)}
    >
      <View style={styles.inputContent}>
        <View style={[styles.iconContainer, { backgroundColor: tipo ? getTipoColor(tipo) + '20' : 'rgba(77, 151, 219, 0.15)' }]}>
          <Icon 
            name={getTipoIcon(tipo)} 
            size={18} 
            color={tipo ? getTipoColor(tipo) : '#4D97DB'} 
          />
        </View>
        <Text style={[
          styles.inputText,
          !tipo && styles.inputPlaceholder
        ]}>
          {getTipoLabel(tipo)}
        </Text>
        <Icon name="chevron-down" size={20} color="#8A8A8A" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isEdit ? 'Editar Medicamento' : 'Novo Medicamento'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isEdit ? 'Atualize as informações' : 'Adicione um novo medicamento'}
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
            <MaterialIcons name="medication" size={20} color="#4D97DB" />
            <Text style={styles.sectionTitle}>Informações Básicas</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nome do Medicamento *</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputContent}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name="medication" size={18} color="#4D97DB" />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: Paracetamol"
                  placeholderTextColor="#6B7280"
                  value={nome}
                  onChangeText={setNome}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Função/Indicação *</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputContent}>
                <View style={styles.iconContainer}>
                  <Icon name="medical" size={18} color="#4D97DB" />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: Dor de cabeça, febre"
                  placeholderTextColor="#6B7280"
                  value={utilidade}
                  onChangeText={setUtilidade}
                  multiline
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tipo de Medicamento *</Text>
            {renderTipoSelector()}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="flask" size={20} color="#4D97DB" />
            <Text style={styles.sectionTitle}>Especificações</Text>
          </View>
          
          <View style={styles.row}>
            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>Quantidade</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputContent}>
                  <View style={styles.iconContainer}>
                    <Icon name="layers" size={18} color="#4D97DB" />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ex: 20"
                    placeholderTextColor="#6B7280"
                    value={quantidade}
                    onChangeText={setQuantidade}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="document-text" size={20} color="#4D97DB" />
            <Text style={styles.sectionTitle}>Observações</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Observações Adicionais</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <View style={[styles.inputContent, styles.textAreaContent]}>
                <View style={styles.iconContainer}>
                  <Icon name="create" size={18} color="#4D97DB" />
                </View>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Ex: Tomar com alimentos, efeitos colaterais observados..."
                  placeholderTextColor="#6B7280"
                  value={observacoes}
                  onChangeText={setObservacoes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
          onPress={handleSalvar}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.loadingContent}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {isEdit ? 'Salvando alterações...' : 'Adicionando medicamento...'}
              </Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Icon name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {isEdit ? 'Salvar Alterações' : 'Adicionar Medicamento'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalTipoVisible}
        onRequestClose={() => setModalTipoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tipo de Medicamento</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setModalTipoVisible(false)}
              >
                <Icon name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalList}>
              {tiposRemedio.map((tipoItem) => (
                <TouchableOpacity
                  key={tipoItem.value}
                  style={[
                    styles.modalItem,
                    tipo === tipoItem.value && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    setTipo(tipoItem.value);
                    setModalTipoVisible(false);
                  }}
                >
                  <View style={styles.modalItemContent}>
                    <View style={[styles.modalItemIcon, { backgroundColor: tipoItem.color + '20' }]}>
                      <Icon 
                        name={tipoItem.icon} 
                        size={18} 
                        color={tipoItem.color} 
                      />
                    </View>
                    <View style={styles.modalItemInfo}>
                      <Text style={[
                        styles.modalItemText,
                        tipo === tipoItem.value && styles.modalItemTextSelected
                      ]}>
                        {tipoItem.label}
                      </Text>
                    </View>
                  </View>
                  {tipo === tipoItem.value && (
                    <Icon name="checkmark-circle" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    marginBottom: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D1D5DB',
    marginBottom: 8,
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
  textInput: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
    minHeight: 20,
  },
  textAreaContainer: {
    minHeight: 120,
  },
  textAreaContent: {
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInputContainer: {
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2b3241ff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '100%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
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
  modalList: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalItemSelected: {
    backgroundColor: 'rgba(77, 151, 219, 0.1)',
    borderColor: 'rgba(77, 151, 219, 0.3)',
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  modalItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default RemedioForm;