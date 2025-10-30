package com.app; // ALTERE para o package do seu app

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * BroadcastReceiver para capturar a ação de confirmação da notificação
 * Este receiver é acionado quando o usuário toca no botão da notificação
 */
public class MedicationConfirmReceiver extends BroadcastReceiver {
    
    private static final String TAG = "MedicationConfirm";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        
        String action = intent.getAction();
        
        if (MedicationForegroundService.ACTION_CONFIRM.equals(action)) {
            Log.d(TAG, "✅ Usuário confirmou medicamento");
            
            // Extrair dados
            String medicationName = intent.getStringExtra(MedicationForegroundService.EXTRA_MEDICATION_NAME);
            String dosage = intent.getStringExtra(MedicationForegroundService.EXTRA_DOSAGE);
            String time = intent.getStringExtra(MedicationForegroundService.EXTRA_TIME);
            String medicationId = intent.getStringExtra(MedicationForegroundService.EXTRA_MEDICATION_ID);
            String alarmType = intent.getStringExtra(MedicationForegroundService.EXTRA_ALARM_TYPE);
            String intervalHours = intent.getStringExtra(MedicationForegroundService.EXTRA_INTERVAL_HOURS);
            
            // Enviar dados para o módulo React Native
            sendToReactNative(context, medicationName, dosage, time, medicationId, alarmType, intervalHours);
            
            // Parar o serviço em foreground (remove a notificação)
            Intent stopServiceIntent = new Intent(context, MedicationForegroundService.class);
            stopServiceIntent.setAction(MedicationForegroundService.ACTION_STOP_SERVICE);
            context.stopService(stopServiceIntent);
            
            Log.d(TAG, "✅ Serviço parado e notificação removida");
        }
    }
    
    /**
     * Envia os dados para o React Native através do MedicationModule
     */
    private void sendToReactNative(Context context, String medicationName, String dosage, 
                                   String time, String medicationId, String alarmType, String intervalHours) {
        try {
            // Criar intent para o módulo nativo
            Intent reactIntent = new Intent("MEDICATION_CONFIRMED");
            reactIntent.putExtra("medicationName", medicationName);
            reactIntent.putExtra("dosage", dosage);
            reactIntent.putExtra("time", time);
            reactIntent.putExtra("medicationId", medicationId);
            reactIntent.putExtra("alarmType", alarmType);
            reactIntent.putExtra("intervalHours", intervalHours);
            
            context.sendBroadcast(reactIntent);
            
            Log.d(TAG, "📤 Dados enviados para React Native");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao enviar para React Native: " + e.getMessage());
        }
    }
}