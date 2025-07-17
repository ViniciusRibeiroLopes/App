import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Dimensions 
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const { width } = Dimensions.get('window');

const Index = ({ navigation }) => {
  const [medicamentos, setMedicamentos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [activeTab, setActiveTab] = useState('alertas');
  const user = auth().currentUser;

  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('remedios')
      .where('usuarioId', '==', user.uid)
      .orderBy('hora')
      .onSnapshot(
        snapshot => {
          if (!snapshot || !snapshot.docs) {
            console.warn('Snapshot vazio ou inválido');
            return;
          }

          const lista = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMedicamentos(lista);
          generateAlertas(lista);
        },
        error => {
          console.error('Erro ao buscar medicamentos:', error);
          Alert.alert('Erro', 'Não foi possível carregar os dados.');
        }
      );

    return unsubscribe;
  }, [user]);

  const generateAlertas = (medicamentosList) => {
    const now = new Date();
    const alertasGerados = [];

    medicamentosList.forEach(med => {
      // Alerta de dose atrasada
      if (Math.random() > 0.7) {
        alertasGerados.push({
          id: `atrasada-${med.id}`,
          tipo: 'urgente',
          titulo: `Dose Atrasada - ${med.nome}`,
          descricao: `Você perdeu a dose das ${med.horario}. É importante manter a regularidade.`,
          tempo: 'Há 2 horas',
          medicamento: med,
          cor: '#ff6b6b'
        });
      }

      // Alerta de próxima dose
      if (Math.random() > 0.5) {
        alertasGerados.push({
          id: `proxima-${med.id}`,
          tipo: 'lembrete',
          titulo: `Próxima Dose - ${med.nome}`,
          descricao: `Sua próxima dose está agendada para ${med.horario}. ${med.dosagem}.`,
          tempo: 'Em 1 hora',
          medicamento: med,
          cor: '#3742fa'
        });
      }

      if (Math.random() > 0.6) {
        alertasGerados.push({
          id: `tomar-${med.id}`,
          tipo: 'aviso',
          titulo: `Hora de Tomar - ${med.nome}`,
          descricao: `É hora de tomar ${med.dosagem} de ${med.nome}. ${med.para}.`,
          tempo: 'Agora',
          medicamento: med,
          cor: '#ffa502'
        });
      }
    });

    setAlertas(alertasGerados);
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();
      Alert.alert('Sucesso', 'Você saiu da conta.');
    } catch (error) {
      Alert.alert('Erro ao sair');
    }
  };

  const renderStatsCards = () => {
    const totalAlertas = alertas.length;
    const urgentes = alertas.filter(a => a.tipo === 'urgente').length;
    const lembretes = alertas.filter(a => a.tipo === 'lembrete').length;
    const avisos = alertas.filter(a => a.tipo === 'aviso').length;

    return (
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#3742fa' }]}>
          <Text style={styles.statNumber}>{totalAlertas}</Text>
          <Text style={styles.statLabel}>Total de Avisos</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#ff6b6b' }]}>
          <Text style={styles.statNumber}>{urgentes}</Text>
          <Text style={styles.statLabel}>Urgentes</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#ffa502' }]}>
          <Text style={styles.statNumber}>{medicamentos.length}</Text>
          <Text style={styles.statLabel}>Medicamentos</Text>
        </View>
      </View>
    );
  };

  const renderAlertItem = (alerta) => (
    <View key={alerta.id} style={[styles.alertCard, { borderLeftColor: alerta.cor }]}>
      <View style={styles.alertHeader}>
        <View style={styles.alertTitleContainer}>
          <Text style={styles.alertTitle}>{alerta.titulo}</Text>
          <View style={[styles.typeBadge, { backgroundColor: alerta.cor }]}>
            <Text style={styles.typeText}>
              {alerta.tipo === 'urgente' ? 'Urgente' : 
               alerta.tipo === 'lembrete' ? 'Lembrete' : 'Aviso'}
            </Text>
          </View>
        </View>
        <View style={styles.alertTimeContainer}>
          <Text style={styles.alertTime}>{alerta.tempo}</Text>
        </View>
      </View>
      <Text style={styles.alertDescription}>{alerta.descricao}</Text>
      <View style={styles.alertActions}>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Confirmar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Adiar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMedicamentoCard = (remedio) => (
    <View key={remedio.id} style={styles.medicamentoCard}>
      <View style={styles.medicamentoHeader}>
        <Text style={styles.medicamentoNome}>{remedio.nome}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Ativo</Text>
        </View>
      </View>
      <View style={styles.medicamentoDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Funcionalidade:</Text>
          <Text style={styles.detailValue}>{remedio.utilidade}</Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('AdicionarRemedio', { remedio })}
        >
          <Text style={styles.editButtonText}>✏️ Editar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAlertas = () => (
    <ScrollView style={styles.tabContent}>
      {renderStatsCards()}
      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔔 Todos os Avisos</Text>
          <TouchableOpacity 
            style={styles.addAlertButton}
            onPress={() => Alert.alert('Adicionar Alerta', 'Funcionalidade em desenvolvimento')}
          >
            <Text style={styles.addAlertButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        {alertas.length === 0 ? (
          <Text style={styles.noData}>Nenhum aviso no momento.</Text>
        ) : (
          alertas.map(renderAlertItem)
        )}
      </View>
    </ScrollView>
  );

  const renderMedicamentos = () => (
    <ScrollView style={styles.tabContent}>
      {medicamentos.length === 0 ? (
        <Text style={styles.noData}>Nenhum remédio encontrado.</Text>
      ) : (
        medicamentos.map(renderMedicamentoCard)
      )}
      
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AdicionarRemedio')}
      >
        <Text style={styles.addButtonText}>+ Adicionar Remédio</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💊 MediAlert</Text>
        <Text style={styles.subtitle}>Olá, {user?.email?.split('@')[0] || 'Usuário'} 👋</Text>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'alertas' && styles.activeTab]}
          onPress={() => setActiveTab('alertas')}
        >
          <Text style={[styles.tabText, activeTab === 'alertas' && styles.activeTabText]}>
            🔔 Avisos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'medicamentos' && styles.activeTab]}
          onPress={() => setActiveTab('medicamentos')}
        >
          <Text style={[styles.tabText, activeTab === 'medicamentos' && styles.activeTabText]}>
            💊 Remédios
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'alertas' ? renderAlertas() : renderMedicamentos()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#121a29',
    paddingHorizontal: 20,
    paddingVertical: 40,
    paddingTop: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#cbd5e0',
  },
  logoutButton: {
    position: 'absolute',
    right: 20,
    top: 60,
    backgroundColor: '#ffffff22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#718096',
  },
  activeTabText: {
    color: '#121a29',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 5,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#121a29',
  },
  addAlertButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#121a29',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  addAlertButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  alertTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121a29',
    marginBottom: 5,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  alertTimeContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  alertTime: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
  },
  alertDescription: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
    marginBottom: 15,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#121a29',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  secondaryButtonText: {
    color: '#718096',
    fontSize: 14,
    fontWeight: '600',
  },
  medicamentoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderTopWidth: 4,
    borderTopColor: '#dd4b65',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  medicamentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  medicamentoNome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#121a29',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#d4edda',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    color: '#155724',
    fontWeight: '600',
  },
  medicamentoDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#121a29',
    fontWeight: '600',
  },
  noData: {
    color: '#718096',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#121a29',
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Index;