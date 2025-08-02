import React, { useEffect, useState } from 'react';
import { View, Text, Button, TouchableOpacity, StyleSheet, FlatList, Alert, ScrollView, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

import notifee, { TimestampTrigger, TriggerType, AndroidImportance, AndroidVisibility, AndroidCategory, RepeatFrequency } from '@notifee/react-native';
import { Platform } from 'react-native';

const diasSemana = [
  { abrev: 'Dom', completo: 'Domingo' },
  { abrev: 'Seg', completo: 'Segunda' },
  { abrev: 'Ter', completo: 'Terça' },
  { abrev: 'Qua', completo: 'Quarta' },
  { abrev: 'Qui', completo: 'Quinta' },
  { abrev: 'Sex', completo: 'Sexta' },
  { abrev: 'Sáb', completo: 'Sábado' }
];

const FormAlertaDependente = ({ navigation, route }) => {
  const [remedios, setRemedios] = useState([]);
  const [dependente, setDependente] = useState(null);
  const [remedioSelecionado, setRemedioSelecionado] = useState('');
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [dosagem, setDosagem] = useState('');
  const [horario, setHorario] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);

  const uid = auth().currentUser?.uid;
  const { dependenteId } = route.params || {};

  useEffect(() => {
    if (!uid || !dependenteId) {
      Alert.alert('Erro', 'Dependente não encontrado.');
      navigation.goBack();
      return;
    }

    const inicializar = async () => {
      try {
        // Buscar informações do dependente
        const dependenteDoc = await firestore()
          .collection('users_dependentes')
          .doc(dependenteId)
          .get();

        if (dependenteDoc.exists) {
          const dependenteData = {
            id: dependenteDoc.id,
            ...dependenteDoc.data()
          };
          setDependente(dependenteData);
        } else {
          Alert.alert('Erro', 'Dependente não encontrado.');
          navigation.goBack();
          return;
        }

        // Buscar remédios do usuário administrador
        const remediosSnapshot = await firestore()
          .collection('remedios')
          .where('usuarioId', '==', uid)
          .get();

        const lista = remediosSnapshot.docs.map(doc => ({
          id: doc.id,
          nome: doc.data().nome,
        }));

        setRemedios(lista);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao inicializar:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados.');
        navigation.goBack();
      }
    };

    inicializar();
  }, [uid, dependenteId]);

  const toggleDia = (dia) => {
    setDiasSelecionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  
  const salvarAviso = async () => {
    if (!remedioSelecionado || diasSelecionados.length === 0 || !horario || !dosagem.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    try {
      const horarioStr = horario.toTimeString().slice(0, 5);
      const remedio = remedios.find(r => r.id === remedioSelecionado);

      await firestore().collection('alertas_dependentes').add({
        usuarioId: uid,
        dependenteId: dependenteId,
        remedioId: remedioSelecionado,
        dias: diasSelecionados,
        horario: horarioStr,
        dosagem: dosagem.trim(),
      });


      Alert.alert('Sucesso', `Aviso para ${dependente.nome || dependente.nomeCompleto} salvo com sucesso!`);
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível salvar o aviso.');
    }
  };

  const formatarHorario = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.alarmIcon}>
              <Text style={styles.alarmIconText}>⏰</Text>
            </View>
            <Text style={styles.headerTitle}>Novo Lembrete</Text>
            <Text style={styles.headerSubtitle}>
              Alarme para {dependente?.nome || dependente?.nomeCompleto}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💊 Medicamento</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={remedioSelecionado}
              onValueChange={(itemValue) => setRemedioSelecionado(itemValue)}
              style={styles.picker}
              dropdownIconColor="#64ffda"
            >
              <Picker.Item label="Selecione um remédio" value="" color="#999" />
              {remedios.map(r => (
                <Picker.Item key={r.id} label={r.nome} value={r.id} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💉 Dosagem</Text>
          <View style={styles.pickerContainer}>
            <TextInput 
              style={styles.textInput} 
              placeholder="Ex: 30mg, 1 comprimido" 
              placeholderTextColor="#999" 
              value={dosagem} 
              onChangeText={setDosagem}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕐 Horário</Text>
          <View style={styles.digitalClock}>
            <Text style={styles.digitalTime}>
              {formatarHorario(horario)}
            </Text>
            <TouchableOpacity 
              style={styles.timeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.timeButtonText}>AJUSTAR</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Dias da Semana</Text>
          <View style={styles.diasContainer}>
            {diasSemana.map((dia) => (
              <TouchableOpacity
                key={dia.abrev}
                style={[
                  styles.diaButton,
                  diasSelecionados.includes(dia.abrev) && styles.diaSelecionado,
                ]}
                onPress={() => toggleDia(dia.abrev)}
              >
                <Text style={[
                  styles.diaTexto,
                  diasSelecionados.includes(dia.abrev) && styles.diaTextoSelecionado
                ]}>
                  {dia.abrev}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Resumo do Alerta */}
        {remedioSelecionado && diasSelecionados.length > 0 && dosagem.trim() && (
          <View style={styles.resumoContainer}>
            <Text style={styles.resumoTitle}>📋 Resumo do Alerta</Text>
            <View style={styles.resumoContent}>
              <Text style={styles.resumoText}>
                👤 Dependente: {dependente?.nome || dependente?.nomeCompleto}
              </Text>
              <Text style={styles.resumoText}>
                💊 Medicamento: {remedios.find(r => r.id === remedioSelecionado)?.nome}
              </Text>
              <Text style={styles.resumoText}>
                💉 Dosagem: {dosagem}
              </Text>
              <Text style={styles.resumoText}>
                🕐 Horário: {formatarHorario(horario)}
              </Text>
              <Text style={styles.resumoText}>
                📅 Dias: {diasSelecionados.join(', ')}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={styles.salvarButton}
          onPress={salvarAviso}
          activeOpacity={0.8}
        >
          <Text style={styles.salvarButtonText}>✓ ATIVAR ALARME</Text>
        </TouchableOpacity>

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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64ffda',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  backIcon: {
    color: '#64ffda',
    fontSize: 18,
    fontWeight: '600',
  },
  headerContent: {
    alignItems: 'center',
  },
  alarmIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#64ffda',
  },
  alarmIconText: {
    fontSize: 40,
  },
  headerTitle: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#b0bec5',
    textAlign: 'center',
  },
  section: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#64ffda',
    fontWeight: '600',
    marginBottom: 15,
  },
  pickerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.3)',
    overflow: 'hidden',
  },
  picker: {
    color: '#ffffff',
    height: 50,
  },
  textInput: {
    color: '#fff',
    padding: 15,
    fontSize: 16,
  },
  digitalClock: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#64ffda',
    elevation: 10,
  },
  digitalTime: {
    fontSize: 48,
    color: '#64ffda',
    fontWeight: '300',
    fontFamily: 'monospace',
    marginBottom: 15,
  },
  timeButton: {
    backgroundColor: 'rgba(100, 255, 218, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#64ffda',
  },
  timeButtonText: {
    color: '#64ffda',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  diasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  diaButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  diaSelecionado: {
    backgroundColor: '#64ffda',
    borderColor: '#64ffda',
    elevation: 8,
  },
  diaTexto: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  diaTextoSelecionado: {
    color: '#0f0f23',
  },
  resumoContainer: {
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.3)',
  },
  resumoTitle: {
    fontSize: 16,
    color: '#64ffda',
    fontWeight: '600',
    marginBottom: 10,
  },
  resumoContent: {
    paddingLeft: 10,
  },
  resumoText: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 5,
  },
  salvarButton: {
    marginBottom: 30,
    marginHorizontal: 20,
    borderRadius: 25,
    backgroundColor: '#64ffda',
    paddingVertical: 18,
    alignItems: 'center',
    elevation: 15,
  },
  salvarButtonText: {
    color: '#0f0f23',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

export default FormAlertaDependente;