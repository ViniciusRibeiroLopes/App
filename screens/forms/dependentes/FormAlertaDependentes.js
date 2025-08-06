import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  TextInput,
  StatusBar,
  Dimensions,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import notifee, { 
  TimestampTrigger, 
  TriggerType, 
  AndroidImportance, 
  AndroidVisibility, 
  AndroidCategory, 
  RepeatFrequency 
} from '@notifee/react-native';
import { Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

const diasSemana = [
  { abrev: 'Dom', completo: 'Domingo' },
  { abrev: 'Seg', completo: 'Segunda' },
  { abrev: 'Ter', completo: 'Terça' },
  { abrev: 'Qua', completo: 'Quarta' },
  { abrev: 'Qui', completo: 'Quinta' },
  { abrev: 'Sex', completo: 'Sexta' },
  { abrev: 'Sáb', completo: 'Sábado' }
];

const FormAlertaDependente = ({ navigation, route }) => {
  const [remedios, setRemedios] = useState([]);
  const [dependente, setDependente] = useState(null);
  const [remedioSelecionado, setRemedioSelecionado] = useState('');
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [dosagem, setDosagem] = useState('');
  const [horario, setHorario] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingRemedios, setLoadingRemedios] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  const { dependenteId } = route.params || {};

  // Obter informações do usuário atual
  useEffect(() => {
    const getCurrentUser = () => {
      const user = auth().currentUser;
      if (user) {
        console.log('Usuário autenticado:', {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });
        setUserInfo(user);
      } else {
        console.log('Nenhum usuário autenticado');
        Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
        navigation.goBack();
      }
    };

    const unsubscribeAuth = auth().onAuthStateChanged((user) => {
      if (user) {
        setUserInfo(user);
      } else {
        setUserInfo(null);
      }
    });

    getCurrentUser();

    return () => unsubscribeAuth();
  }, [navigation]);

  // Inicializar dados quando usuário e dependente estiverem disponíveis
  useEffect(() => {
    if (!userInfo?.uid || !dependenteId) {
      if (!dependenteId) {
        Alert.alert('Erro', 'Dependente não encontrado.');
        navigation.goBack();
      }
      return;
    }

    const inicializar = async () => {
      try {
        setLoadingRemedios(true);
        
        // Buscar informações do dependente
        console.log('Buscando dependente:', dependenteId);
        const dependenteDoc = await firestore()
          .collection('users_dependentes')
          .doc(dependenteId)
          .get();

        if (dependenteDoc.exists) {
          const dependenteData = {
            id: dependenteDoc.id,
            ...dependenteDoc.data()
          };
          console.log('Dependente encontrado:', dependenteData);
          setDependente(dependenteData);
        } else {
          Alert.alert('Erro', 'Dependente não encontrado.');
          navigation.goBack();
          return;
        }

        // Buscar medicamentos do usuário administrador
        console.log('Buscando medicamentos do usuário:', userInfo.uid);
        const remediosSnapshot = await firestore()
          .collection('remedios')
          .where('usuarioId', '==', userInfo.uid)
          .get();

        console.log('Medicamentos encontrados:', remediosSnapshot.size);

        const lista = remediosSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Processando medicamento:', {
            id: doc.id,
            nome: data.nome,
            dosagem: data.dosagem,
            frequencia: data.frequencia
          });
          
          return {
            id: doc.id,
            nome: data.nome,
            dosagem: data.dosagem,
            frequencia: data.frequencia,
            descricao: data.descricao,
            ...data
          };
        });

        setRemedios(lista);

      } catch (error) {
        console.error('Erro ao inicializar:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados.');
        navigation.goBack();
      } finally {
        setLoadingRemedios(false);
      }
    };

    inicializar();
  }, [userInfo, dependenteId]);

  // Listener em tempo real para medicamentos
  useEffect(() => {
    if (!userInfo?.uid) return;

    console.log('Configurando listener em tempo real para medicamentos');
    
    const unsubscribe = firestore()
      .collection('remedios')
      .where('usuarioId', '==', userInfo.uid)
      .onSnapshot(
        (snapshot) => {
          console.log('📡 Snapshot em tempo real recebido:', snapshot.size, 'documentos');
          
          if (!snapshot.empty) {
            const lista = snapshot.docs.map(doc => {
              const data = doc.data();
              console.log('Medicamento atualizado via listener:', {
                id: doc.id,
                nome: data.nome
              });
              
              return {
                id: doc.id,
                nome: data.nome,
                dosagem: data.dosagem,
                frequencia: data.frequencia,
                descricao: data.descricao,
                ...data
              };
            });

            console.log('Atualizando lista via listener:', lista.length, 'medicamentos');
            setRemedios(lista);
          } else {
            console.log('Listener: Nenhum medicamento encontrado');
            setRemedios([]);
          }
          
          setLoadingRemedios(false);
        },
        (error) => {
          console.error('❌ Erro no listener de medicamentos:', error);
          setLoadingRemedios(false);
        }
      );

    return () => {
      console.log('Desconectando listener de medicamentos');
      unsubscribe();
    };
  }, [userInfo]);

  const toggleDia = (dia) => {
    setDiasSelecionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  const salvarAviso = async () => {
    if (!remedioSelecionado || diasSelecionados.length === 0 || !horario || !dosagem.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos para continuar.');
      return;
    }

    if (!userInfo?.uid || !dependenteId) {
      Alert.alert('Erro', 'Usuário ou dependente não identificado.');
      return;
    }

    setLoading(true);

    try {
      const alertaData = {
        usuarioId: userInfo.uid,
        dependenteId: dependenteId,
        remedioId: remedioSelecionado,
        dias: diasSelecionados,
        horario: horario.toTimeString().slice(0, 5),
        dosagem: dosagem.trim(),
        ativo: true,
        criadoEm: firestore.FieldValue.serverTimestamp(),
      };

      console.log('Salvando alerta para dependente:', alertaData);

      const docRef = await firestore().collection('alertas_dependentes').add(alertaData);
      console.log('Alerta salvo com ID:', docRef.id);

      const remedio = remedios.find(r => r.id === remedioSelecionado);

      Alert.alert(
        'Sucesso!', 
        `Alerta criado para ${dependente?.nome || dependente?.nomeCompleto}\nMedicamento: ${remedio?.nome}\nHorário: ${formatarHorario(horario)}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('❌ Erro ao salvar alerta:', error);
      Alert.alert('Erro', `Não foi possível salvar o alerta.\n\nDetalhes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatarHorario = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getRemedioNome = () => {
    const remedio = remedios.find(r => r.id === remedioSelecionado);
    return remedio ? remedio.nome : 'Selecionar medicamento';
  };

  const renderPickerModal = () => (
    <Modal
      visible={showPickerModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPickerModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.pickerModalContent}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Selecionar Medicamento</Text>
            <View style={styles.pickerHeaderActions}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowPickerModal(false)}
              >
                <Icon name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {loadingRemedios ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4D97DB" />
              <Text style={styles.loadingText}>Carregando medicamentos...</Text>
            </View>
          ) : remedios.length === 0 ? (
            <View style={styles.noRemediosContainer}>
              <Icon name="medical" size={60} color="#6B7280" />
              <Text style={styles.noRemediosText}>Nenhum medicamento cadastrado</Text>
              <Text style={styles.noRemediosSubtext}>
                Você precisa cadastrar um medicamento antes de criar alertas
              </Text>
              <TouchableOpacity 
                style={styles.addRemedioButton}
                onPress={() => {
                  setShowPickerModal(false);
                  navigation.navigate('AdicionarRemedio');
                }}
              >
                <Icon name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addRemedioButtonText}>Cadastrar Medicamento</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.customPickerContainer}>
              <ScrollView style={styles.customPickerScrollView}>
                {remedios.map((remedio) => (
                  <TouchableOpacity
                    key={remedio.id}
                    style={[
                      styles.customPickerItem,
                      remedioSelecionado === remedio.id && styles.customPickerItemSelected
                    ]}
                    onPress={() => {
                      setRemedioSelecionado(remedio.id);
                      setShowPickerModal(false);
                    }}
                  >
                    <View style={styles.customPickerItemContent}>
                      <MaterialIcons name="medication" size={20} color="#4D97DB" />
                      <View style={styles.customPickerItemInfo}>
                        <Text style={styles.customPickerItemText}>{remedio.nome}</Text>
                        {remedio.dosagem && (
                          <Text style={styles.customPickerItemSubtext}>{remedio.dosagem}</Text>
                        )}
                      </View>
                    </View>
                    {remedioSelecionado === remedio.id && (
                      <Icon name="checkmark-circle" size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderDiasGrid = () => {
    const itemsPerRow = isSmallScreen ? 4 : 7;
    const rows = [];
    
    for (let i = 0; i < diasSemana.length; i += itemsPerRow) {
      rows.push(diasSemana.slice(i, i + itemsPerRow));
    }

    return (
      <View style={styles.diasGrid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.diasRow}>
            {row.map((dia) => (
              <TouchableOpacity
                key={dia.abrev}
                style={[
                  styles.diaButton,
                  diasSelecionados.includes(dia.abrev) && styles.diaSelecionado,
                ]}
                onPress={() => toggleDia(dia.abrev)}
              >
                <Text style={[
                  styles.diaTexto,
                  diasSelecionados.includes(dia.abrev) && styles.diaTextoSelecionado
                ]}>
                  {dia.abrev}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  if (loadingRemedios && !dependente) {
    return (
      <View style={[styles.container, styles.initialLoadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#121A29" />
        <ActivityIndicator size="large" color="#4D97DB" />
        <Text style={styles.initialLoadingText}>Carregando...</Text>
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Novo Alerta</Text>
          <Text style={styles.headerSubtitle}>
            Lembrete para {dependente?.nome || dependente?.nomeCompleto}
          </Text>
        </View>
        
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Card do Dependente */}
        {dependente && (
          <View style={styles.dependenteCard}>
            <View style={styles.dependenteIcon}>
              <Icon name="person" size={24} color="#4D97DB" />
            </View>
            <View style={styles.dependenteInfo}>
              <Text style={styles.dependenteNome}>
                {dependente.nome || dependente.nomeCompleto}
              </Text>
              <Text style={styles.dependenteLabel}>Dependente</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="medication" size={20} color="#4D97DB" />
            <Text style={styles.sectionTitle}>Medicamento</Text>
            {loadingRemedios && (
              <ActivityIndicator size="small" color="#4D97DB" style={styles.loadingIcon} />
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.inputContainer}
            onPress={() => setShowPickerModal(true)}
          >
            <View style={styles.inputContent}>
              <View style={styles.medicationIconContainer}>
                <MaterialIcons name="medication" size={20} color="#4D97DB" />
              </View>
              <Text style={[
                styles.inputText,
                !remedioSelecionado && styles.inputPlaceholder
              ]}>
                {getRemedioNome()}
              </Text>
              <Icon name="chevron-down" size={20} color="#8A8A8A" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Seção Dosagem */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="fitness" size={20} color="#4D97DB" />
            <Text style={styles.sectionTitle}>Dosagem</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <View style={styles.inputContent}>
              <View style={styles.medicationIconContainer}>
                <Icon name="fitness" size={18} color="#4D97DB" />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: 30mg, 1 comprimido, 5ml..."
                placeholderTextColor="#6B7280"
                value={dosagem}
                onChangeText={setDosagem}
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        {/* Seção Horário */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="time" size={20} color="#4D97DB" />
            <Text style={styles.sectionTitle}>Horário</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.timeContainer}
            onPress={() => setShowTimePicker(true)}
          >
            <View style={styles.timeDisplay}>
              <Text style={styles.timeText}>
                {formatarHorario(horario)}
              </Text>
              <Text style={styles.timeLabel}>Toque para alterar</Text>
            </View>
            <View style={styles.timeIcon}>
              <Icon name="alarm" size={24} color="#4D97DB" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Seção Dias da Semana */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="calendar" size={20} color="#4D97DB" />
            <Text style={styles.sectionTitle}>Dias da Semana</Text>
          </View>
          
          {renderDiasGrid()}
          
          {diasSelecionados.length > 0 && (
            <View style={styles.diasSelecionadosInfo}>
              <Text style={styles.diasSelecionadosText}>
                {diasSelecionados.length === 7 
                  ? 'Todos os dias' 
                  : `${diasSelecionados.length} dia${diasSelecionados.length > 1 ? 's' : ''} selecionado${diasSelecionados.length > 1 ? 's' : ''}`
                }
              </Text>
            </View>
          )}
        </View>

        {/* Resumo */}
        {remedioSelecionado && dosagem && diasSelecionados.length > 0 && (
          <View style={styles.resumoContainer}>
            <View style={styles.resumoHeader}>
              <Icon name="information-circle" size={20} color="#4D97DB" />
              <Text style={styles.resumoTitle}>Resumo do Alerta</Text>
            </View>
            <View style={styles.resumoContent}>
              <Text style={styles.resumoItem}>
                <Text style={styles.resumoLabel}>Dependente:</Text> {dependente?.nome || dependente?.nomeCompleto}
              </Text>
              <Text style={styles.resumoItem}>
                <Text style={styles.resumoLabel}>Medicamento:</Text> {getRemedioNome()}
              </Text>
              <Text style={styles.resumoItem}>
                <Text style={styles.resumoLabel}>Dosagem:</Text> {dosagem}
              </Text>
              <Text style={styles.resumoItem}>
                <Text style={styles.resumoLabel}>Horário:</Text> {formatarHorario(horario)}
              </Text>
              <Text style={styles.resumoItem}>
                <Text style={styles.resumoLabel}>Frequência:</Text> {
                  diasSelecionados.length === 7 
                    ? 'Todos os dias' 
                    : diasSelecionados.join(', ')
                }
              </Text>
            </View>
          </View>
        )}

        {/* Botão Salvar */}
        <TouchableOpacity 
          style={[
            styles.salvarButton,
            loading && styles.salvarButtonDisabled
          ]}
          onPress={salvarAviso}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.loadingContent}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.salvarButtonText}>Criando alerta...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Icon name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.salvarButtonText}>Ativar Alerta</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={horario}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={(event, selectedDate) => {
            setShowTimePicker(false);
            if (event.type === 'set' && selectedDate) {
              setHorario(selectedDate);
            }
          }}
        />
      )}

      {renderPickerModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2b3241ff',
  },
  initialLoadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialLoadingText: {
    color: '#4D97DB',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
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
  dependenteCard: {
    backgroundColor: 'rgba(77, 151, 219, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dependenteIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(77, 151, 219, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dependenteInfo: {
    flex: 1,
  },
  dependenteNome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  dependenteLabel: {
    fontSize: 14,
    color: '#4D97DB',
    fontWeight: '500',
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
  loadingIcon: {
    marginLeft: 8,
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
  medicationIconContainer: {
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
  },
  timeContainer: {
    backgroundColor: 'rgba(77, 151, 219, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  timeDisplay: {
    flex: 1,
  },
  timeText: {
    fontSize: isSmallScreen ? 32 : 40,
    fontWeight: '300',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    letterSpacing: -1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#8A8A8A',
    fontWeight: '500',
    marginTop: 4,
  },
  timeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(77, 151, 219, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  diasGrid: {
    gap: 12,
  },
  diasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  diaButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: isSmallScreen ? 20 : 25,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  diaSelecionado: {
    backgroundColor: '#4D97DB',
    borderColor: '#4D97DB',
  },
  diaTexto: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 10 : 12,
    fontWeight: '600',
  },
  diaTextoSelecionado: {
    color: '#FFFFFF',
  },
  diasSelecionadosInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(77, 151, 219, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.2)',
  },
  diasSelecionadosText: {
    fontSize: 14,
    color: '#4D97DB',
    fontWeight: '500',
    textAlign: 'center',
  },
  resumoContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  resumoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  resumoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resumoContent: {
    gap: 8,
  },
  resumoItem: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  resumoLabel: {
    fontWeight: '600',
    color: '#10B981',
  },
  salvarButton: {
    backgroundColor: '#4D97DB',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  salvarButtonDisabled: {
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
  salvarButtonText: {
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
  },
  customPickerItemSubtext: {
    fontSize: 14,
    color: '#8A8A8A',
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8A8A8A',
  },
  noRemediosContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noRemediosText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginVertical: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  noRemediosSubtext: {
    fontSize: 14,
    color: '#8A8A8A',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  addRemedioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4D97DB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  addRemedioButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FormAlertaDependente;