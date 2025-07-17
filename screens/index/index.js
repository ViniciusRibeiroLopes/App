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
        },
        error => {
          console.error('Erro ao buscar medicamentos:', error);
          Alert.alert('Erro', 'Não foi possível carregar os dados.');
        }
      );

      const unsubscribe_alert = firestore()
        .collection('avisos')
        .where('usuarioId', '==', user.uid)
        .orderBy('horario')
        .onSnapshot(
          snapshot => {
            if (!snapshot || !snapshot.docs) {
              console.warn('Snapshot vazio ou inválido');
              return;
            }

            const lista_alert = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            generateAlertas(lista_alert);
          },
          error => {
            console.error('Erro ao buscar alertas:', error);
            Alert.alert('Erro', 'Não foi possível carregar os dados.');
          }
        );

    return () => {
      unsubscribe();
      unsubscribe_alert();
    };
  }, [user]);

 const generateAlertas = async (alertasList) => {
  const alertasCompletos = await Promise.all(
    alertasList.map(async (aviso) => {
      try {
        const remedioSnapshot = await firestore()
          .collection('remedios')
          .doc(aviso.remedioId)
          .get();

        const remedioData = remedioSnapshot.exists ? remedioSnapshot.data() : {};

        return {
          id: `tomar-${aviso.id}`,
          tipo: 'aviso',
          titulo: remedioData.nome || 'Remédio',
          horario: aviso.horario,
          descricao: `Tomar ${aviso.dosagem || 'a dose prescrita'}`,
          tempo: 'Agora',
          cor: '#4CAF50',
          medicamento: remedioData,
          ativo: true
        };
      } catch (error) {
        console.error('Erro ao buscar nome do remédio:', error);
        return null;
      }
    })
  );

  const filtrados = alertasCompletos.filter(Boolean);
  setAlertas(filtrados);
};

  const handleLogout = async () => {
    try {
      await auth().signOut();
      Alert.alert('Sucesso', 'Você saiu da conta.');
    } catch (error) {
      Alert.alert('Erro ao sair');
    }
  };

  const renderAlertItem = (alerta) => (
    <View key={alerta.id} style={styles.alarmCard}>
      <View style={styles.alarmHeader}>
        <View style={styles.alarmTimeContainer}>
          <Text style={styles.alarmTime}>{alerta.horario}</Text>
          <Text style={styles.alarmPeriod}>Alarme</Text>
        </View>
        <TouchableOpacity style={styles.alarmToggle}>
          <View style={[styles.toggleSwitch, alerta.ativo && styles.toggleActive]}>
            <View style={[styles.toggleKnob, alerta.ativo && styles.toggleKnobActive]} />
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.alarmContent}>
        <Text style={styles.alarmMedicamento}>{alerta.titulo}</Text>
        <Text style={styles.alarmDescricao}>{alerta.descricao}</Text>
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
      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⏰ Alarmes de Medicação</Text>
          <TouchableOpacity 
            style={styles.addAlertButton}
            onPress={() => navigation.navigate('AdicionarAlerta')}
          >
            <Text style={styles.addAlertButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        {alertas.length === 0 ? (
          <Text style={styles.noData}>Nenhum alarme configurado.</Text>
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
            ⏰ Alarmes
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
  alarmCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  alarmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  alarmTimeContainer: {
    flex: 1,
  },
  alarmTime: {
    fontSize: 48,
    fontWeight: '200',
    color: '#121a29',
    fontFamily: 'monospace',
    letterSpacing: -2,
  },
  alarmPeriod: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
    marginTop: -5,
  },
  alarmToggle: {
    padding: 5,
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  alarmContent: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 15,
    marginBottom: 10,
  },
  alarmMedicamento: {
    fontSize: 20,
    fontWeight: '600',
    color: '#121a29',
    marginBottom: 5,
  },
  alarmDescricao: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
  alarmActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  snoozeButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  snoozeButtonText: {
    color: '#718096',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Estilos dos cards de medicamento (mantidos)
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
  editButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  editButtonText: {
    color: '#718096',
    fontSize: 14,
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