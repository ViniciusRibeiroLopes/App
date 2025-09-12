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
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

// Obtém as dimensões da tela do dispositivo
const {width, height} = Dimensions.get('window');

// Define breakpoints para responsividade baseado na largura da tela
const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;

/**
 * Componente de tela de Ajuda do aplicativo PillCheck
 *
 * @description Tela principal de suporte que oferece FAQ, ações rápidas,
 * opções de contato e informações do aplicativo. Inclui animações suaves
 * e design responsivo para diferentes tamanhos de tela.
 *
 * @component
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.navigation - Objeto de navegação do React Navigation
 * @returns {JSX.Element} Componente renderizado da tela de ajuda
 *
 * @example
 * // Uso no React Navigation
 * <Stack.Screen name="Ajuda" component={Ajuda} />
 *
 * @author Equipe PillCheck
 * @version 1.0.0
 * @since 2025
 */
const Ajuda = ({navigation}) => {
  /**
   * Estado para controlar qual item do FAQ está expandido
   * @type {number|null} ID do FAQ expandido ou null se nenhum estiver expandido
   */
  const [expandedFaq, setExpandedFaq] = useState(null);

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
   * além de iniciar uma animação de loop contínua para o fundo.
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
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundAnim, {
          toValue: 0,
          duration: 10000,
          useNativeDriver: true,
        }),
      ]),
    );
    backgroundAnimation.start();

    // Cleanup: para a animação quando o componente é desmontado
    return () => backgroundAnimation.stop();
  }, [backgroundAnim, fadeAnim, slideUpAnim]);

  /**
   * Dados estáticos para a seção de Perguntas Frequentes (FAQ)
   *
   * @type {Array<Object>} Array de objetos contendo perguntas e respostas
   * @property {number} id - Identificador único da pergunta
   * @property {string} question - Texto da pergunta
   * @property {string} answer - Texto da resposta detalhada
   */
  const faqData = [
    {
      id: 1,
      question: 'Como configurar meus primeiros alarmes?',
      answer:
        'Para configurar alarmes, vá até a seção "Alarmes" no menu principal. Toque em "+" para adicionar um novo alarme, defina o horário, selecione os dias da semana e adicione informações sobre o medicamento. Certifique-se de ativar as notificações para receber lembretes.',
    },
    {
      id: 2,
      question: 'Posso gerenciar medicamentos para outras pessoas?',
      answer:
        'Sim! Use a funcionalidade "Dependentes" para adicionar familiares ou pessoas sob seus cuidados. Você pode criar perfis separados e configurar alarmes específicos para cada dependente.',
    },
    {
      id: 3,
      question: 'Como visualizar meu histórico de medicamentos?',
      answer:
        'Acesse a seção "Histórico" para ver um relatório completo de todos os medicamentos tomados, horários perdidos e estatísticas de adesão ao tratamento. Você pode exportar esses dados para compartilhar com seu médico.',
    },
    {
      id: 4,
      question: 'Os dados ficam seguros no aplicativo?',
      answer:
        'Sim, todos os seus dados são criptografados e armazenados com segurança. Utilizamos as melhores práticas de segurança para proteger suas informações médicas pessoais.',
    },
    {
      id: 5,
      question: 'Como editar ou excluir um alarme?',
      answer:
        'Na seção "Alarmes", toque no alarme que deseja modificar. Você pode editar horários, dias da semana, dosagens ou excluir completamente o alarme. Alterações são salvas automaticamente.',
    },
    {
      id: 6,
      question: 'Posso usar o app sem conexão com internet?',
      answer:
        'O PillCheck funciona offline para funcionalidades básicas como alarmes e visualização de dados. No entanto, a sincronização e backup dos dados requer conexão com internet.',
    },
  ];

  /**
   * Opções de contato disponíveis para o usuário
   *
   * @type {Array<Object>} Array de objetos com informações de contato
   * @property {number} id - Identificador único da opção
   * @property {string} title - Título da opção de contato
   * @property {string} description - Descrição ou informação adicional
   * @property {string} icon - Nome do ícone a ser exibido
   * @property {string} color - Cor tema da opção em hexadecimal
   * @property {Component} component - Componente de ícone a ser usado
   * @property {Function} action - Função executada ao tocar na opção
   */
  const contactOptions = [
    {
      id: 1,
      title: 'Central de Suporte',
      description: 'Fale conosco via chat',
      icon: 'chatbubble',
      color: '#4D97DB',
      component: Icon,
      action: () => {
        Alert.alert(
          'Suporte',
          'Entre em contato conosco através do email: pillchecktcc@gmail.com',
          [{text: 'Copiar Email', onPress: () => {}}, {text: 'OK'}],
        );
      },
    },
    {
      id: 2,
      title: 'WhatsApp',
      description: '+55 (11) 99999-9999',
      icon: 'logo-whatsapp',
      color: '#25D366',
      component: Icon,
      action: () => {
        const phoneNumber = '5511999999999';
        const message = 'Olá, preciso de ajuda com o PillCheck';
        const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(
          message,
        )}`;

        Linking.canOpenURL(url)
          .then(supported => {
            if (supported) {
              Linking.openURL(url);
            } else {
              Alert.alert('Erro', 'WhatsApp não está instalado');
            }
          })
          .catch(() => {
            Alert.alert('Erro', 'Não foi possível abrir o WhatsApp');
          });
      },
    },
    {
      id: 3,
      title: 'Email',
      description: 'pillchecktcc@gmail.com',
      icon: 'mail',
      color: '#E53E3E',
      component: Icon,
      action: () => {
        const email = 'pillchecktcc@gmail.com';
        const subject = 'Dúvida sobre PillCheck';
        const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;

        Linking.canOpenURL(url)
          .then(supported => {
            if (supported) {
              Linking.openURL(url);
            } else {
              Alert.alert(
                'Erro',
                'Não foi possível abrir o aplicativo de email',
              );
            }
          })
          .catch(() => {
            Alert.alert('Erro', 'Não foi possível enviar email');
          });
      },
    },
    {
      id: 4,
      title: 'Avalie o App',
      description: 'Nos dê sua opinião',
      icon: 'star',
      color: '#F59E0B',
      component: Icon,
      action: () => {
        Alert.alert(
          'Avaliar App',
          'Obrigado por usar o PillCheck! Sua avaliação nos ajuda a melhorar.',
          [{text: 'Mais Tarde'}, {text: 'Avaliar', onPress: () => {}}],
        );
      },
    },
  ];

  /**
   * Ações rápidas disponíveis para acesso imediato a funcionalidades
   *
   * @type {Array<Object>} Array de objetos com ações rápidas
   * @property {number} id - Identificador único da ação
   * @property {string} title - Título da ação
   * @property {string} description - Descrição da funcionalidade
   * @property {string} icon - Nome do ícone
   * @property {string} color - Cor tema em hexadecimal
   * @property {Component} component - Componente de ícone
   * @property {Function} action - Função executada ao tocar
   */
  const quickActions = [
    {
      id: 1,
      title: 'Tutorial do App',
      description: 'Aprenda a usar todas as funcionalidades',
      icon: 'play-circle',
      color: '#8B5CF6',
      component: Icon,
      action: () => {
        const url =
          'https://www.youtube.com/watch?v=video do pillcheck tutorial;';
        Linking.openURL(url).catch(() => {
          Alert.alert('Erro', 'Não foi possível abrir o link.');
        });
      },
    },
    {
      id: 2,
      title: 'Guia de Medicamentos',
      description: 'Informações sobre tipos de medicamentos',
      icon: 'book',
      color: '#10B981',
      component: Icon,
      action: () => {
        Alert.alert(
          'Guia de Medicamentos',
          'Consulte sempre seu médico ou farmacêutico para informações específicas sobre medicamentos.',
          [{text: 'Entendi'}],
        );
      },
    },
    {
      id: 3,
      title: 'Dicas de Adesão',
      description: 'Como manter regularidade no tratamento',
      icon: 'bulb',
      color: '#F59E0B',
      component: Icon,
      action: () => {
        Alert.alert(
          'Dicas de Adesão',
          '✔ Tome os remédios sempre no mesmo horário\n✔ Use lembretes no celular\n✔ Mantenha os remédios em local visível\n✔ Converse com seu médico sobre dificuldades!!!',
        );
      },
    },
  ];

  /**
   * Função para alternar a expansão de itens do FAQ
   *
   * @description Controla qual pergunta do FAQ está expandida, permitindo
   * apenas uma pergunta expandida por vez. Se a pergunta já estiver expandida,
   * ela será recolhida.
   *
   * @param {number} id - ID do item FAQ a ser expandido/recolhido
   * @returns {void}
   *
   * @example
   * // Expandir FAQ com ID 1
   * toggleFaq(1);
   *
   * // Recolher FAQ atualmente expandido
   * toggleFaq(expandedFaq);
   */
  const toggleFaq = id => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

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
        <Text style={styles.headerTitle}>Central de Ajuda</Text>
        <Text style={styles.headerSubtitle}>Estamos aqui para ajudar você</Text>
      </View>
    </Animated.View>
  );

  /**
   * Renderiza a seção de ações rápidas
   *
   * @description Cria uma lista de cartões interativos com ações rápidas
   * que o usuário pode executar, como acessar tutorial, guias e dicas.
   * Cada cartão tem ícone colorido, título, descrição e ação associada.
   *
   * @returns {JSX.Element} Elemento JSX da seção de ações rápidas
   *
   * @private
   */
  const renderQuickActions = () => (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideUpAnim}],
        },
      ]}>
      <Text style={styles.sectionTitle}>Ações Rápidas</Text>
      <View style={styles.quickActionsGrid}>
        {quickActions.map(action => (
          <TouchableOpacity
            key={action.id}
            style={[
              styles.quickActionCard,
              {
                backgroundColor: action.color + '15',
                borderColor: action.color + '25',
                borderLeftColor: action.color,
              },
            ]}
            onPress={action.action}>
            <View
              style={[styles.quickActionIcon, {backgroundColor: action.color}]}>
              <action.component name={action.icon} size={20} color="#FFFFFF" />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>{action.title}</Text>
              <Text style={styles.quickActionDescription}>
                {action.description}
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  /**
   * Renderiza a seção de Perguntas Frequentes (FAQ)
   *
   * @description Cria uma lista expansível de perguntas e respostas.
   * Cada item pode ser expandido para mostrar a resposta completa.
   * Apenas uma pergunta pode estar expandida por vez.
   *
   * @returns {JSX.Element} Elemento JSX da seção FAQ
   *
   * @private
   */
  const renderFAQ = () => (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideUpAnim}],
        },
      ]}>
      <Text style={styles.sectionTitle}>Perguntas Frequentes</Text>
      <View style={styles.faqContainer}>
        {faqData.map(item => (
          <View key={item.id} style={styles.faqItem}>
            <TouchableOpacity
              style={[
                styles.faqQuestion,
                expandedFaq === item.id && styles.faqQuestionExpanded,
              ]}
              onPress={() => toggleFaq(item.id)}>
              <Text style={styles.faqQuestionText}>{item.question}</Text>
              <Icon
                name={expandedFaq === item.id ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#94a3b8"
              />
            </TouchableOpacity>
            {expandedFaq === item.id && (
              <Animated.View style={styles.faqAnswer}>
                <Text style={styles.faqAnswerText}>{item.answer}</Text>
              </Animated.View>
            )}
          </View>
        ))}
      </View>
    </Animated.View>
  );

  /**
   * Renderiza a seção de contato
   *
   * @description Cria um grid de cartões com diferentes opções de contato,
   * incluindo suporte, WhatsApp, email e avaliação do app. Cada cartão
   * tem ícone temático, título, descrição e ação específica.
   *
   * @returns {JSX.Element} Elemento JSX da seção de contato
   *
   * @private
   */
  const renderContact = () => (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideUpAnim}],
        },
      ]}>
      <Text style={styles.sectionTitle}>Entre em Contato</Text>
      <View style={styles.contactGrid}>
        {contactOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.contactCard,
              {
                backgroundColor: option.color + '15',
                borderColor: option.color + '25',
              },
            ]}
            onPress={option.action}>
            <View style={[styles.contactIcon, {backgroundColor: option.color}]}>
              <option.component name={option.icon} size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.contactTitle}>{option.title}</Text>
            <Text style={styles.contactDescription}>{option.description}</Text>
          </TouchableOpacity>
        ))}
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
        {renderQuickActions()}
        {renderFAQ()}
        {renderContact()}

        {/* Seção de informações do aplicativo */}
        <View style={styles.appInfoSection}>
          <Text style={styles.appInfoTitle}>PillCheck</Text>
          <Text style={styles.appInfoVersion}>Versão 1.0.0</Text>
          <Text style={styles.appInfoCopyright}>
            © 2025 PillCheck. Todos os direitos reservados.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * Estilos do componente Ajuda
 *
 * @description StyleSheet contendo todos os estilos utilizados no componente.
 * Inclui responsividade para diferentes tamanhos de tela, cores consistentes
 * com o tema dark, animações suaves e design moderno.
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
 * @property {Object} section - Seção genérica
 * @property {Object} sectionTitle - Título de seção
 * @property {Object} quickActionsGrid - Grid de ações rápidas
 * @property {Object} quickActionCard - Cartão de ação rápida
 * @property {Object} quickActionIcon - Ícone da ação rápida
 * @property {Object} quickActionContent - Conteúdo da ação rápida
 * @property {Object} quickActionTitle - Título da ação rápida
 * @property {Object} quickActionDescription - Descrição da ação rápida
 * @property {Object} faqContainer - Container do FAQ
 * @property {Object} faqItem - Item individual do FAQ
 * @property {Object} faqQuestion - Pergunta do FAQ
 * @property {Object} faqQuestionExpanded - Pergunta expandida
 * @property {Object} faqQuestionText - Texto da pergunta
 * @property {Object} faqAnswer - Resposta do FAQ
 * @property {Object} faqAnswerText - Texto da resposta
 * @property {Object} contactGrid - Grid de contato
 * @property {Object} contactCard - Cartão de contato
 * @property {Object} contactIcon - Ícone de contato
 * @property {Object} contactTitle - Título do contato
 * @property {Object} contactDescription - Descrição do contato
 * @property {Object} appInfoSection - Seção de informações do app
 * @property {Object} appInfoTitle - Título das informações
 * @property {Object} appInfoVersion - Versão do app
 * @property {Object} appInfoCopyright - Copyright
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
    paddingTop: 17,
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
    fontSize: isSmallScreen ? 20 : 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  quickActionsGrid: {
    gap: 14,
  },
  quickActionCard: {
    borderRadius: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: isSmallScreen ? 16 : 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  quickActionDescription: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#94a3b8',
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  faqContainer: {
    gap: 12,
  },
  faqItem: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  faqQuestionExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  faqQuestionText: {
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 12,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  faqAnswer: {
    padding: 18,
    paddingTop: 0,
  },
  faqAnswerText: {
    fontSize: isSmallScreen ? 14 : 15,
    color: '#94a3b8',
    lineHeight: isSmallScreen ? 20 : 22,
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  contactCard: {
    flex: 1,
    minWidth: (width - 62) / 2, // Para 2 colunas
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  contactTitle: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  contactDescription: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#94a3b8',
    textAlign: 'center',
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  appInfoSection: {
    alignItems: 'center',
    padding: 30,
    marginTop: 20,
  },
  appInfoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
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

export default Ajuda;
