import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const RemedioForm = ({ route, navigation }) => {
  const isEdit = !!route.params?.remedio;
  const [nome, setNome] = useState('');
  const [dosagem, setDosagem] = useState('');
  const [intervalo, setIntervalo] = useState('');
  const [hora, setHora] = useState('');

  useEffect(() => {
    if (isEdit) {
      const { nome, dosagem, intervalo, hora } = route.params.remedio;
      setNome(nome);
      setDosagem(dosagem);
      setIntervalo(intervalo);
      setHora(hora);
    }
  }, []);

  const handleSalvar = async () => {
    const uid = auth().currentUser?.uid;
    if (!nome || !dosagem || !intervalo || !hora) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    try {
      if (isEdit) {
        await firestore().collection('remedios').doc(route.params.remedio.id).update({
          nome, dosagem, intervalo, hora
        });
        Alert.alert('Sucesso', 'Remédio atualizado!');
      } else {
        await firestore().collection('remedios').add({
          nome, dosagem, intervalo, hora, usuarioId: uid
        });
        Alert.alert('Sucesso', 'Remédio adicionado!');
      }

      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível salvar o remédio.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isEdit ? 'Editar Remédio' : 'Novo Remédio'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome do remédio"
        value={nome}
        onChangeText={setNome}
      />
      <TextInput
        style={styles.input}
        placeholder="Dosagem (ex: 500mg)"
        value={dosagem}
        onChangeText={setDosagem}
      />
      <TextInput
        style={styles.input}
        placeholder="Intervalo (ex: 8/8h)"
        value={intervalo}
        onChangeText={setIntervalo}
      />
      <TextInput
        style={styles.input}
        placeholder="Horário (ex: 14:00)"
        value={hora}
        onChangeText={setHora}
      />

      <TouchableOpacity style={styles.button} onPress={handleSalvar}>
        <Text style={styles.buttonText}>{isEdit ? 'Salvar alterações' : 'Adicionar'}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default RemedioForm;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 30,
    color: '#121a29',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  button: {
    backgroundColor: '#121a29',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
