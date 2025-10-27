import notifee, {
  AndroidImportance,
  AndroidCategory,
  EventType,
} from '@notifee/react-native';

/**
 * Exibe uma notificação persistente de lembrete de medicação
 * com som alto e botão de confirmação.
 * @param {string} id - ID do medicamento ou lembrete
 * @param {string} title - Título da notificação
 * @param {string} body - Corpo da notificação
 */
export async function showMedicationNotification(id, title, body) {
  console.log('📱 Attempting to show medication notification:', { id, title, body });
  
  try {
    // Cria (ou recria) o canal com som de alarme
    console.log('🔔 Creating notification channel...');
    const channelId = await notifee.createChannel({
      id: 'alarm-channel',
      name: 'Alarmes de Medicação',
      sound: 'remedio', // ou 'remedio' se quiser som personalizado
      importance: AndroidImportance.HIGH,
      vibration: true,
      lights: true,
    });
    console.log('✅ Notification channel created successfully:', channelId);

    // Mostra a notificação
    console.log('📬 Attempting to display notification...');
    await notifee.displayNotification({
    id,
    title,
    body,
    android: {
      channelId,
      smallIcon: 'ic_launcher', // ícone do app
      category: AndroidCategory.ALARM, // indica ao Android que é um alarme
      ongoing: true, // impede o usuário de deslizar para fechar
      autoCancel: false, // não some automaticamente
      fullScreenAction: {id: 'default'}, // aparece sobre a tela se o app estiver fechado
      sound: 'default', // som de alarme
      alarm: true, // toca mesmo no modo silencioso
      importance: AndroidImportance.HIGH,
      pressAction: {
        id: 'default',
      },
      actions: [
        {
          title: '✅ Tomei o medicamento',
          pressAction: {
            id: 'confirm', // ID usado no listener para marcar como "tomado"
          },
        },
      ],
    },
    data: {id},
  });
  console.log('✅ Notification displayed successfully');
  } catch (error) {
    console.error('❌ Error displaying notification:', error);
  }
}

/**
 * Registra handlers para eventos de ação das notificações de medicação.
 * Quando o usuário pressiona a ação com pressAction.id === 'confirm',
 * o callback é chamado com o id do medicamento (notification.data.id).
 * Retorna uma função para remover os listeners de foreground (se possível).
 * @param {(medId: string) => void|Promise<void>} callback
 * @returns {() => void} unsubscribe
 */
export function registerMedicationHandler(callback) {
  console.log('🎯 Registering medication notification handlers...');
  
  // Listener em foreground — pode ser desregistrado
  const unsubscribeForeground = notifee.onForegroundEvent(({type, detail}) => {
    console.log('📱 Foreground event received:', { type, detail });
    try {
      if (type === EventType.ACTION_PRESS) {
        console.log('👆 Action press detected');
        const {pressAction, notification} = detail;
        if (pressAction && pressAction.id === 'confirm') {
          console.log('✅ Confirm action pressed');
          const medId = notification?.data?.id;
          console.log('💊 Medication ID:', medId);
          if (medId) {
            console.log('🎯 Executing medication callback...');
            // chamar o callback (suporta Promise)
            Promise.resolve(callback(medId)).catch(err => {
              console.error('❌ Error in confirm callback:', err);
            });
          }
        }
      }
    } catch (err) {
      console.error('❌ Error in foreground handler:', err);
    }
  });

  // Listener em background — não pode ser removido pela API JS em alguns casos
  // mas é importante lidar com o evento headless também.
  try {
    console.log('🌙 Setting up background event handler...');
    notifee.onBackgroundEvent(async ({type, detail}) => {
      console.log('🌙 Background event received:', { type, detail });
      try {
        if (type === EventType.ACTION_PRESS) {
          console.log('👆 Background action press detected');
          const {pressAction, notification} = detail;
          if (pressAction && pressAction.id === 'confirm') {
            console.log('✅ Background confirm action pressed');
            const medId = notification?.data?.id;
            console.log('💊 Background medication ID:', medId);
            if (medId) {
              console.log('🎯 Executing background medication callback...');
              await callback(medId);
              console.log('✅ Background callback executed successfully');
            }
          }
        }
      } catch (err) {
        console.error('❌ Error in background handler:', err);
      }
    });
  } catch (err) {
    // onBackgroundEvent pode lançar em alguns ambientes; capturamos para evitar crash
    console.error('❌ Failed to register background event handler:', err);
  }

  // Retorna função de unsubscribe para o listener de foreground.
  return () => {
    try {
      if (typeof unsubscribeForeground === 'function') {
        unsubscribeForeground();
      }
    } catch (err) {
      console.warn('Erro ao desregistrar foreground handler:', err);
    }
    // background handler geralmente não é removível via JS — nada a fazer
  };
}
