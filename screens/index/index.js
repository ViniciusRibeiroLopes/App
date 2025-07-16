import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const HomeScreen = ({ navigation }) => {
  const [medicamentos, setMedicamentos] = useState([]);
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
      },
      error => {
        console.error('Erro ao buscar medicamentos:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados.');
      }
    );

  return unsubscribe;
}, [user]);


  const handleLogout = async () => {
    try {
      await auth().signOut();
      Alert.alert('Sucesso', 'Você saiu da conta.');
    } catch (error) {
      Alert.alert('Erro ao sair');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Olá, {user?.email?.split('@')[0] || 'Usuário'} 👋</Text>
        <Text style={styles.subtitle}>Aqui estão seus remédios:</Text>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {medicamentos.length === 0 ? (
          <Text style={styles.noData}>Nenhum remédio encontrado.</Text>
        ) : (
          medicamentos.map((remedio) => (
            <View key={remedio.id} style={styles.card}>
              <View style={styles.indicator} />
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{remedio.nome}</Text>
                <Text style={styles.info}>
                  {remedio.dosagem} • {remedio.frequencia} • {remedio.para}
                </Text>
              </View>
              <View style={styles.horarioContainer}>
                <Text style={styles.horario}>{remedio.horario}</Text>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AdicionarRemedio')}
        >
          <Text style={styles.addButtonText}>+ Adicionar Remédio</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    fontSize: 26,
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
  content: {
    padding: 20,
  },
  noData: {
    color: '#718096',
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  indicator: {
    width: 5,
    height: '100%',
    backgroundColor: '#dd4b65',
    marginRight: 12,
    borderRadius: 3,
  },
  nome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121a29',
  },
  info: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
  },
  horarioContainer: {
    backgroundColor: '#dd4b65',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    justifyContent: 'center',
  },
  horario: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
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

export default HomeScreen;
