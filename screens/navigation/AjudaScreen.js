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

const {width, height} = Dimensions.get('window');

const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;

const Ajuda = ({navigation}) => {
  const [expandedFaq, setExpandedFaq] = useState(null);

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

    return () => backgroundAnimation.stop();
  }, [backgroundAnim, fadeAnim, slideUpAnim]);

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

  const toggleFaq = id => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121A29" />

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

      {renderHeader()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {renderQuickActions()}
        {renderFAQ()}
        {renderContact()}

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
