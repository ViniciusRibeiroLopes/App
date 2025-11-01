import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Alert,
  Modal,
  TextInput,
} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const diasSemana = [
  { abrev: 'Dom', completo: 'Domingo' },
  { abrev: 'Seg', completo: 'Segunda' },
  { abrev: 'Ter', completo: 'Terça' },
  { abrev: 'Qua', completo: 'Quarta' },
  { abrev: 'Qui', completo: 'Quinta' },
  { abrev: 'Sex', completo: 'Sexta' },
  { abrev: 'Sáb', completo: 'Sábado' }
];

const NextMedicationScreen = ({ navigation }) => {
  const [nextMedication, setNextMedication] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTimeCorrect, setIsTimeCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [senhaAdmin, setSenhaAdmin] = useState('');
  const [senhaDigits, setSenhaDigits] = useState(['', '', '', '', '', '']);
  const [userId, setUserId] = useState(null);
  const [adminUid, setAdminUid] = useState(null);
  const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const inputRefs = useRef([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const refreshAnim = useRef(new Animated.Value(0)).current;

  const uid = auth().currentUser?.uid;

  // Inicialização
  useEffect(() => {
    console.log('=== MONTANDO COMPONENTE ===');
    console.log('UID:', uid);
    
    if (!uid) {
      console.log('Sem UID, nao pode continuar');
      setLoading(false);
      return;
    }

    setUserId(uid);
    buscarSenhaAdmin(uid);
    fetchNextMedication();

    // Listener em tempo real para medicamentos tomados
    const unsubscribe = firestore()
      .collection('medicamentos_tomados_dependentes')
      .where('dependenteId', '==', uid)
      .onSnapshot((snapshot) => {
        console.log('🔔 LISTENER DISPARADO - Mudanca detectada em medicamentos_tomados_dependentes');
        console.log(`   📊 Total de documentos: ${snapshot.size}`);
        console.log(`   🔄 Tipo de mudança: ${snapshot.docChanges().map(c => c.type).join(', ')}`);
        
        // Atualização imediata quando houver mudança
        setTimeout(() => {
          console.log('   ⏳ Buscando medicamentos após mudança...');
          fetchNextMedication();
        }, 300);
      });

    console.log('✅ Componente montado com sucesso');

    return () => {
      console.log('🧹 Desmontando componente');
      unsubscribe();
    };
  }, [uid]);

  // Sistema de atualização a cada 30 segundos
  useEffect(() => {
    if (!uid) return;

    console.log('⏰ Iniciando intervalos de atualizacao');

    const timeInterval = setInterval(() => {
      console.log('[INTERVALO] Atualizando horario e medicamentos');
      setCurrentTime(new Date());
      fetchNextMedication();
    }, 30000); // 30 segundos

    return () => {
      console.log('Limpando intervalos');
      clearInterval(timeInterval);
    };
  }, [uid]);

  // ========== NOVA FUNCIONALIDADE: Verificação de medicamentos não tomados ==========
  useEffect(() => {
    if (!uid) return;

    console.log('⚠️ Iniciando verificação de medicamentos não tomados');

    // Verificação imediata na montagem
    verificarMedicamentosNaoTomados();

    // Verificação a cada 1 minuto (para detectar rapidamente os 10 minutos)
    const naoTomadosInterval = setInterval(() => {
      console.log('[INTERVALO] Verificando medicamentos não tomados');
      verificarMedicamentosNaoTomados();
    }, 60000); // 1 minuto

    return () => {
      console.log('Limpando intervalo de não tomados');
      clearInterval(naoTomadosInterval);
    };
  }, [uid]);

  /**
   * NOVA FUNÇÃO: Verifica e registra medicamentos não tomados
   * Se passou 10 minutos do horário e não foi tomado, registra como não tomado
   */
  const verificarMedicamentosNaoTomados = async () => {
    if (!uid) return;

    try {
      console.log('\n🔍 ========== VERIFICANDO MEDICAMENTOS NÃO TOMADOS ==========');
      
      const now = new Date();
      const currentTimeStr = now.toTimeString().slice(0, 5);
      const currentDay = diasSemana[now.getDay()].abrev;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diaStr = today.toISOString().slice(0, 10);

      // Buscar todos os alertas do usuário
      const todosAlertasSnapshot = await firestore()
        .collection('alertas_dependentes')
        .where('dependenteId', '==', uid)
        .get();

      console.log(`📋 Total de alertas para verificar: ${todosAlertasSnapshot.size}`);

      for (const doc of todosAlertasSnapshot.docs) {
        const alerta = doc.data();
        
        // Processar alertas de dias fixos
        if (alerta.tipoAlerta === 'dias') {
          if (!alerta.dias || !Array.isArray(alerta.dias)) continue;
          if (!alerta.dias.includes(currentDay)) continue;

          const horarioAlerta = alerta.horario;
          const [hAlerta, mAlerta] = horarioAlerta.split(':').map(Number);
          const minutosAlerta = hAlerta * 60 + mAlerta;

          const [hAtual, mAtual] = currentTimeStr.split(':').map(Number);
          const minutosAtuais = hAtual * 60 + mAtual;

          const diferencaMinutos = minutosAtuais - minutosAlerta;

          // Se passaram mais de 10 minutos do horário
          if (diferencaMinutos > 10) {
            console.log(`⚠️ Medicamento ${alerta.remedioId} passou 10min (${diferencaMinutos}min)`);

            // Verificar se já foi registrado
            const jaRegistrado = await verificarSeJaRegistrado(
              alerta.remedioId,
              horarioAlerta,
              diaStr,
              doc.id
            );

            if (!jaRegistrado) {
              console.log(`❌ Registrando como NÃO TOMADO`);
              await registrarMedicamentoNaoTomado(alerta, diaStr, doc.id);
            } else {
              console.log(`✅ Já estava registrado (tomado ou não tomado)`);
            }
          }
        }
        
        // Processar alertas de intervalo
        if (alerta.tipoAlerta === 'intervalo') {
          const horarioAlerta = alerta.horarioInicio;
          const [hAlerta, mAlerta] = horarioAlerta.split(':').map(Number);
          const minutosAlerta = hAlerta * 60 + mAlerta;

          const [hAtual, mAtual] = currentTimeStr.split(':').map(Number);
          const minutosAtuais = hAtual * 60 + mAtual;

          const diferencaMinutos = minutosAtuais - minutosAlerta;

          // Se passaram mais de 10 minutos do horário
          if (diferencaMinutos > 10) {
            console.log(`⚠️ Medicamento INTERVALO ${alerta.remedioId} passou 10min (${diferencaMinutos}min)`);

            // Verificar se já foi registrado
            const jaRegistrado = await verificarSeJaRegistrado(
              alerta.remedioId,
              horarioAlerta,
              diaStr,
              doc.id
            );

            if (!jaRegistrado) {
              console.log(`❌ Registrando como NÃO TOMADO e atualizando próximo horário`);
              await registrarMedicamentoNaoTomado(alerta, diaStr, doc.id);
            } else {
              console.log(`✅ Já estava registrado (tomado ou não tomado)`);
            }
          }
        }
      }

      console.log('========== FIM DA VERIFICAÇÃO DE NÃO TOMADOS ==========\n');
    } catch (error) {
      console.error('❌ Erro ao verificar medicamentos não tomados:', error);
    }
  };

  /**
   * NOVA FUNÇÃO: Verifica se medicamento já foi registrado (tomado ou não tomado)
   */
  const verificarSeJaRegistrado = async (remedioId, horario, diaStr, alertaId) => {
    try {
      const registroSnapshot = await firestore()
        .collection('medicamentos_tomados_dependentes')
        .where('dependenteId', '==', uid)
        .where('remedioId', '==', remedioId)
        .where('dia', '==', diaStr)
        .where('alertaId', '==', alertaId)
        .get();

      if (registroSnapshot.empty) return false;

      // Verificar se algum registro corresponde ao horário
      const jaRegistrado = registroSnapshot.docs.some(doc => {
        const data = doc.data();
        return data.horarioAgendado === horario || data.horario === horario;
      });

      return jaRegistrado;
    } catch (error) {
      console.error('❌ Erro ao verificar registro:', error);
      return false;
    }
  };

  /**
   * NOVA FUNÇÃO: Registra medicamento como não tomado
   */
  const registrarMedicamentoNaoTomado = async (alerta, diaStr, alertaId) => {
    try {
      // Buscar dados do remédio
      const remedioDoc = await firestore()
        .collection('remedios')
        .doc(alerta.remedioId)
        .get();

      if (!remedioDoc.exists) {
        console.log('❌ Remédio não encontrado');
        return;
      }

      const remedioData = remedioDoc.data();
      const horarioQueDeveriaTerSido = alerta.tipoAlerta === 'intervalo' 
        ? alerta.horarioInicio 
        : alerta.horario;

      const dadosParaSalvar = {
        dia: diaStr,
        dosagem: alerta.dosagem,
        horario: horarioQueDeveriaTerSido,
        horarioAgendado: horarioQueDeveriaTerSido,
        remedioId: alerta.remedioId,
        remedioNome: remedioData.nome,
        dependenteId: alerta.dependenteId,
        tipoAlerta: alerta.tipoAlerta || 'dias',
        alertaId: alertaId,
        status: 'nao_tomado',
        timestamp: firestore.FieldValue.serverTimestamp(),
      };

      await firestore()
        .collection('medicamentos_tomados_dependentes')
        .add(dadosParaSalvar);

      console.log('✅ Registrado como NÃO TOMADO:', remedioData.nome, horarioQueDeveriaTerSido);

      // ⭐ NOVO: Se for alerta de INTERVALO, calcular próximo horário baseado no atual
      if (alerta.tipoAlerta === 'intervalo') {
        await atualizarProximoHorarioIntervalo(alerta, alertaId);
      }
    } catch (error) {
      console.error('❌ Erro ao registrar não tomado:', error);
    }
  };

  /**
   * ⭐ NOVA FUNÇÃO: Atualiza o próximo horário de um alerta de intervalo
   * Calcula: horário atual + intervalo
   */
  const atualizarProximoHorarioIntervalo = async (alerta, alertaId) => {
    try {
      console.log('\n🔄 ========== ATUALIZANDO PRÓXIMO HORÁRIO (INTERVALO) ==========');
      
      const now = new Date();
      const horaAtual = now.getHours();
      const minutoAtual = now.getMinutes();
      
      // Calcular próximo horário: agora + intervalo
      const intervaloMinutos = alerta.intervaloHoras * 60;
      const minutosAtuais = horaAtual * 60 + minutoAtual;
      const proximosMinutos = minutosAtuais + intervaloMinutos;
      
      // Verificar se ainda é hoje
      if (proximosMinutos > 23 * 60 + 59) {
        console.log('⏭️ Próximo horário seria amanhã - não atualizando');
        return;
      }
      
      const proximaHora = Math.floor(proximosMinutos / 60);
      const proximoMinuto = proximosMinutos % 60;
      const novoHorario = `${String(proximaHora).padStart(2, '0')}:${String(proximoMinuto).padStart(2, '0')}`;
      
      console.log('   ⏰ Horário atual:', `${String(horaAtual).padStart(2, '0')}:${String(minutoAtual).padStart(2, '0')}`);
      console.log('   ➕ Intervalo:', alerta.intervaloHoras, 'horas');
      console.log('   🎯 NOVO horário calculado:', novoHorario);
      
      // Atualizar o alerta no Firestore com o novo horário
      await firestore()
        .collection('alertas_dependentes')
        .doc(alertaId)
        .update({
          horarioInicio: novoHorario,
          ultimaAtualizacao: firestore.FieldValue.serverTimestamp()
        });
      
      console.log('✅ Horário do alerta atualizado no Firestore');
      console.log('========== FIM DA ATUALIZAÇÃO ==========\n');
      
    } catch (error) {
      console.error('❌ Erro ao atualizar próximo horário:', error);
    }
  };

  // Verificar horário correto
  useEffect(() => {
    checkTimeCorrectness();
  }, [currentTime, nextMedication]);

  // Animações
  useEffect(() => {
    console.log('🎬 Iniciando animações');

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    const background = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundAnim, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    );

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1.15,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );

    pulse.start();
    background.start();
    glow.start();
    rotate.start();

    return () => {
      console.log('🧹 Parando animações');
      pulse.stop();
      background.stop();
      glow.stop();
      rotate.stop();
    };
  }, []);

  const buscarSenhaAdmin = async (userUid) => {
    try {
      console.log('🔍 Buscando senha admin...');
      
      const dependenteDoc = await firestore()
        .collection('users_dependentes')
        .doc(userUid)
        .get();
      
      if (dependenteDoc.exists) {
        const dependenteData = dependenteDoc.data();
        const adminUidFound = dependenteData.usuarioId;
        
        if (adminUidFound) {
          setAdminUid(adminUidFound);
          
          const adminDoc = await firestore()
            .collection('users')
            .doc(adminUidFound)
            .get();
          
          if (adminDoc.exists) {
            const adminData = adminDoc.data();
            const senha = adminData.adminPassword || '';
            setSenhaAdmin(senha);
            console.log('✅ Senha admin carregada');
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar senha admin:', error);
    }
  };

  // Verificar se medicamento já foi tomado
  const verificarMedicamentoTomado = async (remedioId, horario, diaStr, tipoAlerta, alertaId) => {
    try {
      console.log('\n🔍 ========== VERIFICANDO SE FOI TOMADO ==========');
      console.log('   📋 Remédio ID:', remedioId);
      console.log('   ⏰ Horário:', horario);
      console.log('   📅 Dia:', diaStr);
      console.log('   📝 Tipo:', tipoAlerta);
      console.log('   🆔 Alerta ID:', alertaId);
      
      const tomadoSnapshot = await firestore()
        .collection('medicamentos_tomados_dependentes')
        .where('dependenteId', '==', uid)
        .where('remedioId', '==', remedioId)
        .where('dia', '==', diaStr)
        .where('alertaId', '==', alertaId)
        .get();

      console.log(`   📊 Total de registros para ESTE ALERTA hoje: ${tomadoSnapshot.size}`);

      if (tomadoSnapshot.empty) {
        console.log('   ✅ RESULTADO: NÃO FOI TOMADO (histórico vazio)');
        console.log('========== FIM DA VERIFICAÇÃO ==========\n');
        return false;
      }

      // Para alertas de horário fixo, verificar horário exato
      if (tipoAlerta === 'dias') {
        console.log('   🔎 Verificando horário fixo...');
        const tomadoExato = tomadoSnapshot.docs.some(doc => {
          const data = doc.data();
          const match1 = data.horario === horario;
          const match2 = data.horarioAgendado === horario;
          return match1 || match2;
        });
        console.log(`   ${tomadoExato ? '✅ RESULTADO: JÁ FOI TOMADO' : '❌ RESULTADO: NÃO FOI TOMADO'}`);
        console.log('========== FIM DA VERIFICAÇÃO ==========\n');
        return tomadoExato;
      }

      // Para alertas de intervalo: Verificar se ESTE HORÁRIO ESPECÍFICO foi tomado
      if (tipoAlerta === 'intervalo') {
        console.log('   🔎 Verificando intervalo (HORÁRIO FIXO)...');
        
        const jaFoiTomado = tomadoSnapshot.docs.some(doc => {
          const tomadoData = doc.data();
          const match = tomadoData.horarioAgendado === horario;
          console.log(`      Registro: agendado="${tomadoData.horarioAgendado}" vs esperado="${horario}" = ${match}`);
          return match;
        });

        console.log(`   ${jaFoiTomado ? '✅ RESULTADO: JÁ FOI TOMADO' : '❌ RESULTADO: NÃO FOI TOMADO'}`);
        console.log('========== FIM DA VERIFICAÇÃO ==========\n');
        return jaFoiTomado;
      }

      return false;
    } catch (error) {
      console.error('❌ ERRO ao verificar medicamento tomado:', error);
      return false;
    }
  };

  const fetchNextMedication = async () => {
    if (!uid) {
      console.log('Sem UID na busca');
      setLoading(false);
      return;
    }

    try {
      console.log('\n===== BUSCANDO MEDICAMENTOS =====');
      setIsRefreshing(true);
      
      const now = new Date();
      const currentTimeStr = now.toTimeString().slice(0, 5);
      const currentDay = diasSemana[now.getDay()].abrev;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diaStr = today.toISOString().slice(0, 10);

      console.log('📅 Dia:', currentDay, '| ⏰ Hora:', currentTimeStr);
      console.log('📋 Data:', diaStr);

      // BUSCAR TODOS OS ALERTAS
      const todosAlertasSnapshot = await firestore()
        .collection('alertas_dependentes')
        .where('dependenteId', '==', uid)
        .get();

      console.log('📊 Total de alertas:', todosAlertasSnapshot.size);

      let medicamentosDisponiveis = [];

      // PROCESSAR TODOS OS ALERTAS
      for (const doc of todosAlertasSnapshot.docs) {
        const alerta = doc.data();
        
        console.log('\n📋 Processando:', doc.id);
        console.log('   Tipo:', alerta.tipoAlerta);

        // ALERTAS DE HORARIO FIXO
        if (alerta.tipoAlerta === 'dias') {
          console.log('   ⏰ Horario:', alerta.horario);
          console.log('   📅 Dias:', alerta.dias);

          if (!alerta.dias || !Array.isArray(alerta.dias)) {
            console.log('   ❌ Campo dias invalido');
            continue;
          }

          if (!alerta.dias.includes(currentDay)) {
            console.log('   ⏭️ Nao e para hoje');
            continue;
          }

          console.log('   ✅ E para hoje!');

          const jaFoiTomado = await verificarMedicamentoTomado(
            alerta.remedioId,
            alerta.horario,
            diaStr,
            'dias',
            doc.id
          );

          if (jaFoiTomado) {
            console.log('   ✅ Ja foi tomado - IGNORANDO');
            continue;
          }

          console.log('   ⏳ Ainda nao tomado');

          const remedioDoc = await firestore()
            .collection('remedios')
            .doc(alerta.remedioId)
            .get();

          if (!remedioDoc.exists) {
            console.log('   ❌ Remedio nao encontrado');
            continue;
          }

          const remedioData = remedioDoc.data();
          console.log('   💊 Remedio:', remedioData.nome);

          medicamentosDisponiveis.push({
            ...alerta,
            remedioNome: remedioData.nome,
            alertaId: doc.id,
            tipoAlerta: 'dias',
            horarioOrdenacao: alerta.horario
          });
          console.log('   ✅ Adicionado a lista');
        }

        // ALERTAS DE INTERVALO
        else if (alerta.tipoAlerta === 'intervalo') {
          console.log('   ⏱️ Horario inicio:', alerta.horarioInicio);
          console.log('   ⏲️ Intervalo:', alerta.intervaloHoras, 'horas');
          console.log('   🔛 Ativo:', alerta.ativo);

          const estaAtivo = alerta.ativo === true || alerta.ativo === undefined;

          if (!estaAtivo) {
            console.log('   ❌ Alerta desativado');
            continue;
          }

          if (!alerta.horarioInicio || !alerta.intervaloHoras) {
            console.log('   ❌ Dados de intervalo incompletos');
            continue;
          }

          const proximoHorario = calcularProximoIntervalo(alerta, now, diaStr);

          if (!proximoHorario) {
            console.log('   ❌ Sem proximo horario hoje');
            continue;
          }

          console.log('   ⏰ Proximo horario calculado:', proximoHorario);

          const jaFoiTomado = await verificarMedicamentoTomado(
            alerta.remedioId,
            proximoHorario,
            diaStr,
            'intervalo',
            doc.id
          );

          if (jaFoiTomado) {
            console.log('   ✅ Ja foi tomado neste horario - IGNORANDO');
            continue;
          }

          console.log('   ⏳ Ainda nao tomado');

          const remedioDoc = await firestore()
            .collection('remedios')
            .doc(alerta.remedioId)
            .get();

          if (!remedioDoc.exists) {
            console.log('   ❌ Remedio nao encontrado');
            continue;
          }

          const remedioData = remedioDoc.data();
          console.log('   💊 Remedio:', remedioData.nome);

          medicamentosDisponiveis.push({
            ...alerta,
            remedioNome: remedioData.nome,
            alertaId: doc.id,
            horario: proximoHorario,
            tipoAlerta: 'intervalo',
            horarioOrdenacao: proximoHorario
          });
          console.log('   ✅ Adicionado a lista (INTERVALO)');
        }
      }

      console.log('\n📊 MEDICAMENTOS DISPONIVEIS:', medicamentosDisponiveis.length);

      // ORDENAR POR HORARIO MAIS PROXIMO
      if (medicamentosDisponiveis.length > 0) {
        medicamentosDisponiveis.sort((a, b) => {
          return a.horarioOrdenacao.localeCompare(b.horarioOrdenacao);
        });

        const proximoMedicamento = medicamentosDisponiveis[0];
        
        console.log('\n🎯 MEDICAMENTO MAIS PROXIMO:');
        console.log('   💊 Nome:', proximoMedicamento.remedioNome);
        console.log('   ⏰ Horario:', proximoMedicamento.horarioOrdenacao);
        console.log('   📋 Tipo:', proximoMedicamento.tipoAlerta);
        
        setNextMedication(proximoMedicamento);
      } else {
        console.log('\n✅ Nenhum medicamento disponivel');
        setNextMedication(null);
      }

      console.log('===== FIM DA BUSCA =====\n');
      setLoading(false);
      setIsRefreshing(false);

    } catch (error) {
      console.error('❌ ERRO na busca:', error);
      setLoading(false);
      setIsRefreshing(false);
      Alert.alert('Erro', 'Falha ao buscar medicamentos');
    }
  };

  const calcularProximoIntervalo = (alerta, now, diaStr) => {
    try {
      const [horaAtual, minutoAtual] = now.toTimeString().slice(0, 5).split(':').map(Number);
      const minutosAtuais = horaAtual * 60 + minutoAtual;
      const [horaBase, minutoBase] = String(alerta.horarioInicio).split(':').map(Number);
      const minutosBase = horaBase * 60 + (minutoBase || 0);

      console.log('📐 Calculando próximo intervalo:');
      console.log('  Horario base (horarioInicio):', alerta.horarioInicio);
      console.log('  Intervalo (horas):', alerta.intervaloHoras);
      console.log('  Hora atual:', now.toTimeString().slice(0, 5));

      // ⭐ NOVA LÓGICA: O horário base JÁ É o próximo horário
      // Ele é atualizado dinamicamente quando o medicamento é tomado ou passa do prazo

      // Se o horário base ainda não chegou, retornar ele
      if (minutosAtuais < minutosBase) {
        console.log('  ⏰ Próximo horário ainda não chegou:', alerta.horarioInicio);
        return alerta.horarioInicio;
      }

      // Se o horário base já passou, significa que:
      // 1. Ou o medicamento ainda não foi tomado (mostrar ele)
      // 2. Ou está em atraso (será registrado como não tomado)
      console.log('  ⏰ Horário atual já passou do base - mostrar este horário');
      return alerta.horarioInicio;

    } catch (error) {
      console.error('❌ Erro ao calcular intervalo:', error);
      return null;
    }
  };
    
  const checkTimeCorrectness = () => {
    if (!nextMedication) {
      setIsTimeCorrect(false);
      return;
    }

    const now = new Date();
    const currentTimeStr = now.toTimeString().slice(0, 5);
    const [targetHour, targetMinute] = nextMedication.horario.split(':').map(Number);
    const [currentHour, currentMinute] = currentTimeStr.split(':').map(Number);

    const targetTotalMinutes = targetHour * 60 + targetMinute;
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    
    const timeDiff = currentTotalMinutes - targetTotalMinutes;
    // Permite tomar 5 minutos antes até 10 minutos depois
    const canTake = timeDiff >= -5 && timeDiff <= 10;
    
    setIsTimeCorrect(canTake);
  };

  /**
   * ⭐ MODIFICADO: Atualização imediata após marcar como tomado
   * Previne múltiplos registros e atualiza a tela instantaneamente
   */
  const markMedicationTaken = async () => {
    // ⭐ PREVENIR MÚLTIPLOS CLIQUES
    if (!nextMedication || !isTimeCorrect || isRegistering) {
      console.log('❌ Nao pode marcar agora - bloqueado');
      return;
    }

    console.log('\n💾 ========== MARCANDO COMO TOMADO ==========');
    console.log('📋 Medicamento:', nextMedication.remedioNome);
    console.log('⏰ Horário:', nextMedication.horario);
    console.log('📝 Tipo:', nextMedication.tipoAlerta);

    // ⭐ BLOQUEAR IMEDIATAMENTE
    setIsRegistering(true);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diaStr = today.toISOString().slice(0, 10);
      
      const agora = new Date();
      const horarioReal = agora.toTimeString().slice(0, 5);

      const dadosParaSalvar = {
        dia: diaStr,
        dosagem: nextMedication.dosagem,
        horario: horarioReal,
        horarioAgendado: nextMedication.horario,
        remedioId: nextMedication.remedioId,
        remedioNome: nextMedication.remedioNome,
        dependenteId: nextMedication.dependenteId,
        tipoAlerta: nextMedication.tipoAlerta || 'dias',
        alertaId: nextMedication.alertaId,
        status: 'tomado',
        timestamp: firestore.FieldValue.serverTimestamp(),
      };

      if (nextMedication.tipoAlerta === 'intervalo') {
        dadosParaSalvar.intervaloHoras = nextMedication.intervaloHoras;
      }

      console.log('💾 Dados a salvar:', dadosParaSalvar);

      await firestore().collection('medicamentos_tomados_dependentes').add(dadosParaSalvar);

      console.log('✅ SALVO COM SUCESSO NO FIRESTORE!');

      // ⭐ NOVO: Se for INTERVALO, atualizar o próximo horário no alerta
      if (nextMedication.tipoAlerta === 'intervalo') {
        console.log('🔄 É intervalo - atualizando próximo horário...');
        await atualizarProximoHorarioIntervalo(nextMedication, nextMedication.alertaId);
      }

      // ⭐ LIMPAR MEDICAMENTO IMEDIATAMENTE (antes da animação)
      console.log('🔄 Limpando medicamento da tela IMEDIATAMENTE...');
      setNextMedication(null);
      
      // ⭐ MOSTRAR FEEDBACK E BUSCAR PRÓXIMO
      setShowSuccessFeedback(true);
      
      // Animação de sucesso
      Animated.sequence([
        Animated.timing(successAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(successAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccessFeedback(false);
      });

      // ⭐ BUSCAR PRÓXIMO MEDICAMENTO IMEDIATAMENTE
      console.log('🔍 Buscando próximo medicamento AGORA...');
      
      // Pequeno delay para garantir que o Firestore propagou
      setTimeout(async () => {
        await fetchNextMedication();
        setIsRegistering(false);
      }, 800);

      console.log('========== FIM DO REGISTRO ==========\n');

    } catch (error) {
      console.error('❌ ERRO AO SALVAR:', error);
      Alert.alert('Erro', 'Nao foi possivel registrar.');
      setIsRegistering(false);
      
      // ⭐ Restaurar o medicamento em caso de erro
      fetchNextMedication();
    }
  };

  const handleSettingsPress = () => {
    console.log('⚙️ Abrindo configurações');
    
    if (!senhaAdmin) {
      Alert.alert(
        'Senha não configurada',
        'O administrador ainda não configurou uma senha de acesso.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setSenhaDigits(['', '', '', '', '', '']);
    setModalVisible(true);
  };

  const handleDigitChange = (text, index) => {
    const numericText = text.replace(/[^0-9]/g, '');
    
    if (numericText.length > 1) return;
    
    const newDigits = [...senhaDigits];
    newDigits[index] = numericText;
    setSenhaDigits(newDigits);
    
    if (numericText && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    if (index === 5 && numericText) {
      const senhaCompleta = newDigits.join('');
      if (senhaCompleta.length === 6) {
        setTimeout(() => verificarSenha(senhaCompleta), 100);
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !senhaDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verificarSenha = (senhaCompleta) => {
    console.log('🔐 Verificando senha...');
    
    if (senhaCompleta === senhaAdmin) {
      console.log('✅ Senha correta!');
      
      setModalVisible(false);
      setSenhaDigits(['', '', '', '', '', '']);
      
      setTimeout(() => {
        if (navigation && navigation.navigate) {
          navigation.navigate('ConfiguracoesAdmin', {
            adminUid: adminUid,
            dependenteUid: userId
          });
        } else {
          Alert.alert('✅ Acesso Permitido', 'Configure a navegação para ConfiguracoesAdmin');
        }
      }, 300);
      
    } else {
      console.log('❌ Senha incorreta!');
      
      setSenhaDigits(['', '', '', '', '', '']);
      
      Alert.alert(
        '❌ Senha Incorreta',
        'Tente novamente.',
        [
          {
            text: 'OK',
            onPress: () => {
              setTimeout(() => {
                inputRefs.current[0]?.focus();
              }, 100);
            }
          }
        ]
      );
    }
  };

  const handleManualVerify = () => {
    const senhaCompleta = senhaDigits.join('');
    
    if (senhaCompleta.length !== 6) {
      Alert.alert('Aviso', 'Digite todos os 6 dígitos da senha');
      return;
    }
    
    verificarSenha(senhaCompleta);
  };

  const fecharModal = () => {
    setModalVisible(false);
    setSenhaDigits(['', '', '', '', '', '']);
  };

  const getTimeUntilNext = () => {
    if (!nextMedication) return '';
    
    const now = new Date();
    const [hour, minute] = nextMedication.horario.split(':').map(Number);
    const nextTime = new Date();
    nextTime.setHours(hour, minute, 0, 0);
    
    if (nextTime <= now) {
      nextTime.setDate(nextTime.getDate() + 1);
    }
    
    const diff = nextTime - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `Faltam ${hours}h ${minutes}min`;
    } else {
      return `Faltam ${minutes} minutos`;
    }
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={fecharModal}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={fecharModal}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalContent}>
            <Icon name="lock-closed" size={60} color="#3B82F6" />
            <Text style={styles.modalTitle}>Senha de Administrador</Text>
            <Text style={styles.modalSubtitle}>
              Digite os 6 dígitos da senha
            </Text>
            
            <View style={styles.digitContainer}>
              {senhaDigits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.digitInput,
                    digit !== '' && styles.digitInputFilled
                  ]}
                  value={digit}
                  onChangeText={(text) => handleDigitChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  secureTextEntry
                  selectTextOnFocus
                />
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={fecharModal}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleManualVerify}
              >
                <Text style={styles.modalConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  console.log('🎨 RENDERIZANDO | loading:', loading, '| nextMed:', !!nextMedication);

  // TELA DE LOADING
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        
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

        <View style={[styles.decorativeCircle, styles.decorCircle1]} />
        <View style={[styles.decorativeCircle, styles.decorCircle2]} />
        <View style={[styles.decorativeCircle, styles.decorCircle3]} />
        
        <TouchableOpacity style={styles.settingsButton} onPress={handleSettingsPress}>
          <Icon name="settings-outline" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.loadingContainer}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Icon name="hourglass-outline" size={80} color="#3B82F6" />
          </Animated.View>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>

        {renderModal()}
      </View>
    );
  }

  // TELA DE SUCESSO (sem medicamentos)
  if (!nextMedication) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        
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

        <View style={[styles.decorativeCircle, styles.decorCircle1]} />
        <View style={[styles.decorativeCircle, styles.decorCircle2]} />
        <View style={[styles.decorativeCircle, styles.decorCircle3]} />
        
        <TouchableOpacity style={styles.settingsButton} onPress={handleSettingsPress}>
          <Icon name="settings-outline" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <Animated.View style={[styles.successContainer, { opacity: fadeAnim }]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Icon name="checkmark-circle" size={120} color="#10B981" />
          </Animated.View>
          <Text style={styles.successTitle}>Tudo certo!</Text>
          <Text style={styles.successSubtitle}>
            Todos os medicamentos{'\n'}de hoje foram tomados
          </Text>
        </Animated.View>

        {renderModal()}
      </View>
    );
  }

  // TELA PRINCIPAL COM MEDICAMENTO
  const isIntervalo = nextMedication?.tipoAlerta === 'intervalo';
  const corPrincipal = isIntervalo ? '#6366F1' : '#10B981';
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <Animated.View
        style={[
          styles.backgroundCircle,
          isIntervalo && { backgroundColor: '#6366F1' },
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
          isIntervalo && { backgroundColor: '#6366F1' },
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

      <View style={[
        styles.decorativeCircle, 
        styles.decorCircle1,
        isIntervalo && styles.decorCirclePurple
      ]} />
      <View style={[
        styles.decorativeCircle, 
        styles.decorCircle2,
        isIntervalo && styles.decorCirclePurple
      ]} />
      <View style={[
        styles.decorativeCircle, 
        styles.decorCircle3,
        isIntervalo && styles.decorCirclePurple
      ]} />
      
      <TouchableOpacity style={styles.settingsButton} onPress={handleSettingsPress}>
        <Icon name="settings-outline" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        
        {isIntervalo && (
          <Animated.View
            style={[
              styles.intervalBadge,
              { transform: [{ rotate }] }
            ]}
          >
            <Icon name="timer-outline" size={20} color="#6366F1" />
          </Animated.View>
        )}

        {isIntervalo && (
          <View style={styles.intervalTextContainer}>
            <Text style={styles.intervalText}>
              A cada {nextMedication.intervaloHoras}h
            </Text>
          </View>
        )}

        <View style={styles.topTimeContainer}>
          <Icon name="time-outline" size={24} color="#F59E0B" />
          <Text style={styles.topTimeText}>{getTimeUntilNext()}</Text>
        </View>

        {/* Feedback de sucesso */}
        {showSuccessFeedback && (
          <Animated.View
            style={[
              styles.successFeedback,
              {
                opacity: successAnim,
                transform: [
                  {
                    scale: successAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Icon name="checkmark-circle" size={40} color="#10B981" />
            <Text style={styles.successFeedbackText}>Registrado!</Text>
          </Animated.View>
        )}

        {/* Indicador de refresh */}
        {isRefreshing && !showSuccessFeedback && (
          <View style={styles.refreshIndicator}>
            <Animated.View style={{ transform: [{ rotate }] }}>
              <Icon name="reload-outline" size={24} color="#3B82F6" />
            </Animated.View>
            <Text style={styles.refreshText}>Atualizando...</Text>
          </View>
        )}

        <Animated.View style={{ transform: [{ scale: glowAnim }] }}>
          <Animated.View
            style={[
              styles.iconCircle,
              isIntervalo && styles.iconCirclePurple,
              !isTimeCorrect && styles.iconCircleDisabled,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <Icon 
              name="medical-outline" 
              size={70} 
              color={!isTimeCorrect ? "#94a3b8" : (isIntervalo ? "#6366F1" : "#10B981")} 
            />
          </Animated.View>
        </Animated.View>

        <Text style={styles.medicationName}>{nextMedication.remedioNome}</Text>

        <View style={[
          styles.doseContainer,
          !isTimeCorrect && styles.doseContainerDisabled
        ]}>
          <Icon 
            name="fitness-outline" 
            size={20} 
            color={!isTimeCorrect ? "#94a3b8" : (isIntervalo ? "#6366F1" : "#10B981")} 
          />
          <Text style={styles.dosage}>{nextMedication.dosagem}</Text>
        </View>

        <View style={[
          styles.timeContainer,
          isIntervalo && styles.timeContainerPurple,
          !isTimeCorrect && styles.timeContainerDisabled
        ]}>
          <Icon 
            name="time-outline" 
            size={24} 
            color={!isTimeCorrect ? "#94a3b8" : (isIntervalo ? "#6366F1" : "#10B981")} 
          />
          <Text style={styles.time}>
            {isIntervalo ? `Próximo: ${nextMedication.horario}` : nextMedication.horario}
          </Text>
        </View>

        <Animated.View
          style={{ 
            transform: [{ scale: isTimeCorrect ? pulseAnim : 1 }], 
            width: '100%' 
          }}
        >
          <TouchableOpacity
            style={[
              styles.button,
              isIntervalo && styles.buttonPurple,
              (!isTimeCorrect || isRegistering) && styles.buttonDisabled
            ]}
            onPress={markMedicationTaken}
            activeOpacity={(isTimeCorrect && !isRegistering) ? 0.9 : 1}
            disabled={!isTimeCorrect || isRegistering}
          >
            <View style={styles.buttonContent}>
              {isRegistering ? (
                <>
                  <Animated.View style={{ transform: [{ rotate }] }}>
                    <Icon name="reload-outline" size={28} color="#FFFFFF" />
                  </Animated.View>
                  <Text style={styles.buttonText}>SALVANDO...</Text>
                </>
              ) : (
                <>
                  <Icon 
                    name={isTimeCorrect ? "checkmark-circle" : "lock-closed"} 
                    size={28} 
                    color={isTimeCorrect ? "#FFFFFF" : "#64748b"} 
                  />
                  <Text style={[
                    styles.buttonText,
                    !isTimeCorrect && styles.buttonTextDisabled
                  ]}>
                    {isTimeCorrect ? "TOMEI" : "AGUARDE"}
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.indicators}>
          <Animated.View
            style={[
              styles.indicator,
              {
                opacity: pulseAnim,
                backgroundColor: !isTimeCorrect ? '#64748b' : corPrincipal,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.indicator,
              {
                opacity: pulseAnim,
                backgroundColor: !isTimeCorrect ? '#64748b' : corPrincipal,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.indicator,
              {
                opacity: pulseAnim,
                backgroundColor: !isTimeCorrect ? '#64748b' : corPrincipal,
              },
            ]}
          />
        </View>

        {!isTimeCorrect && (
          <View style={styles.instructionContainer}>
            <Icon name="information-circle-outline" size={24} color="#F59E0B" />
            <Text style={styles.instructionText}>
              Volte no horário certo{'\n'}para marcar como tomado
            </Text>
          </View>
        )}
      </Animated.View>

      {renderModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    position: 'relative',
  },
  backgroundCircle: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    borderRadius: width,
    backgroundColor: '#3B82F6',
    top: -width * 0.8,
    left: -width * 0.5,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: '#3B82F6',
    bottom: -width * 0.6,
    right: -width * 0.4,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 100,
    zIndex: 1,
  },
  decorCircle1: {
    top: height * 0.15,
    right: width * 0.1,
    width: 80,
    height: 80,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  decorCircle2: {
    bottom: height * 0.2,
    left: width * 0.05,
    width: 60,
    height: 60,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  decorCircle3: {
    top: height * 0.35,
    left: width * 0.1,
    width: 50,
    height: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  decorCirclePurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  settingsButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 24,
  },
  loadingText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  successTitle: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 20,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 30,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    zIndex: 10,
  },
  topTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginBottom: 24,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  topTimeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F59E0B',
    marginLeft: 12,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  iconCircleDisabled: {
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderColor: 'rgba(148, 163, 184, 0.2)',
    shadowColor: '#64748b',
    shadowOpacity: 0.2,
  },
  iconCirclePurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    shadowColor: '#6366F1',
  },
  intervalBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 12,
  },
  intervalTextContainer: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    marginBottom: 16,
  },
  intervalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#A5B4FC',
    letterSpacing: 0.5,
  },
  medicationName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  doseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  doseContainerDisabled: {
    backgroundColor: 'rgba(148, 163, 184, 0.05)',
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  dosage: {
    fontSize: 20,
    fontWeight: '600',
    color: '#D1D5DB',
    marginLeft: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  timeContainerDisabled: {
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderColor: 'rgba(148, 163, 184, 0.15)',
    shadowColor: '#64748b',
    shadowOpacity: 0.1,
  },
  timeContainerPurple: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: 'rgba(99, 102, 241, 0.25)',
    shadowColor: '#6366F1',
  },
  time: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    marginLeft: 12,
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 20,
    paddingHorizontal: 50,
    borderRadius: 25,
    width: '100%',
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15
  },
  buttonDisabled: {
    backgroundColor: '#1e293b',
    shadowColor: '#64748b',
    shadowOpacity: 0.2,
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  buttonPurple: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginLeft: 12,
  },
  buttonTextDisabled: {
    color: '#64748b',
  },
  indicators: {
    flexDirection: 'row',
    marginTop: 20,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    marginTop: 16,
  },
  instructionText: {
    fontSize: 16,
    color: '#F59E0B',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  successFeedback: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  successFeedbackText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refreshIndicator: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  refreshText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 25,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 20,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 10,
  },
  digitContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 20,
  },
  digitInput: {
    width: 50,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  digitInputFilled: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 10,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalCancelText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 16,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default NextMedicationScreen;