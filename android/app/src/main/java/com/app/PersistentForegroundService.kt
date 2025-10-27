package com.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class PersistentForegroundService : Service() {

    private val CHANNEL_ID = "persistent_notification_channel"
    private val NOTIFICATION_ID = 1
    
    // Ação customizada para o botão de confirmação
    private val ACTION_STOP_SERVICE = "com.app.action.STOP_SERVICE"

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        
        // Verifica se o intent veio do botão "Confirmar"
        if (intent?.action == ACTION_STOP_SERVICE) {
            stopSelf() // Para o serviço (e a notificação)
            return START_NOT_STICKY
        }

        val title = intent?.getStringExtra("title") ?: "Hora do Remédio"
        val message = intent?.getStringExtra("message") ?: "Confirme que tomou o medicamento"

        // Intent para abrir o App ao clicar na notificação (corpo)
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        )

        // --- Intent para o botão "Confirmar" ---
        val stopServiceIntent = Intent(this, PersistentForegroundService::class.java).apply {
            action = ACTION_STOP_SERVICE
        }
        val stopServicePendingIntent = PendingIntent.getService(
            this,
            // Usamos um requestCode diferente (1) para o botão
            1, 
            stopServiceIntent,
            // FLAG_CANCEL_CURRENT garante que o intent é novo e FLAG_IMMUTABLE é necessário
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_CANCEL_CURRENT else PendingIntent.FLAG_CANCEL_CURRENT
        )
        // --- Fim do Intent do botão ---

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(R.drawable.icon) // Use o ícone do app
            .setContentIntent(pendingIntent)
            .setOngoing(true) // <-- ISSO TORNA NÃO REMOVÍVEL
            .setAutoCancel(false) // Não cancela ao clicar no corpo
            .setPriority(NotificationCompat.PRIORITY_HIGH) // Garante que apareça
            .setCategory(NotificationCompat.CATEGORY_ALARM) // Categoria de Alarme
            // --- ADICIONA O BOTÃO DE AÇÃO ---
            .addAction(
                R.drawable.icon, // Ícone do botão (idealmente um "check")
                "Confirmar",     // Texto do botão
                stopServicePendingIntent // Ação ao clicar
            )
            .build()

        startForeground(NOTIFICATION_ID, notification)

        return START_STICKY // Tenta recriar o serviço se for morto
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Alarmes de Medicamento", // Nome do canal mais claro
                NotificationManager.IMPORTANCE_HIGH // IMPORTANCE_HIGH para alarmes
            ).apply {
                description = "Notificações persistentes para alarmes de remédio"
                enableLights(true)
                lightColor = Color.RED
                enableVibration(true)
            }
            
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }
}