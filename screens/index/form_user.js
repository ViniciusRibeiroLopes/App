import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const UserProfileForm = ({ navigation }) => {
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');

  const handleSave = async () => {
    const uid = auth().currentUser?.uid;

    if (!uid) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    try {
      await firestore().collection('users').doc(uid).set({
        name: name,
        birthdate: birthdate,
        createdAt: firestore.FieldValue.serverTimestamp(),
        email: auth().currentUser?.email,
      });

      Alert.alert('Sucesso', 'Dados salvos com sucesso!');
      navigation.replace('Index'); // ou para a tela principal
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível salvar os dados');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nome completo</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Digite seu nome"
      />

      <Text style={styles.label}>Data de nascimento</Text>
      <TextInput
        style={styles.input}
        value={birthdate}
        onChangeText={setBirthdate}
        placeholder="DD/MM/AAAA"
      />

      <Button title="Salvar" onPress={handleSave} />
    </View>
  );
};

export default UserProfileForm;

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: 'center' },
  label: { fontWeight: 'bold', marginTop: 10 },
  input: {
    borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginBottom: 15
  }
});
