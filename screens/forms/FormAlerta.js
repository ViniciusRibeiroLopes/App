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

/**
 * Constantes para responsividade baseadas no tamanho da tela
 */
const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;
const isLargeScreen = width >= 400;

/**
 * Array com dados dos dias da semana
 * @constant {Array<Object>} diasSemana
 * @property {string} abrev - Abreviação do dia
 * @property {string} completo - Nome completo do dia
 */
const diasSemana = [
  {abrev: 'Dom', completo: 'Domingo'},
  {abrev: 'Seg', completo: 'Segunda'},
  {abrev: 'Ter', completo: 'Terça'},
  {abrev: 'Qua', completo: 'Quarta'},
  {abrev: 'Qui', completo: 'Quinta'},
  {abrev: 'Sex', completo: 'Sexta'},
  {abrev: 'Sáb', completo: 'Sábado'},
];

/**
 * Componente FormAlerta - Tela para criação de novos alertas de medicação
 * 
 * @component
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.navigation - Objeto de navegação do React Navigation
 * @returns {JSX.Element} Componente renderizado
 * 
 * @description
 * Este componente permite ao usuário criar alertas personalizados para medicamentos.
 * Inclui seleção de medicamento, configuração de dosagem, horário e dias da semana.
 * Integra com Firebase Firestore para persistência de dados e autenticação.
 * 
 * @example
 * <FormAlerta navigation={navigation} />
 */
