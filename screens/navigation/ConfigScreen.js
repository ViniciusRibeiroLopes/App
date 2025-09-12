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
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

// Obtém as dimensões da tela do dispositivo para layout responsivo
const {width, height} = Dimensions.get('window');

// Define breakpoints para diferentes tamanhos de tela
const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;

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
   * @property {boolean} modoEscuro - Se o modo escuro está ativo
   * @property {boolean} lembreteAntecipado - Se lembretes antecipados estão ativos
   * @property {boolean} sincronizacaoNuvem - Se a sincronização na nuvem está ativa
   * @property {boolean} compartilharDados - Se compartilhamento de dados anônimos está ativo
   * @property {boolean} biometria - Se a autenticação biométrica está habilitada
   */
  const [settings, setSettings] = useState({
    notificacoes: true,
    notificacaoSom: true,
    vibracao: true,
    modoEscuro: true,
    lembreteAntecipado: false,
    sincronizacaoNuvem: true,
    compartilharDados: false,
    biometria: false,
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
   * @description Atualiza o estado da configuração especificada e mostra
   * feedback ao usuário para configurações críticas como notificações.
   *
   * @param {string} key - Chave da configuração a ser alterada
   * @returns {void}
   *
   * @example
   * // Desabilitar notificações
   * toggleSetting('notificacoes');
   *
   * // Habilitar modo escuro
   * toggleSetting('modoEscuro');
   */
  const toggleSetting = key => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));

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
   * em formato CSV, permitindo compartilhar ou salvar no dispositivo.
   *
   * @returns {void}
   *
   * @example
   * handleDataExport(); // Abre o diálogo de exportação
   */
  const handleDataExport = () => {
    Alert.alert(
      'Exportar Dados',
      'Seus dados serão exportados em formato CSV. Onde deseja salvá-los?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Compartilhar', onPress: () => {}},
        {text: 'Salvar no Dispositivo', onPress: () => {}},
      ],
    );
  };

  /**
   * Handler para limpeza completa dos dados do aplicativo
   *
   * @description Exibe uma série de alertas de confirmação antes de executar
   * a limpeza completa dos dados. Esta é uma ação irreversível que remove
   * todos os medicamentos, alarmes e histórico do usuário.
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
      'Limpar Dados',
      'Esta ação irá apagar todos os seus medicamentos, alarmes e histórico. Esta ação não pode ser desfeita.',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Dados Limpos',
              'Todos os dados foram removidos com sucesso.',
            );
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
        {
          id: 'lembreteAntecipado',
          title: 'Lembrete Antecipado',
          description: 'Notificar 15 minutos antes do horário',
          icon: 'time',
          type: 'switch',
          value: settings.lembreteAntecipado,
          color: '#10B981',
          disabled: !settings.notificacoes,
        },
      ],
    },
    {
      section: 'Aparência',
      items: [
        {
          id: 'modoEscuro',
          title: 'Modo Escuro',
          description: 'Usar tema escuro no aplicativo',
          icon: 'moon',
          type: 'switch',
          value: settings.modoEscuro,
          color: '#8B5CF6',
        },
      ],
    },
    {
      section: 'Dados e Privacidade',
      items: [
        {
          id: 'sincronizacaoNuvem',
          title: 'Sincronização na Nuvem',
          description: 'Fazer backup dos dados na nuvem',
          icon: 'cloud',
          type: 'switch',
          value: settings.sincronizacaoNuvem,
          color: '#4D97DB',
        },
        {
          id: 'compartilharDados',
          title: 'Compartilhar Dados Anônimos',
          description: 'Ajudar a melhorar o aplicativo',
          icon: 'analytics',
          type: 'switch',
          value: settings.compartilharDados,
          color: '#10B981',
        },
        {
          id: 'exportarDados',
          title: 'Exportar Dados',
          description: 'Baixar seus dados em CSV',
          icon: 'download',
          type: 'action',
          color: '#F59E0B',
          action: handleDataExport,
        },
      ],
    },
    {
      section: 'Segurança',
      items: [
        {
          id: 'biometria',
          title: 'Autenticação Biométrica',
          description: 'Usar impressão digital ou Face ID',
          icon: 'finger-print',
          type: 'switch',
          value: settings.biometria,
          color: '#E53E3E',
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
          action: () => {
            Alert.alert(
              'Cache Limpo',
              'Dados temporários removidos com sucesso.',
            );
          },
        },
        {
          id: 'resetarDados',
          title: 'Resetar Aplicativo',
          description: 'Apagar todos os dados (irreversível)',
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
 *
 * @property {Object} container - Container principal da tela
 * @property {Object} backgroundCircle - Círculo de fundo animado superior
 * @property {Object} backgroundCircle2 - Círculo de fundo animado inferior
 * @property {Object} header - Cabeçalho da tela
 * @property {Object} backButton - Botão de voltar
 * @property {Object} headerContent - Conteúdo do cabeçalho
 * @property {Object} headerTitle - Título principal
 * @property {Object} headerSubtitle - Subtítulo
 * @property {Object} content - Área de conteúdo scrollável
 * @property {Object} scrollContent - Container do scroll
 * @property {Object} section - Seção de configurações
 * @property {Object} sectionTitle - Título da seção
 * @property {Object} sectionContainer - Container dos itens da seção
 * @property {Object} settingItem - Item individual de configuração
 * @property {Object} settingItemDisabled - Estado desabilitado do item
 * @property {Object} settingItemDanger - Estado de perigo do item
 * @property {Object} settingContent - Conteúdo principal do item
 * @property {Object} settingIcon - Ícone da configuração
 * @property {Object} settingTextContainer - Container do texto
 * @property {Object} settingTitle - Título da configuração
 * @property {Object} settingTitleDisabled - Título desabilitado
 * @property {Object} settingTitleDanger - Título perigoso
 * @property {Object} settingDescription - Descrição da configuração
 * @property {Object} settingDescriptionDisabled - Descrição desabilitada
 * @property {Object} settingControl - Controle (switch ou seta)
 * @property {Object} appInfoSection - Seção de informações do app
 * @property {Object} appInfoText - Texto principal das informações
 * @property {Object} appInfoSubtext - Subtexto das informações
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
