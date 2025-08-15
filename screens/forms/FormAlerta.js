import React, {useEffect, useState, useRef} from 'react';
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
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Animated,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
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
  RepeatFrequency,
} from '@notifee/react-native';

const {width, height} = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

const diasSemana = [
  {abrev: 'Dom', completo: 'Domingo'},
  {abrev: 'Seg', completo: 'Segunda'},
  {abrev: 'Ter', completo: 'Terça'},
  {abrev: 'Qua', completo: 'Quarta'},
  {abrev: 'Qui', completo: 'Quinta'},
  {abrev: 'Sex', completo: 'Sexta'},
  {abrev: 'Sáb', completo: 'Sábado'},
];

const FormAlerta = ({navigation}) => {
  const [remedios, setRemedios] = useState([]);
  const [remedioSelecionado, setRemedioSelecionado] = useState('');
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [dosagem, setDosagem] = useState('');
  const [horario, setHorario] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingRemedios, setLoadingRemedios] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animações iniciais
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Animação de fundo contínua
    const backgroundAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundAnim, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ]),
    );
    backgroundAnimation.start();

    return () => backgroundAnimation.stop();
  }, [backgroundAnim, fadeAnim, slideUpAnim]);

  // Obter informações do usuário atual
  useEffect(() => {
    const getCurrentUser = () => {
      const user = auth().currentUser;
      if (user) {
        console.log('Usuário autenticado:', {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
        setUserInfo(user);
      } else {
        console.log('Nenhum usuário autenticado');
        Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
        navigation.goBack();
      }
    };

    const unsubscribeAuth = auth().onAuthStateChanged(user => {
      if (user) {
        setUserInfo(user);
      } else {
        setUserInfo(null);
      }
    });

    getCurrentUser();

    return () => unsubscribeAuth();
  }, [navigation]);

  // Buscar medicamentos quando o usuário estiver disponível
  useEffect(() => {
    const fetchRemedios = async () => {
      if (!userInfo?.uid) {
        console.log('UID não disponível ainda');
        return;
      }

      try {
        console.log('=== INICIANDO BUSCA DE MEDICAMENTOS ===');
        console.log('UID do usuário:', userInfo.uid);

        setLoadingRemedios(true);

        const allMedicamentos = await firestore().collection('remedios').get();

        console.log('Total de medicamentos na coleção:', allMedicamentos.size);

        if (allMedicamentos.size > 0) {
          console.log('Medicamentos encontrados na coleção:');
          allMedicamentos.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`${index + 1}. ID: ${doc.id}`, {
              nome: data.nome,
              usuarioId: data.usuarioId,
              criadoEm: data.criadoEm,
              allData: data,
            });
          });
        }

        console.log('Buscando medicamentos do usuário:', userInfo.uid);

        const userSnapshot = await firestore()
          .collection('remedios')
          .where('usuarioId', '==', userInfo.uid)
          .get();

        console.log('Medicamentos do usuário encontrados:', userSnapshot.size);

        if (userSnapshot.empty) {
          console.log('⚠️ Nenhum medicamento encontrado para este usuário');

          const allDocs = allMedicamentos.docs;
          const possibleMatches = allDocs.filter(doc => {
            const data = doc.data();
            const docUserId = data.usuarioId;

            return (
              docUserId === userInfo.uid ||
              String(docUserId) === String(userInfo.uid) ||
              docUserId === userInfo.email
            );
          });

          console.log(
            'Possíveis correspondências encontradas:',
            possibleMatches.length,
          );
          possibleMatches.forEach(doc => {
            const data = doc.data();
            console.log('Match encontrado:', {
              id: doc.id,
              nome: data.nome,
              usuarioId: data.usuarioId,
              type: typeof data.usuarioId,
            });
          });
        }

        const lista = userSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Processando medicamento do usuário:', {
            id: doc.id,
            nome: data.nome,
            dosagem: data.dosagem,
            frequencia: data.frequencia,
          });

          return {
            id: doc.id,
            nome: data.nome,
            dosagem: data.dosagem,
            frequencia: data.frequencia,
            descricao: data.descricao,
            ...data,
          };
        });

        console.log('Lista final de medicamentos do usuário:', lista.length);
        setRemedios(lista);

        if (lista.length === 0) {
          console.log(
            '💡 Dica: Verifique se os medicamentos foram salvos com o mesmo UID',
          );
        }
      } catch (error) {
        console.error('❌ Erro detalhado ao buscar medicamentos:', error);
        console.error('Stack trace:', error.stack);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        Alert.alert(
          'Erro ao carregar medicamentos',
          `Detalhes: ${error.message}\n\nCódigo: ${error.code || 'N/A'}`,
        );
      } finally {
        setLoadingRemedios(false);
        console.log('=== FIM DA BUSCA DE MEDICAMENTOS ===');
      }
    };

    if (userInfo?.uid) {
      fetchRemedios();
    }
  }, [userInfo]);

  // Listener em tempo real para medicamentos
  useEffect(() => {
    if (!userInfo?.uid) return;

    console.log('Configurando listener em tempo real para medicamentos');

    const unsubscribe = firestore()
      .collection('remedios')
      .where('usuarioId', '==', userInfo.uid)
      .onSnapshot(
        snapshot => {
          console.log(
            '📡 Snapshot em tempo real recebido:',
            snapshot.size,
            'documentos',
          );

          if (!snapshot.empty) {
            const lista = snapshot.docs.map(doc => {
              const data = doc.data();
              console.log('Medicamento atualizado via listener:', {
                id: doc.id,
                nome: data.nome,
              });

              return {
                id: doc.id,
                nome: data.nome,
                dosagem: data.dosagem,
                frequencia: data.frequencia,
                descricao: data.descricao,
                ...data,
              };
            });

            console.log(
              'Atualizando lista via listener:',
              lista.length,
              'medicamentos',
            );
            setRemedios(lista);
          } else {
            console.log('Listener: Nenhum medicamento encontrado');
            setRemedios([]);
          }

          setLoadingRemedios(false);
        },
        error => {
          console.error('❌ Erro no listener de medicamentos:', error);
          setLoadingRemedios(false);
        },
      );

    return () => {
      console.log('Desconectando listener de medicamentos');
      unsubscribe();
    };
  }, [userInfo]);

  const toggleDia = dia => {
    setDiasSelecionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia],
    );
  };

  const salvarAviso = async () => {
    if (
      !remedioSelecionado ||
      diasSelecionados.length === 0 ||
      !horario ||
      !dosagem.trim()
    ) {
      Alert.alert(
        'Campos obrigatórios',
        'Preencha todos os campos para continuar.',
      );
      return;
    }

    if (!userInfo?.uid) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }

    setLoading(true);

    try {
      const alertaData = {
        usuarioId: userInfo.uid,
        remedioId: remedioSelecionado,
        dias: diasSelecionados,
        horario: horario.toTimeString().slice(0, 5),
        dosagem: dosagem.trim(),
        ativo: true,
        criadoEm: firestore.FieldValue.serverTimestamp(),
      };

      console.log('Salvando alerta:', alertaData);

      const docRef = await firestore().collection('alertas').add(alertaData);
      console.log('Alerta salvo com ID:', docRef.id);

      const remedio = remedios.find(r => r.id === remedioSelecionado);

      Alert.alert(
        'Sucesso!',
        `Alerta criado para ${remedio?.nome} às ${formatarHorario(horario)}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      console.error('❌ Erro ao salvar alerta:', error);
      Alert.alert(
        'Erro',
        `Não foi possível salvar o alerta.\n\nDetalhes: ${error.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const formatarHorario = date => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
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
      onRequestClose={() => setShowPickerModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.pickerModalContent}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Selecionar Medicamento</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPickerModal(false)}>
              <Icon name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {loadingRemedios ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4D97DB" />
              <Text style={styles.loadingText}>Carregando medicamentos...</Text>
            </View>
          ) : remedios.length === 0 ? (
            <View style={styles.noRemediosContainer}>
              <View style={styles.emptyStateIconContainer}>
                <MaterialIcons
                  name="medication"
                  size={isSmallScreen ? 40 : 48}
                  color="#64748b"
                />
              </View>
              <Text style={styles.emptyStateTitle}>
                Nenhum medicamento cadastrado
              </Text>
              <Text style={styles.emptyStateDescription}>
                Você precisa cadastrar um medicamento antes de criar alertas
              </Text>
              <TouchableOpacity
                style={styles.addRemedioButton}
                onPress={() => {
                  setShowPickerModal(false);
                  navigation.navigate('AdicionarRemedio');
                }}>
                <Icon name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addRemedioButtonText}>
                  Cadastrar Medicamento
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.customPickerContainer}>
              <ScrollView
                style={styles.customPickerScrollView}
                showsVerticalScrollIndicator={false}>
                {remedios.map(remedio => (
                  <TouchableOpacity
                    key={remedio.id}
                    style={[
                      styles.customPickerItem,
                      remedioSelecionado === remedio.id &&
                        styles.customPickerItemSelected,
                    ]}
                    onPress={() => {
                      setRemedioSelecionado(remedio.id);
                      setShowPickerModal(false);
                    }}>
                    <View style={styles.customPickerItemContent}>
                      <View style={styles.medicationIconContainer}>
                        <MaterialIcons
                          name="medication"
                          size={20}
                          color="#4D97DB"
                        />
                      </View>
                      <View style={styles.customPickerItemInfo}>
                        <Text style={styles.customPickerItemText}>
                          {remedio.nome}
                        </Text>
                        {remedio.dosagem && (
                          <Text style={styles.customPickerItemSubtext}>
                            {remedio.dosagem}
                          </Text>
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
            {row.map(dia => (
              <TouchableOpacity
                key={dia.abrev}
                style={[
                  styles.diaButton,
                  diasSelecionados.includes(dia.abrev) && styles.diaSelecionado,
                ]}
                onPress={() => toggleDia(dia.abrev)}>
                <Text
                  style={[
                    styles.diaTexto,
                    diasSelecionados.includes(dia.abrev) &&
                      styles.diaTextoSelecionado,
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
              outputRange: [0.03, 0.08],
            }),
            transform: [
              {
                scale: backgroundAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.1],
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
              outputRange: [0.05, 0.03],
            }),
            transform: [
              {
                scale: backgroundAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.1, 1],
                }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          },
        ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Novo Alerta</Text>
          <Text style={styles.headerSubtitle}>
            Configure seu lembrete de medicação
          </Text>
        </View>

        <View style={styles.headerRight} />
      </Animated.View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}],
          },
        ]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="medication" size={20} color="#4D97DB" />
              <Text style={styles.sectionTitle}>Medicamento</Text>
              {loadingRemedios && (
                <ActivityIndicator
                  size="small"
                  color="#4D97DB"
                  style={styles.loadingIcon}
                />
              )}
            </View>

            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setShowPickerModal(true)}>
              <View style={styles.inputContent}>
                <View style={styles.medicationIconContainer}>
                  <MaterialIcons name="medication" size={20} color="#4D97DB" />
                </View>
                <Text
                  style={[
                    styles.inputText,
                    !remedioSelecionado && styles.inputPlaceholder,
                  ]}>
                  {getRemedioNome()}
                </Text>
                <Icon name="chevron-down" size={20} color="#94a3b8" />
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
                  placeholderTextColor="#64748b"
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
              onPress={() => setShowTimePicker(true)}>
              <View style={styles.timeDisplay}>
                <Text style={styles.timeText}>{formatarHorario(horario)}</Text>
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
                    : `${diasSelecionados.length} dia${
                        diasSelecionados.length > 1 ? 's' : ''
                      } selecionado${diasSelecionados.length > 1 ? 's' : ''}`}
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
                  <Text style={styles.resumoLabel}>Medicamento:</Text>{' '}
                  {getRemedioNome()}
                </Text>
                <Text style={styles.resumoItem}>
                  <Text style={styles.resumoLabel}>Dosagem:</Text> {dosagem}
                </Text>
                <Text style={styles.resumoItem}>
                  <Text style={styles.resumoLabel}>Horário:</Text>{' '}
                  {formatarHorario(horario)}
                </Text>
                <Text style={styles.resumoItem}>
                  <Text style={styles.resumoLabel}>Frequência:</Text>{' '}
                  {diasSelecionados.length === 7
                    ? 'Todos os dias'
                    : diasSelecionados.join(', ')}
                </Text>
              </View>
            </View>
          )}

          {/* Botão Salvar */}
          <TouchableOpacity
            style={[
              styles.salvarButton,
              loading && styles.salvarButtonDisabled,
            ]}
            onPress={salvarAviso}
            disabled={loading}
            activeOpacity={0.8}>
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
      </Animated.View>

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121A29',
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
    backgroundColor: '#E53E3E',
    bottom: -width * 0.6,
    right: -width * 0.4,
  },
  header: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: Platform.OS === 'ios' ? 40 : 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
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
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  loadingIcon: {
    marginLeft: 8,
  },
  inputContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  medicationIconContainer: {
    width: isSmallScreen ? 32 : 36,
    height: isSmallScreen ? 32 : 36,
    borderRadius: isSmallScreen ? 16 : 18,
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inputText: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
    flex: 1,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  inputPlaceholder: {
    color: '#64748b',
    fontWeight: '400',
  },
  textInput: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
    flex: 1,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  timeContainer: {
    backgroundColor: 'rgba(77, 151, 219, 0.1)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  timeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(77, 151, 219, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4D97DB',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  diaSelecionado: {
    backgroundColor: '#4D97DB',
    borderColor: '#4D97DB',
    shadowColor: '#4D97DB',
    shadowOpacity: 0.3,
  },
  diaTexto: {
    color: '#e2e8f0',
    fontSize: isSmallScreen ? 10 : 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
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
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  resumoContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 18,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  resumoContent: {
    gap: 8,
  },
  resumoItem: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
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
    shadowColor: '#4D97DB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  salvarButtonDisabled: {
    backgroundColor: '#64748b',
    shadowOpacity: 0.1,
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: height * 0.7,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.6)',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  customPickerContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    maxHeight: 300,
  },
  customPickerScrollView: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.4)',
  },
  customPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.3)',
  },
  customPickerItemSelected: {
    backgroundColor: 'rgba(77, 151, 219, 0.1)',
    borderBottomColor: 'rgba(77, 151, 219, 0.2)',
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
    color: '#f8fafc',
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  customPickerItemSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  noRemediosContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIconContainer: {
    width: isSmallScreen ? 64 : 80,
    height: isSmallScreen ? 64 : 80,
    borderRadius: isSmallScreen ? 32 : 40,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  emptyStateTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  emptyStateDescription: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  addRemedioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4D97DB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#4D97DB',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addRemedioButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default FormAlerta;