const FormAlerta = ({navigation}) => {
  // === ESTADOS DO COMPONENTE ===
  
  /**
   * Estado para armazenar lista de medicamentos do usuário
   * @type {Array<Object>}
   */
  const [remedios, setRemedios] = useState([]);
  
  /**
   * ID do medicamento selecionado
   * @type {string}
   */
  const [remedioSelecionado, setRemedioSelecionado] = useState('');
  
  /**
   * Array com dias da semana selecionados
   * @type {Array<string>}
   */
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  
  /**
   * Dosagem do medicamento
   * @type {string}
   */
  const [dosagem, setDosagem] = useState('');
  
  /**
   * Horário do alerta
   * @type {Date}
   */
  const [horario, setHorario] = useState(new Date());
  
  /**
   * Controla visibilidade do seletor de horário
   * @type {boolean}
   */
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  /**
   * Controla visibilidade do modal de seleção de medicamento
   * @type {boolean}
   */
  const [showPickerModal, setShowPickerModal] = useState(false);
  
  /**
   * Estado de loading para operação de salvamento
   * @type {boolean}
   */
  const [loading, setLoading] = useState(false);
  
  /**
   * Estado de loading para carregamento de medicamentos
   * @type {boolean}
   */
  const [loadingRemedios, setLoadingRemedios] = useState(true);
  
  /**
   * Informações do usuário autenticado
   * @type {Object|null}
   */
  const [userInfo, setUserInfo] = useState(null);

  // === ANIMAÇÕES ===
  
  /**
   * Animação de fade in para entrada da tela
   * @type {Animated.Value}
   */
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  /**
   * Animação de slide up para entrada da tela
   * @type {Animated.Value}
   */
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  
  /**
   * Animação contínua do fundo
   * @type {Animated.Value}
   */
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  /**
   * Hook de efeito para inicializar animações da tela
   * 
   * @description
   * Executa animações de entrada (fade in e slide up) e inicia
   * animação contínua do fundo em loop infinito
   */
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

  /**
   * Hook de efeito para obter informações do usuário autenticado
   * 
   * @description
   * Monitora o estado de autenticação do usuário e atualiza
   * as informações quando há mudanças. Redireciona para tela
   * anterior se usuário não estiver autenticado.
   */
  useEffect(() => {
    /**
     * Função para obter usuário atual
     * @private
     */
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

  /**
   * Hook de efeito para buscar medicamentos do usuário
   * 
   * @description
   * Realiza busca inicial dos medicamentos do usuário no Firestore.
   * Inclui logs detalhados para debug e tratamento de erros.
   * Só executa quando o UID do usuário está disponível.
   */
  useEffect(() => {
    /**
     * Função assíncrona para buscar medicamentos do Firestore
     * @async
     * @private
     * @returns {Promise<void>}
     * @throws {Error} Erro ao acessar Firestore
     */
    const fetchRemedios = async () => {
      if (!userInfo?.uid) {
        console.log('UID não disponível ainda');
        return;
      }

      try {
        console.log('=== INICIANDO BUSCA DE MEDICAMENTOS ===');
        console.log('UID do usuário:', userInfo.uid);

        setLoadingRemedios(true);

        // Buscar todos os medicamentos (para debug)
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

        // Buscar medicamentos específicos do usuário
        const userSnapshot = await firestore()
          .collection('remedios')
          .where('usuarioId', '==', userInfo.uid)
          .get();

        console.log('Medicamentos do usuário encontrados:', userSnapshot.size);

        if (userSnapshot.empty) {
          console.log('⚠️ Nenhum medicamento encontrado para este usuário');

          // Tentativa de encontrar correspondências alternativas
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

        // Processar medicamentos encontrados
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

  /**
   * Hook de efeito para listener em tempo real dos medicamentos
   * 
   * @description
   * Configura listener do Firestore para atualizações em tempo real
   * da coleção de medicamentos do usuário. Automatically atualiza
   * a lista quando há mudanças na base de dados.
   */
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

  /**
   * Função para alternar seleção de dia da semana
   * 
   * @param {string} dia - Abreviação do dia (ex: 'Seg', 'Ter')
   * @description
   * Adiciona ou remove um dia da lista de dias selecionados.
   * Se o dia já está selecionado, remove; senão, adiciona.
   */
  const toggleDia = dia => {
    setDiasSelecionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia],
    );
  };

  /**
   * Função assíncrona para salvar o aviso/alerta no Firestore
   * 
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Erro ao salvar no Firestore
   * 
   * @description
   * Valida os dados do formulário e salva um novo alerta no Firestore.
   * Inclui validação de campos obrigatórios e autenticação do usuário.
   * Mostra feedback ao usuário sobre o sucesso ou falha da operação.
   */
  const salvarAviso = async () => {
    // Validação de campos obrigatórios
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

    // Validação de autenticação
    if (!userInfo?.uid) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }

    setLoading(true);

    try {
      // Preparar dados do alerta
      const alertaData = {
        usuarioId: userInfo.uid,
        remedioId: remedioSelecionado,
        dias: diasSelecionados,
        horario: horario.toTimeString().slice(0, 5), // Formato HH:MM
        dosagem: dosagem.trim(),
        ativo: true,
        criadoEm: firestore.FieldValue.serverTimestamp(),
      };

      console.log('Salvando alerta:', alertaData);

      // Salvar no Firestore
      const docRef = await firestore().collection('alertas').add(alertaData);
      console.log('Alerta salvo com ID:', docRef.id);

      // Obter nome do medicamento para feedback
      const remedio = remedios.find(r => r.id === remedioSelecionado);

      // Feedback de sucesso
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

  /**
   * Função para formatar horário em string legível
   * 
   * @param {Date} date - Objeto Date com o horário
   * @returns {string} Horário formatado em HH:MM
   * 
   * @description
   * Converte um objeto Date para string no formato 24 horas (HH:MM)
   */
  const formatarHorario = date => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  /**
   * Função para obter nome do medicamento selecionado
   * 
   * @returns {string} Nome do medicamento ou placeholder
   * 
   * @description
   * Busca o nome do medicamento selecionado na lista de medicamentos
   * ou retorna um placeholder se nenhum estiver selecionado
   */
  const getRemedioNome = () => {
    const remedio = remedios.find(r => r.id === remedioSelecionado);
    return remedio ? remedio.nome : 'Selecionar medicamento';
  };

  /**
   * Função para renderizar modal de seleção de medicamento
   * 
   * @returns {JSX.Element} Componente Modal
   * 
   * @description
   * Renderiza um modal customizado para seleção de medicamento.
   * Inclui estados de loading, lista vazia e lista com medicamentos.
   * Permite navegação para tela de cadastro quando não há medicamentos.
   */
  const renderPickerModal = () => (
    <Modal
      visible={showPickerModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPickerModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.pickerModalContent}>
          {/* Header do modal */}
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Selecionar Medicamento</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPickerModal(false)}>
              <Icon name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Estado de loading */}
          {loadingRemedios ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4D97DB" />
              <Text style={styles.loadingText}>Carregando medicamentos...</Text>
            </View>
          ) : remedios.length === 0 ? (
            // Estado vazio
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
            // Lista de medicamentos
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

  /**
   * Função para renderizar grid de dias da semana
   * 
   * @returns {JSX.Element} Componente View com grid de dias
   * 
   * @description
   * Renderiza uma grade responsiva com os dias da semana.
   * Adapta o número de itens por linha baseado no tamanho da tela.
   * Permite seleção múltipla de dias.
   */
  const renderDiasGrid = () => {
    // Adaptação responsiva
    const itemsPerRow = isSmallScreen ? 4 : 7;
    const rows = [];

    // Dividir dias em linhas
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

      {/* Header da tela */}
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

      {/* Conteúdo principal */}
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
          
          {/* Seção Medicamento */}
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

          {/* Seção Resumo do Alerta */}
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

      {/* Modal de seleção de medicamento */}
      {renderPickerModal()}
    </SafeAreaView>
  );
};

/**
 * Objeto de estilos do componente FormAlerta
 * @constant {Object} styles
 * 
 * @description
 * Define todos os estilos utilizados no componente FormAlerta.
 * Inclui estilos responsivos baseados no tamanho da tela e
 * animações para melhor experiência do usuário.
 * 
 * Principais características:
 * - Design system com cores consistentes
 * - Responsividade para diferentes tamanhos de tela
 * - Shadows e bordas arredondadas para estética moderna
 * - Transparências e overlays para modais
 * - Estados visuais para elementos interativos
 */
const styles = StyleSheet.create({
  /**
   * Container principal da tela
   * @property {Object} container
   */
  container: {
    flex: 1,
    backgroundColor: '#121A29',
  },
  
  /**
   * Círculo de fundo animado (principal)
   * @property {Object} backgroundCircle
   */
  backgroundCircle: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    borderRadius: width,
    backgroundColor: '#4D97DB',
    top: -width * 0.8,
    left: -width * 0.5,
  },
  
  /**
   * Círculo de fundo animado (secundário)
   * @property {Object} backgroundCircle2
   */
  backgroundCircle2: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: '#E53E3E',
    bottom: -width * 0.6,
    right: -width * 0.4,
  },
  
  /**
   * Header da tela com título e botão de voltar
   * @property {Object} header
   */
  header: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: Platform.OS === 'ios' ? 40 : 50,
    paddingBottom: isMediumScreen ? 20 : 30,
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
    marginTop: isSmallScreen ? -30 : isMediumScreen ? -20 : -5,
  },
  
  /**
   * Botão de voltar no header
   * @property {Object} backButton
   */
  backButton: {
    width: isMediumScreen ? 38 : 44,
    height: isMediumScreen ? 38 : 44,
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
  
  /**
   * Container central do header
   * @property {Object} headerCenter
   */
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  
  /**
   * Título principal do header
   * @property {Object} headerTitle
   */
  headerTitle: {
    fontSize: isMediumScreen ? 22 : 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  
  /**
   * Subtítulo do header
   * @property {Object} headerSubtitle
   */
  headerSubtitle: {
    fontSize: isMediumScreen ? 13 : 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Espaçador direito do header
   * @property {Object} headerRight
   */
  headerRight: {
    width: 44,
  },
  
  /**
   * Container do conteúdo principal
   * @property {Object} content
   */
  content: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 16 : 24,
  },
  
  /**
   * Conteúdo do ScrollView
   * @property {Object} scrollContent
   */
  scrollContent: {
    paddingTop: 25,
    paddingBottom: 30,
  },
  
  /**
   * Seção do formulário
   * @property {Object} section
   */
  section: {
    marginBottom: 25,
  },
  
  /**
   * Header de cada seção com ícone e título
   * @property {Object} sectionHeader
   */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  
  /**
   * Título da seção
   * @property {Object} sectionTitle
   */
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  
  /**
   * Ícone de loading nas seções
   * @property {Object} loadingIcon
   */
  loadingIcon: {
    marginLeft: 8,
  },
  
  /**
   * Container de input com estilo glassmorphism
   * @property {Object} inputContainer
   */
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
  
  /**
   * Conteúdo interno do input
   * @property {Object} inputContent
   */
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  
  /**
   * Container do ícone de medicamento
   * @property {Object} medicationIconContainer
   */
  medicationIconContainer: {
    width: isSmallScreen ? 32 : 36,
    height: isSmallScreen ? 32 : 36,
    borderRadius: isSmallScreen ? 16 : 18,
    backgroundColor: 'rgba(77, 151, 219, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  /**
   * Texto do input
   * @property {Object} inputText
   */
  inputText: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
    flex: 1,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Estilo do placeholder do input
   * @property {Object} inputPlaceholder
   */
  inputPlaceholder: {
    color: '#64748b',
    fontWeight: '400',
  },
  
  /**
   * TextInput editável
   * @property {Object} textInput
   */
  textInput: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
    flex: 1,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Container do seletor de horário
   * @property {Object} timeContainer
   */
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
  
  /**
   * Display do horário
   * @property {Object} timeDisplay
   */
  timeDisplay: {
    flex: 1,
  },
  
  /**
   * Texto do horário em formato grande
   * @property {Object} timeText
   */
  timeText: {
    fontSize: isSmallScreen ? 32 : 40,
    fontWeight: '300',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    letterSpacing: -1,
  },
  
  /**
   * Label explicativo do horário
   * @property {Object} timeLabel
   */
  timeLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Ícone do horário
   * @property {Object} timeIcon
   */
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
  
  /**
   * Grid dos dias da semana
   * @property {Object} diasGrid
   */
  diasGrid: {
    gap: 12,
  },
  
  /**
   * Linha do grid de dias
   * @property {Object} diasRow
   */
  diasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  
  /**
   * Botão de dia da semana
   * @property {Object} diaButton
   */
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
  
  /**
   * Estado selecionado do botão de dia
   * @property {Object} diaSelecionado
   */
  diaSelecionado: {
    backgroundColor: '#4D97DB',
    borderColor: '#4D97DB',
    shadowColor: '#4D97DB',
    shadowOpacity: 0.3,
  },
  
  /**
   * Texto do dia da semana
   * @property {Object} diaTexto
   */
  diaTexto: {
    color: '#e2e8f0',
    fontSize: isSmallScreen ? 10 : 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Texto do dia selecionado
   * @property {Object} diaTextoSelecionado
   */
  diaTextoSelecionado: {
    color: '#FFFFFF',
  },
  
  /**
   * Informações sobre dias selecionados
   * @property {Object} diasSelecionadosInfo
   */
  diasSelecionadosInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(77, 151, 219, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(77, 151, 219, 0.2)',
  },
  
  /**
   * Texto das informações dos dias selecionados
   * @property {Object} diasSelecionadosText
   */
  diasSelecionadosText: {
    fontSize: 14,
    color: '#4D97DB',
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Container do resumo do alerta
   * @property {Object} resumoContainer
   */
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
  
  /**
   * Header do resumo
   * @property {Object} resumoHeader
   */
  resumoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  
  /**
   * Título do resumo
   * @property {Object} resumoTitle
   */
  resumoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Conteúdo do resumo
   * @property {Object} resumoContent
   */
  resumoContent: {
    gap: 8,
  },
  
  /**
   * Item individual do resumo
   * @property {Object} resumoItem
   */
  resumoItem: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Label destacado do resumo
   * @property {Object} resumoLabel
   */
  resumoLabel: {
    fontWeight: '600',
    color: '#10B981',
  },
  
  /**
   * Botão principal para salvar
   * @property {Object} salvarButton
   */
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
  
  /**
   * Estado desabilitado do botão salvar
   * @property {Object} salvarButtonDisabled
   */
  salvarButtonDisabled: {
    backgroundColor: '#64748b',
    shadowOpacity: 0.1,
  },
  
  /**
   * Conteúdo do botão (ícone + texto)
   * @property {Object} buttonContent
   */
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  /**
   * Conteúdo do botão durante loading
   * @property {Object} loadingContent
   */
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  /**
   * Texto do botão salvar
   * @property {Object} salvarButtonText
   */
  salvarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Overlay escuro do modal
   * @property {Object} modalOverlay
   */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  
  /**
   * Conteúdo do modal de seleção
   * @property {Object} pickerModalContent
   */
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
  
  /**
   * Header do modal de seleção
   * @property {Object} pickerHeader
   */
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.6)',
  },
  
  /**
   * Título do modal de seleção
   * @property {Object} pickerTitle
   */
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  
  /**
   * Botão de fechar modal
   * @property {Object} modalCloseButton
   */
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
  
  /**
   * Container do picker customizado
   * @property {Object} customPickerContainer
   */
  customPickerContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    maxHeight: 300,
  },
  
  /**
   * ScrollView do picker customizado
   * @property {Object} customPickerScrollView
   */
  customPickerScrollView: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.4)',
  },
  
  /**
   * Item do picker customizado
   * @property {Object} customPickerItem
   */
  customPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.3)',
  },
  
  /**
   * Item selecionado do picker
   * @property {Object} customPickerItemSelected
   */
  customPickerItemSelected: {
    backgroundColor: 'rgba(77, 151, 219, 0.1)',
    borderBottomColor: 'rgba(77, 151, 219, 0.2)',
  },
  
  /**
   * Conteúdo do item do picker
   * @property {Object} customPickerItemContent
   */
  customPickerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  
  /**
   * Informações do item do picker
   * @property {Object} customPickerItemInfo
   */
  customPickerItemInfo: {
    flex: 1,
  },
  
  /**
   * Texto principal do item do picker
   * @property {Object} customPickerItemText
   */
  customPickerItemText: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Subtexto do item do picker
   * @property {Object} customPickerItemSubtext
   */
  customPickerItemSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Container de loading
   * @property {Object} loadingContainer
   */
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  
  /**
   * Texto de loading
   * @property {Object} loadingText
   */
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Container para estado vazio (sem medicamentos)
   * @property {Object} noRemediosContainer
   */
  noRemediosContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  
  /**
   * Container do ícone do estado vazio
   * @property {Object} emptyStateIconContainer
   */
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
  
  /**
   * Título do estado vazio
   * @property {Object} emptyStateTitle
   */
  emptyStateTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  
  /**
   * Descrição do estado vazio
   * @property {Object} emptyStateDescription
   */
  emptyStateDescription: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  /**
   * Botão para adicionar medicamento
   * @property {Object} addRemedioButton
   */
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
  
  /**
   * Texto do botão adicionar medicamento
   * @property {Object} addRemedioButtonText
   */
  addRemedioButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

/**
 * Exportação padrão do componente FormAlerta
 * @exports FormAlerta
 */
export default FormAlerta;