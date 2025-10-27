package com.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class PersistentNotificationModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

    override fun getName() = "PersistentNotification"

    private fun getAlarmManager() = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    // Função auxiliar para criar intents para o AlarmReceiver
    private fun createAlarmIntent(id: Int): Intent {
        return Intent(context, AlarmReceiver::class.java)
    }

    // Função auxiliar para criar PendingIntents (necessários para o AlarmManager)
    private fun createPendingIntent(id: Int, intent: Intent, flags: Int): PendingIntent {
        val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags or PendingIntent.FLAG_IMMUTABLE
        } else {
            flags
        }
        return PendingIntent.getBroadcast(context, id, intent, pendingIntentFlags)
    }

    // Método JS existente
    @ReactMethod
    fun startService(title: String, message: String) {
        val serviceIntent = Intent(context, PersistentForegroundService::class.java).apply {
            putExtra("title", title)
            putExtra("message", message)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }

    // Método JS existente
    @ReactMethod
    fun stopService() {
        val serviceIntent = Intent(context, PersistentForegroundService::class.java)
        context.stopService(serviceIntent)
    }

    // --- NOVO MÉTODO PARA AGENDAR ---
    @ReactMethod
    fun schedulePersistentNotification(id: Int, timeInMillis: Double, title: String, message: String) {
        val alarmTime = timeInMillis.toLong()
        val intent = createAlarmIntent(id).apply {
            putExtra("title", title)
            putExtra("message", message)
        }
        
        val pendingIntent = createPendingIntent(id, intent, PendingIntent.FLAG_UPDATE_CURRENT)
        val alarmManager = getAlarmManager()

        // Tenta usar a permissão de alarme exato se disponível
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarmTime, pendingIntent)
            } else {
                // Se não pode, agenda um alarme "próximo"
                // O ideal é pedir a permissão SCHEDULE_EXACT_ALARM ao usuário
                alarmManager.setWindow(AlarmManager.RTC_WAKEUP, alarmTime, 60000, pendingIntent)
            }
        } else {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarmTime, pendingIntent)
        }
    }

    // --- NOVO MÉTODO PARA CANCELAR ---
    @ReactMethod
    fun cancelPersistentNotification(id: Int) {
        val intent = createAlarmIntent(id)
        // Procura por um PendingIntent existente sem criá-lo
        val pendingIntent = createPendingIntent(id, intent, PendingIntent.FLAG_NO_CREATE)
        
        if (pendingIntent != null) {
            val alarmManager = getAlarmManager()
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
        }
    }
}