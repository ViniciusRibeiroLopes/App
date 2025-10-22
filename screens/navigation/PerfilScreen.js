import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
  Animated,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';

const {width, height} = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;

const PerfilScreen = ({navigation}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [showBloodTypeModal, setShowBloodTypeModal] = useState(false);

  const [userData, setUserData] = useState({
    nome: '',
    email: '',
    telefone: '',
    dataNascimento: '',
    tipoSanguineo: '',
    alergias: '',
    condicoesEspeciais: '',
    createdAt: null,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const avatarScaleAnim = useRef(new Animated.Value(0.8)).current;

  const currentUser = auth().currentUser;
  const tiposSanguineos = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const formatPhone = text => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return cleaned
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const parseISODate = isoString => {
    if (!isoString) return new Date();
    try {
      return new Date(isoString);
    } catch {
      return new Date();
    }
  };

  const formatDateDisplay = isoString => {
    if (!isoString) return 'Não informado';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return 'Não informado';
    }
  };

  const loadUserData = async () => {
    try {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      if (userDoc.exists) {
        const data = userDoc.data();
        setUserData({
          nome: data.nome || currentUser.displayName || '',
          email: data.email || currentUser.email || '',
          telefone: data.telefone || '',
          dataNascimento: data.dataNascimento || '',
          tipoSanguineo: data.tipoSanguineo || '',
          alergias: data.alergias || '',
          condicoesEspeciais: data.condicoesEspeciais || '',
          createdAt: data.createdAt,
        });

        if (data.dataNascimento) {
          setTempDate(parseISODate(data.dataNascimento));
        }
      } else {
        const initialData = {
          nome: currentUser.displayName || '',
          email: currentUser.email || '',
          telefone: '',
          dataNascimento: '',
          tipoSanguineo: '',
          alergias: '',
          condicoesEspeciais: '',
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        };

        await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .set(initialData);

        setUserData({
          ...initialData,
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do perfil.');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setTempDate(selectedDate);
      setUserData({
        ...userData,
        dataNascimento: selectedDate.toISOString(),
      });
    }
  };

  const confirmDateSelection = () => {
    setShowDatePicker(false);
    setUserData({
      ...userData,
      dataNascimento: tempDate.toISOString(),
    });
  };

  const openDatePicker = () => {
    if (userData.dataNascimento) {
      setTempDate(parseISODate(userData.dataNascimento));
    }
    setShowDatePicker(true);
  };

  const selectBloodType = type => {
    setUserData({...userData, tipoSanguineo: type});
    setShowBloodTypeModal(false);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      if (!currentUser) {
        Alert.alert('Erro', 'Usuário não autenticado.');
        return;
      }

      if (!userData.nome.trim()) {
        Alert.alert('Erro', 'O nome é obrigatório.');
        return;
      }

      await firestore().collection('users').doc(currentUser.uid).update({
        nome: userData.nome.trim(),
        telefone: userData.telefone.trim(),
        dataNascimento: userData.dataNascimento,
        tipoSanguineo: userData.tipoSanguineo.trim(),
        alergias: userData.alergias.trim(),
        condicoesEspeciais: userData.condicoesEspeciais.trim(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      if (userData.nome !== currentUser.displayName) {
        await currentUser.updateProfile({
          displayName: userData.nome,
        });
      }

      setIsEditing(false);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair da Conta', 'Tem certeza que deseja sair?', [
      {text: 'Cancelar', style: 'cancel'},
      {
        text: 'Sair',
        onPress: async () => {
          try {
            await auth().signOut();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível sair da conta.');
          }
        },
      },
    ]);
  };

  useEffect(() => {
    loadUserData();

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
      Animated.spring(avatarScaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

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
  }, []);

  const menuOptions = [
    {
      id: 1,
      title: 'Dependentes',
      description: 'Gerencie perfis de familiares',
      icon: 'people',
      color: '#3B82F6',
      action: () => navigation.navigate('DependentesMenu'),
    },
    {
      id: 2,
      title: 'Histórico Médico',
      description: 'Registros e consultas anteriores',
      icon: 'document-text',
      color: '#F59E0B',
      action: () => navigation.navigate('HistoricoMenu'),
    },
    {
      id: 3,
      title: 'Configurações',
      description: 'Personalize o aplicativo',
      icon: 'settings',
      color: '#8B5CF6',
      action: () => navigation.navigate('Configuracoes'),
    },
    {
      id: 4,
      title: 'Sair da Conta',
      description: 'Fazer logout do aplicativo',
      icon: 'log-out',
      color: '#64748b',
      action: handleLogout,
    },
  ];

  const renderHeader = () => (
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
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Meu Perfil</Text>
        <Text style={styles.subtitle}>Gerencie suas informações</Text>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => {
          if (isEditing) {
            handleSaveProfile();
          } else {
            setIsEditing(true);
          }
        }}
        disabled={saving}>
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Icon
            name={isEditing ? 'checkmark' : 'pencil'}
            size={20}
            color="#FFFFFF"
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  const renderProfileInfo = () => (
    <Animated.View
      style={[
        styles.profileSection,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideUpAnim}, {scale: avatarScaleAnim}],
        },
      ]}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {userData.nome ? userData.nome.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
      </View>

      <View style={styles.profileInfo}>
        {isEditing ? (
          <TextInput
            style={styles.nameInput}
            value={userData.nome}
            onChangeText={text => setUserData({...userData, nome: text})}
            placeholder="Digite seu nome"
            placeholderTextColor="#64748b"
          />
        ) : (
          <Text style={styles.profileName}>{userData.nome || 'Usuário'}</Text>
        )}
        <Text style={styles.profileEmail}>{userData.email}</Text>
        <View style={styles.membershipBadge}>
          <Icon name="shield-checkmark" size={14} color="#10B981" />
          <Text style={styles.membershipText}>
            Membro desde{' '}
            {userData.createdAt
              ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString(
                  'pt-BR',
                  {month: 'short', year: 'numeric'},
                )
              : 'agora'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderMedicalInfo = () => (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideUpAnim}],
        },
      ]}>
      <View style={styles.sectionHeader}>
        <Icon name="medical" size={20} color="#10B981" />
        <Text style={styles.sectionTitle}>Informações Médicas</Text>
      </View>
      <View style={styles.medicalInfoCard}>
        <View style={styles.medicalInfoRow}>
          <Icon name="calendar" size={20} color="#8B5CF6" />
          <Text style={styles.medicalInfoLabel}>Nascimento:</Text>
          {isEditing ? (
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={openDatePicker}>
              <Text style={styles.datePickerButtonText}>
                {formatDateDisplay(userData.dataNascimento)}
              </Text>
              <Icon name="chevron-down" size={16} color="#10B981" />
            </TouchableOpacity>
          ) : (
            <Text style={styles.medicalInfoValue}>
              {formatDateDisplay(userData.dataNascimento)}
            </Text>
          )}
        </View>

        <View style={styles.medicalInfoRow}>
          <Icon name="call" size={20} color="#10B981" />
          <Text style={styles.medicalInfoLabel}>Telefone:</Text>
          {isEditing ? (
            <TextInput
              style={styles.medicalInfoInput}
              value={userData.telefone}
              onChangeText={text =>
                setUserData({...userData, telefone: formatPhone(text)})
              }
              placeholder="(11) 99999-9999"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.medicalInfoValue}>
              {userData.telefone || 'Não informado'}
            </Text>
          )}
        </View>

        <View style={styles.medicalInfoRow}>
          <Icon name="water" size={20} color="#3B82F6" />
          <Text style={styles.medicalInfoLabel}>Tipo Sanguíneo:</Text>
          {isEditing ? (
            <TouchableOpacity
              style={styles.bloodTypeButton}
              onPress={() => setShowBloodTypeModal(true)}>
              <Text style={styles.bloodTypeButtonText}>
                {userData.tipoSanguineo || 'Selecione'}
              </Text>
              <Icon name="chevron-down" size={16} color="#10B981" />
            </TouchableOpacity>
          ) : (
            <Text style={styles.medicalInfoValue}>
              {userData.tipoSanguineo || 'Não informado'}
            </Text>
          )}
        </View>

        <View style={styles.medicalInfoRow}>
          <Icon name="warning" size={20} color="#F59E0B" />
          <Text style={styles.medicalInfoLabel}>Alergias:</Text>
          {isEditing ? (
            <TextInput
              style={[styles.medicalInfoInput, {flex: 1}]}
              value={userData.alergias}
              onChangeText={text => setUserData({...userData, alergias: text})}
              placeholder="Digite suas alergias"
              placeholderTextColor="#64748b"
              multiline
            />
          ) : (
            <Text style={styles.medicalInfoValue}>
              {userData.alergias || 'Nenhuma alergia informada'}
            </Text>
          )}
        </View>

        <View style={styles.medicalInfoRow}>
          <Icon name="medkit" size={20} color="#10B981" />
          <Text style={styles.medicalInfoLabel}>Condições:</Text>
          {isEditing ? (
            <TextInput
              style={[styles.medicalInfoInput, {flex: 1}]}
              value={userData.condicoesEspeciais}
              onChangeText={text =>
                setUserData({...userData, condicoesEspeciais: text})
              }
              placeholder="Condições médicas especiais"
              placeholderTextColor="#64748b"
              multiline
            />
          ) : (
            <Text style={styles.medicalInfoValue}>
              {userData.condicoesEspeciais || 'Nenhuma condição informada'}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );

  const renderMenuOptions = () => (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideUpAnim}],
        },
      ]}>
      <View style={styles.sectionHeader}>
        <Icon name="grid" size={20} color="#10B981" />
        <Text style={styles.sectionTitle}>Menu Rápido</Text>
      </View>
      <View style={styles.menuContainer}>
        {menuOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            style={styles.menuItem}
            onPress={option.action}
            activeOpacity={0.8}>
            <View style={styles.menuItemLeft}>
              <View
                style={[
                  styles.menuIcon,
                  {backgroundColor: option.color + '20'},
                ]}>
                <Icon name={option.icon} size={20} color={option.color} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>{option.title}</Text>
                <Text style={styles.menuItemDescription}>
                  {option.description}
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderBloodTypeModal = () => (
    <Modal
      visible={showBloodTypeModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowBloodTypeModal(false)}>
      <TouchableWithoutFeedback onPress={() => setShowBloodTypeModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Tipo Sanguíneo</Text>
                <TouchableOpacity onPress={() => setShowBloodTypeModal(false)}>
                  <Icon name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={styles.bloodTypeGrid}>
                {tiposSanguineos.map(tipo => (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      styles.bloodTypeOption,
                      userData.tipoSanguineo === tipo &&
                        styles.bloodTypeOptionSelected,
                    ]}
                    onPress={() => selectBloodType(tipo)}
                    activeOpacity={0.8}>
                    <Text
                      style={[
                        styles.bloodTypeOptionText,
                        userData.tipoSanguineo === tipo &&
                          styles.bloodTypeOptionTextSelected,
                      ]}>
                      {tipo}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <Animated.View
        style={[
          styles.backgroundCircle,
          {
            opacity: backgroundAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.03, 0.08],
            }),
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
          },
        ]}
      />

      {renderHeader()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {renderProfileInfo()}
        {renderMedicalInfo()}
        {renderMenuOptions()}

        <View style={styles.appInfoSection}>
          <Text style={styles.appInfoVersion}>PillCheck v1.0.0</Text>
          <Text style={styles.appInfoCopyright}>
            Cuidando da sua saúde com tecnologia
          </Text>
        </View>
      </ScrollView>

      {showDatePicker && (
        <>
          {Platform.OS === 'ios' ? (
            <Modal
              visible={true}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowDatePicker(false)}>
              <TouchableWithoutFeedback
                onPress={() => setShowDatePicker(false)}>
                <View style={styles.modalOverlay}>
                  <TouchableWithoutFeedback>
                    <View style={styles.datePickerModal}>
                      <View style={styles.datePickerHeader}>
                        <TouchableOpacity
                          onPress={() => setShowDatePicker(false)}>
                          <Text style={styles.datePickerCancel}>Cancelar</Text>
                        </TouchableOpacity>
                        <Text style={styles.datePickerTitle}>
                          Data de Nascimento
                        </Text>
                        <TouchableOpacity onPress={confirmDateSelection}>
                          <Text style={styles.datePickerConfirm}>
                            Confirmar
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={tempDate}
                        mode="date"
                        display="spinner"
                        onChange={onDateChange}
                        maximumDate={new Date()}
                        minimumDate={new Date(1900, 0, 1)}
                        textColor="#FFFFFF"
                        locale="pt-BR"
                      />
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          ) : (
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              locale="pt-BR"
            />
          )}
        </>
      )}

      {renderBloodTypeModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  backgroundCircle: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    borderRadius: width,
    backgroundColor: '#10B981',
    top: -width * 0.8,
    left: -width * 0.5,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: '#8B5CF6',
    bottom: -width * 0.6,
    right: -width * 0.4,
  },
  header: {
    backgroundColor: 'rgba(20, 30, 48, 0.95)',
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 55,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 25,
    paddingBottom: 30,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#10B981',
    paddingBottom: 4,
    paddingHorizontal: 20,
    textAlign: 'center',
    minWidth: 200,
  },
  profileEmail: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 12,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  membershipText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 6,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  medicalInfoCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    gap: 16,
  },
  medicalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  medicalInfoLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
    minWidth: 100,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  medicalInfoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  medicalInfoInput: {
    fontSize: 14,
    color: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#10B981',
    paddingBottom: 2,
    paddingHorizontal: 8,
    minWidth: 120,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 8,
    flex: 1,
  },
  datePickerButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  bloodTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 8,
    flex: 1,
  },
  bloodTypeButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  menuContainer: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#94a3b8',
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  appInfoSection: {
    alignItems: 'center',
    padding: 30,
    marginTop: 20,
  },
  appInfoVersion: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  appInfoCopyright: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderRadius: 24,
    padding: 24,
    width: width * 0.85,
    maxWidth: 400,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  bloodTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  bloodTypeOption: {
    width: 70,
    height: 60,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bloodTypeOptionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  bloodTypeOptionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  bloodTypeOptionTextSelected: {
    color: '#10B981',
  },
  datePickerModal: {
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderRadius: 24,
    padding: 20,
    width: width * 0.9,
    maxWidth: 400,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  datePickerCancel: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  datePickerConfirm: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default PerfilScreen;