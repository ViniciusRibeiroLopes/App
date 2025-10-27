import {NativeModules} from 'react-native';

const {PersistentNotification} = NativeModules;

// Função existente
export const showPersistentNotification = (title, message) => {
  if (PersistentNotification && PersistentNotification.startService) {
    PersistentNotification.startService(title, message);
  } else {
    console.error('PersistentNotification.startService is not available');
  }
};

// Função existente
export const hidePersistentNotification = () => {
  if (PersistentNotification && PersistentNotification.stopService) {
    PersistentNotification.stopService();
  } else {
    console.error('PersistentNotification.stopService is not available');
  }
};

// --- NOVAS FUNÇÕES EXPOSTAS ---

/**
 * Agenda uma notificação persistente futura.
 * @param {number} id - ID inteiro único para o alarme
 * @param {number} timeInMillis - Data/hora em milissegundos (Date.getTime())
 * @param {string} title - Título da notificação
 * @param {string} message - Mensagem da notificação
 */
export const schedulePersistentNotification = (
  id,
  timeInMillis,
  title,
  message,
) => {
  if (
    PersistentNotification &&
    PersistentNotification.schedulePersistentNotification
  ) {
    PersistentNotification.schedulePersistentNotification(
      id,
      timeInMillis,
      title,
      message,
    );
  } else {
    console.error(
      'PersistentNotification.schedulePersistentNotification is not available',
    );
  }
};

/**
 * Cancela uma notificação persistente agendada.
 * @param {number} id - ID inteiro único do alarme a ser cancelado
 */
export const cancelPersistentNotification = id => {
  if (
    PersistentNotification &&
    PersistentNotification.cancelPersistentNotification
  ) {
    PersistentNotification.cancelPersistentNotification(id);
  } else {
    console.error(
      'PersistentNotification.cancelPersistentNotification is not available',
    );
  }
};

export default {
  showPersistentNotification,
  hidePersistentNotification,
  schedulePersistentNotification,
  cancelPersistentNotification,
};
