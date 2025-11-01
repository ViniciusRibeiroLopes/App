package com.app; // ALTERE para o package do seu app

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import androidx.annotation.Nullable;

/**
 * Serviço em Foreground para criar notificação ABSOLUTAMENTE não descartável
 * Este serviço garante que a notificação não pode ser removida pelo usuário
 */
public class MedicationForegroundService extends Service {
    
    private static final String CHANNEL_ID = "medication_alarm_channel";
    private static final int NOTIFICATION_ID = 1001;
    
    // Actions para os botões da notificação
    public static final String ACTION_CONFIRM = "com.app.CONFIRM_MEDICATION";
    public static final String ACTION_STOP_SERVICE = "com.app.STOP_SERVICE";
    
    // Extras
    public static final String EXTRA_MEDICATION_NAME = "medication_name";
    public static final String EXTRA_DOSAGE = "dosage";
    public static final String EXTRA_TIME = "time";
    public static final String EXTRA_MEDICATION_ID = "medication_id";
    public static final String EXTRA_ALARM_TYPE = "alarm_type";
    public static final String EXTRA_INTERVAL_HOURS = "interval_hours";
    
    private String medicationName = "";
    private String dosage = "";
    private String time = "";
    private String medicationId = "";
    private String alarmType = "";
    private String intervalHours = "";
    
    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            
            if (ACTION_STOP_SERVICE.equals(action)) {
                // Parar o serviço quando confirmado
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            }
            
            // Extrair dados do medicamento
            medicationName = intent.getStringExtra(EXTRA_MEDICATION_NAME);
            dosage = intent.getStringExtra(EXTRA_DOSAGE);
            time = intent.getStringExtra(EXTRA_TIME);
            medicationId = intent.getStringExtra(EXTRA_MEDICATION_ID);
            alarmType = intent.getStringExtra(EXTRA_ALARM_TYPE);
            intervalHours = intent.getStringExtra(EXTRA_INTERVAL_HOURS);
            
            if (medicationName == null) medicationName = "Medicamento";
            if (dosage == null) dosage = "";
            if (time == null) time = "";
        }
        
        // Criar e exibir notificação em foreground
        Notification notification = createNotification();
        startForeground(NOTIFICATION_ID, notification);
        
        return START_STICKY; // Reinicia o serviço se for morto pelo sistema
    }
    
    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    /**
     * Cria o canal de notificação (Android 8.0+)
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Alarmes de Medicação",
                NotificationManager.IMPORTANCE_HIGH
            );
            
            channel.setDescription("Notificações persistentes de medicamentos");
            channel.enableVibration(true);
            channel.enableLights(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.setBypassDnd(true);
            channel.setSound(
                android.provider.Settings.System.DEFAULT_NOTIFICATION_URI,
                new android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            );
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    /**
     * Cria a notificação persistente e não descartável
     */
    private Notification createNotification() {
        // Intent para abrir o app ao tocar na notificação
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        notificationIntent.putExtra(EXTRA_MEDICATION_ID, medicationId);
        notificationIntent.putExtra(EXTRA_ALARM_TYPE, alarmType);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            notificationIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Intent para o botão de confirmação
        Intent confirmIntent = new Intent(this, MedicationConfirmReceiver.class);
        confirmIntent.setAction(ACTION_CONFIRM);
        confirmIntent.putExtra(EXTRA_MEDICATION_NAME, medicationName);
        confirmIntent.putExtra(EXTRA_DOSAGE, dosage);
        confirmIntent.putExtra(EXTRA_TIME, time);
        confirmIntent.putExtra(EXTRA_MEDICATION_ID, medicationId);
        confirmIntent.putExtra(EXTRA_ALARM_TYPE, alarmType);
        confirmIntent.putExtra(EXTRA_INTERVAL_HOURS, intervalHours);
        
        PendingIntent confirmPendingIntent = PendingIntent.getBroadcast(
            this, 
            0, 
            confirmIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Construir o texto da notificação
        String contentText = dosage;
        if (alarmType != null && alarmType.equals("intervalo") && intervalHours != null) {
            contentText += " (A cada " + intervalHours + "h)";
        }
        if (time != null && !time.isEmpty()) {
            contentText += " - " + time;
        }
        
        // Construir a notificação
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("💊 Hora de tomar seu medicamento")
            .setContentText(medicationName)
            .setStyle(new NotificationCompat.BigTextStyle()
                .bigText(medicationName + "\n" + contentText))
            .setSmallIcon(R.drawable.icon)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(pendingIntent)
            .setAutoCancel(false)
            .setOngoing(true)
            .setOnlyAlertOnce(false)
            .setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI)
            .setVibrate(new long[]{0, 500, 250, 500})
            .addAction(
                android.R.drawable.ic_input_add,
                "✅ Tomei o medicamento",
                confirmPendingIntent
            );
        
        // Configurações adicionais para Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setChannelId(CHANNEL_ID);
        }
        
        return builder.build();
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
    }
}