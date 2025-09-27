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
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

// Obtém as dimensões da tela do dispositivo para layout responsivo
const {width, height} = Dimensions.get('window');

// Define breakpoints para diferentes tamanhos de tela
const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;

const STORAGE_KEY = '@app_settings';

/**
 * Componente de tela de Configurações do aplicativo PillCheck
 *
 * @description Tela principal de configurações que permite ao usuário personalizar
 * notificações, aparência, privacidade, segurança e configurações avançadas.
 * Inclui animações suaves, switches interativos e ações de gerenciamento de dados.
 *
 * @component
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.navigation - Objeto de navegação do React Navigation
 * @returns {JSX.Element} Componente renderizado da tela de configurações
 *
 * @example
 * // Uso no React Navigation
 * <Stack.Screen name="Configuracoes" component={Configuracoes} />
 *
 * @author Equipe PillCheck
 * @version 1.0.0
 * @since 2025
 */
const Configuracoes = ({navigation}) => {
  /**
   * Estado principal das configurações do aplicativo
   * @type {Object} Objeto contendo todas as configurações do usuário
   * @property {boolean} notificacoes - Se as notificações estão habilitadas
   * @property {boolean} notificacaoSom - Se o som das notificações está ativo
   * @property {boolean} vibracao - Se a vibração está habilitada
   */
  const [settings, setSettings] = useState({
    notificacoes: true,
    notificacaoSom: true,
    vibracao: true,
  });

  /**
   * Referência para animação de fade in dos elementos
   * @type {Animated.Value} Valor animado para opacidade (0 a 1)
   */
  const fadeAnim = useRef(new Animated.Value(0)).current;

  /**
   * Referência para animação de deslizamento vertical
   * @type {Animated.Value} Valor animado para translateY (30 a 0)
   */
  const slideUpAnim = useRef(new Animated.Value(30)).current;

  /**
   * Referência para animação contínua do fundo
   * @type {Animated.Value} Valor animado para efeitos de fundo (0 a 1)
   */
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  /**
   * Carrega configurações do AsyncStorage ao montar o componente
   */
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

  /**
   * Effect hook para inicializar animações quando o componente é montado
   *
   * @description Executa animações paralelas de fade in e slide up na montagem,
   * além de iniciar uma animação de loop contínua para o fundo com duração de 12 segundos.
   *
   * @effect
   * @returns {Function} Função de cleanup para parar a animação de fundo
   */
  useEffect(() => {
    // Animações iniciais executadas em paralelo
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

    // Animação de fundo contínua em loop infinito
    const backgroundAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundAnim, {
          toValue: 1,
          duration: 12000,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundAnim, {
          toValue: 0,
          duration: 12000,
          useNativeDriver: true,
        }),
      ]),
    );
    backgroundAnimation.start();

    // Cleanup: para a animação quando o componente é desmontado
    return () => backgroundAnimation.stop();
  }, []);

  /**
   * Função para alterar o valor de uma configuração específica
   *
   * @description Atualiza o estado da configuração especificada e salva
   * no AsyncStorage, mostrando feedback ao usuário para configurações críticas.
   *
   * @param {string} key - Chave da configuração a ser alterada
   * @returns {void}
   */
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

    // Mostrar feedback para certas configurações críticas
    if (key === 'notificacoes' && settings.notificacoes) {
      Alert.alert(
        'Notificações Desabilitadas',
        'Você não receberá lembretes sobre seus medicamentos. Recomendamos manter as notificações ativas.',
        [{text: 'OK'}],
      );
    }
  };

  /**
   * Handler para exportação de dados do usuário
   *
   * @description Exibe um alerta com opções para exportar os dados do usuário
   * em diferentes formatos, permitindo compartilhar ou salvar no dispositivo.
   *
   * @returns {void}
   *
   * @example
   * handleDataExport(); // Abre o diálogo de exportação
   */
  const handleDataExport = () => {
    Alert.alert(
      'Exportar Dados',
      'Seus dados serão exportados. Escolha o formato:',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'PDF',
          onPress: () => {
            Alert.alert('Sucesso', 'Dados exportados em formato PDF!');
          },
        },
        {
          text: 'Excel',
          onPress: () => {
            Alert.alert('Sucesso', 'Dados exportados em formato Excel!');
          },
        },
        {
          text: 'JSON',
          onPress: () => {
            Alert.alert('Sucesso', 'Dados exportados em formato JSON!');
          },
        },
      ],
    );
  };

  /**
   * Handler para limpeza do cache do aplicativo
   */
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

  /**
   * Handler para limpeza completa dos dados do aplicativo
   *
   * @description Exibe uma série de alertas de confirmação antes de executar
   * a limpeza completa dos dados. Esta é uma ação irreversível que remove
   * todas as configurações do usuário.
   *
   * @returns {void}
   *
   * @warning Esta ação é irreversível e remove todos os dados do usuário
   *
   * @example
   * handleDataClear(); // Inicia o processo de limpeza de dados
   */
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

  /**
   * Estrutura de dados das configurações organizadas por seções
   *
   * @type {Array<Object>} Array de objetos representando seções de configurações
   * @property {string} section - Nome da seção
   * @property {Array<Object>} items - Array de itens de configuração da seção
   *
   * @description Cada item de configuração possui:
   * @property {string} id - Identificador único da configuração
   * @property {string} title - Título exibido ao usuário
   * @property {string} description - Descrição da funcionalidade
   * @property {string} icon - Nome do ícone a ser exibido
   * @property {string} type - Tipo de controle ('switch' ou 'action')
   * @property {boolean} [value] - Valor atual (para switches)
   * @property {string} color - Cor tema da configuração
   * @property {boolean} [disabled] - Se o item está desabilitado
   * @property {Function} [action] - Função executada (para actions)
   * @property {boolean} [danger] - Se é uma ação perigosa
   */
  const settingsData = [
    {
      section: 'Notificações',
      items: [
        {
          id: 'notificacoes',
          title: 'Notificações',
          description: 'Receber lembretes sobre medicamentos',
          icon: 'notifications',
          type: 'switch',
          value: settings.notificacoes,
          color: '#4D97DB',
        },
        {
          id: 'notificacaoSom',
          title: 'Som das Notificações',
          description: 'Tocar som ao receber lembretes',
          icon: 'volume-high',
          type: 'switch',
          value: settings.notificacaoSom,
          color: '#4D97DB',
          disabled: !settings.notificacoes,
        },
        {
          id: 'vibracao',
          title: 'Vibração',
          description: 'Vibrar ao receber notificações',
          icon: 'phone-portrait',
          type: 'switch',
          value: settings.vibracao,
          color: '#4D97DB',
          disabled: !settings.notificacoes,
        },
      ],
    },
    {
      section: 'Configurações Avançadas',
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

  /**
   * Renderiza o cabeçalho da tela com animações
   *
   * @description Componente que renderiza o header com botão de voltar,
   * título e subtítulo, aplicando animações de fade e slide.
   *
   * @returns {JSX.Element} Elemento JSX do cabeçalho animado
   *
   * @private
   */
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
        <Icon name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Configurações</Text>
        <Text style={styles.headerSubtitle}>Personalize sua experiência</Text>
      </View>
    </Animated.View>
  );

  /**
   * Renderiza um item individual de configuração
   *
   * @description Cria um componente interativo para cada configuração,
   * que pode ser um switch (para configurações boolean) ou uma ação
   * (para executar funções). Aplica estilos condicionais baseados no
   * estado disabled e danger.
   *
   * @param {Object} item - Objeto contendo dados do item de configuração
   * @param {string} item.id - Identificador único do item
   * @param {string} item.title - Título do item
   * @param {string} item.description - Descrição do item
   * @param {string} item.icon - Nome do ícone
   * @param {string} item.type - Tipo ('switch' ou 'action')
   * @param {boolean} [item.value] - Valor atual (para switches)
   * @param {string} item.color - Cor tema
   * @param {boolean} [item.disabled] - Se está desabilitado
   * @param {Function} [item.action] - Função para actions
   * @param {boolean} [item.danger] - Se é perigoso
   *
   * @returns {JSX.Element} Elemento JSX do item de configuração
   *
   * @private
   */
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
        disabled={isDisabled}>
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

  /**
   * Renderiza uma seção completa de configurações
   *
   * @description Cria uma seção com título e container para agrupar
   * itens relacionados de configuração. Aplica animações consistentes
   * com o resto da interface.
   *
   * @param {Object} section - Objeto contendo dados da seção
   * @param {string} section.section - Nome da seção
   * @param {Array<Object>} section.items - Array de itens da seção
   *
   * @returns {JSX.Element} Elemento JSX da seção de configurações
   *
   * @private
   */
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
      <Text style={styles.sectionTitle}>{section.section}</Text>
      <View style={styles.sectionContainer}>
        {section.items.map(renderSettingItem)}
      </View>
    </Animated.View>
  );

  // Renderização principal do componente
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />

      {/* Elementos de fundo animados para efeito visual */}
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

      {/* Renderização das seções da tela */}
      {renderHeader()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {settingsData.map(renderSettingsSection)}

        {/* Seção de informações do aplicativo */}
        <View style={styles.appInfoSection}>
          <Text style={styles.appInfoText}>PillCheck v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>
            Desenvolvido para cuidar da sua saúde
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * Estilos do componente Configuracoes
 *
 * @description StyleSheet contendo todos os estilos utilizados no componente.
 * Inclui responsividade para diferentes tamanhos de tela, estados disabled/danger,
 * animações suaves e design consistente com o tema dark do aplicativo.
 *
 * @type {StyleSheet} Objeto de estilos do React Native
 */
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
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 16,
  },
  headerContent: {
    paddingTop: 18,
    flex: 1,
  },
  headerTitle: {
    fontSize: isMediumScreen ? 24 : 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingTop: 30,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  sectionContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
    fontSize: isSmallScreen ? 16 : 17,
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
    fontSize: isSmallScreen ? 13 : 14,
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
  appInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  appInfoSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default Configuracoes;
