package com.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class PersistentForegroundService : Service() {
  companion object {
    const val CHANNEL_ID = "pillcheck_persistent_channel"
    const val NOTIF_ID = 4123
    const val ACTION_CONFIRM = "com.app.ACTION_CONFIRM"
    const val ACTION_START = "com.app.ACTION_START"
    const val ACTION_STOP = "com.app.ACTION_STOP"
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val action = intent?.action

    if (action == ACTION_CONFIRM || action == ACTION_STOP) {
      // Emit broadcast to inform JS that user confirmou
      val b = Intent("com.app.PERSISTENT_NOTIFICATION_CONFIRMED")
      sendBroadcast(b)

      stopForeground(true)
      stopSelf()
      return START_NOT_STICKY
    }

    // Normal start -> build an ongoing notification
    val title = intent?.getStringExtra("title") ?: "PillCheck"
    val message = intent?.getStringExtra("message") ?: "Lembrete"

    val confirmIntent = Intent(this, PersistentForegroundService::class.java)
    confirmIntent.setAction(ACTION_CONFIRM)


    val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
    } else {
      android.app.PendingIntent.FLAG_UPDATE_CURRENT
    }

    val confirmPending = android.app.PendingIntent.getService(
      this,
      0,
      confirmIntent,
      pendingFlags
    )

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(message)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setOngoing(true) // mantém a notificação persistente
      .setAutoCancel(false) // não pode ser removida deslizando
      .addAction(android.R.drawable.ic_menu_agenda, "TOMEI", confirmPending)

    startForeground(NOTIF_ID, builder.build())

    // Keep running until explicitly stopped by user (via action) or app
    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? {
    return null
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val name = "PillCheck Persistent"
      val descriptionText = "Canal para notificações persistentes de alarmes"
      val importance = NotificationManager.IMPORTANCE_HIGH
      val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
        description = descriptionText
        setSound(null, null)
      }
      val notificationManager: NotificationManager = getSystemService(NotificationManager::class.java)
      notificationManager.createNotificationChannel(channel)
    }
  }
}
