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
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';

const {width, height} = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;

const STORAGE_KEY = '@app_settings';

const Configuracoes = ({navigation}) => {
  const [settings, setSettings] = useState({
    notificacoes: true,
    notificacaoSom: true,
    vibracao: true,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setSettings(JSON.parse(stored));
        }
      } catch (e) {
        console.warn('Erro ao carregar configurações:', e);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
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

  const toggleSetting = async key => {
    const updated = {
      ...settings,
      [key]: !settings[key],
    };
    setSettings(updated);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao salvar configurações:', e);
      Alert.alert('Erro', 'Não foi possível salvar a configuração.');
    }

    if (key === 'notificacoes' && settings.notificacoes) {
      Alert.alert(
        'Notificações Desabilitadas',
        'Você não receberá lembretes sobre seus medicamentos. Recomendamos manter as notificações ativas.',
        [{text: 'OK'}],
      );
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Limpar Cache',
      'Esta ação irá remover dados temporários para melhorar o desempenho.',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Confirmar',
          onPress: () => {
            Alert.alert('Sucesso', 'Cache limpo com sucesso!');
          },
        },
      ],
    );
  };

  const handleDataClear = () => {
    Alert.alert(
      'Resetar Aplicativo',
      'Esta ação irá apagar todas as suas configurações. Esta ação não pode ser desfeita.',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEY);
              setSettings({
                notificacoes: true,
                notificacaoSom: true,
                vibracao: true,
              });
              Alert.alert('Sucesso', 'Configurações resetadas com sucesso!');
            } catch (e) {
              console.warn('Erro ao limpar dados:', e);
              Alert.alert('Erro', 'Não foi possível resetar as configurações.');
            }
          },
        },
      ],
    );
  };

  const settingsData = [
    {
      section: 'Notificações',
      icon: 'notifications',
      color: '#3B82F6',
      items: [
        {
          id: 'notificacoes',
          title: 'Notificações',
          description: 'Receber lembretes sobre medicamentos',
          icon: 'notifications',
          type: 'switch',
          value: settings.notificacoes,
          color: '#3B82F6',
        },
        {
          id: 'notificacaoSom',
          title: 'Som das Notificações',
          description: 'Tocar som ao receber lembretes',
          icon: 'volume-high',
          type: 'switch',
          value: settings.notificacaoSom,
          color: '#3B82F6',
          disabled: !settings.notificacoes,
        },
        {
          id: 'vibracao',
          title: 'Vibração',
          description: 'Vibrar ao receber notificações',
          icon: 'phone-portrait',
          type: 'switch',
          value: settings.vibracao,
          color: '#3B82F6',
          disabled: !settings.notificacoes,
        },
      ],
    },
    {
      section: 'Configurações Avançadas',
      icon: 'settings',
      color: '#3B82F6',
      items: [
        {
          id: 'limparCache',
          title: 'Limpar Cache',
          description: 'Remover dados temporários',
          icon: 'trash',
          type: 'action',
          color: '#94a3b8',
          action: handleClearCache,
        },
        {
          id: 'resetarDados',
          title: 'Resetar Aplicativo',
          description: 'Apagar todas as configurações (irreversível)',
          icon: 'warning',
          type: 'action',
          color: '#E53E3E',
          action: handleDataClear,
          danger: true,
        },
      ],
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
        <Text style={styles.title}>Configurações</Text>
        <Text style={styles.subtitle}>Personalize sua experiência</Text>
      </View>
      <View style={styles.headerSpacer} />
    </Animated.View>
  );

  const renderSettingItem = item => {
    const isDisabled = item.disabled;
    const itemColor = isDisabled ? '#64748b' : item.color;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.settingItem,
          isDisabled && styles.settingItemDisabled,
          item.danger && styles.settingItemDanger,
        ]}
        onPress={() => {
          if (item.type === 'switch' && !isDisabled) {
            toggleSetting(item.id);
          } else if (item.type === 'action' && item.action) {
            item.action();
          }
        }}
        disabled={isDisabled}
        activeOpacity={0.8}>
        <View style={styles.settingContent}>
          <View
            style={[styles.settingIcon, {backgroundColor: itemColor + '15'}]}>
            <Icon name={item.icon} size={20} color={itemColor} />
          </View>

          <View style={styles.settingTextContainer}>
            <Text
              style={[
                styles.settingTitle,
                isDisabled && styles.settingTitleDisabled,
                item.danger && styles.settingTitleDanger,
              ]}>
              {item.title}
            </Text>
            <Text
              style={[
                styles.settingDescription,
                isDisabled && styles.settingDescriptionDisabled,
              ]}>
              {item.description}
            </Text>
          </View>
        </View>

        <View style={styles.settingControl}>
          {item.type === 'switch' ? (
            <Switch
              value={item.value}
              onValueChange={() => toggleSetting(item.id)}
              thumbColor={item.value ? itemColor : '#64748b'}
              trackColor={{
                false: 'rgba(100, 116, 139, 0.3)',
                true: itemColor + '40',
              }}
              disabled={isDisabled}
            />
          ) : (
            <Icon
              name="chevron-forward"
              size={20}
              color={isDisabled ? '#64748b' : '#94a3b8'}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSettingsSection = section => (
    <Animated.View
      key={section.section}
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideUpAnim}],
        },
      ]}>
      <View style={styles.sectionHeader}>
        <Icon name={section.icon} size={20} color={section.color} />
        <Text style={styles.sectionTitle}>{section.section}</Text>
      </View>
      <View style={styles.sectionContainer}>
        {section.items.map(renderSettingItem)}
      </View>
    </Animated.View>
  );

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
        {settingsData.map(renderSettingsSection)}

        <View style={styles.appInfoSection}>
          <Text style={styles.appInfoVersion}>PillCheck v1.0.0</Text>
          <Text style={styles.appInfoCopyright}>
            Cuidando da sua saúde com tecnologia
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  backgroundCircle: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    borderRadius: width,
    backgroundColor: '#3B82F6',
    top: -width * 0.8,
    left: -width * 0.5,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: '#3B82F6',
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
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 25,
    paddingBottom: 30,
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
  sectionContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.3)',
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingItemDanger: {
    backgroundColor: 'rgba(229, 62, 62, 0.05)',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  settingTitleDisabled: {
    color: '#64748b',
  },
  settingTitleDanger: {
    color: '#E53E3E',
  },
  settingDescription: {
    fontSize: 14,
    color: '#94a3b8',
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  settingDescriptionDisabled: {
    color: '#64748b',
  },
  settingControl: {
    marginLeft: 16,
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
});

export default Configuracoes;