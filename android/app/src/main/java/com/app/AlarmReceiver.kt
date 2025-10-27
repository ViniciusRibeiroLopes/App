package com.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val title = intent.getStringExtra("title") ?: "Hora do Remédio"
        val message = intent.getStringExtra("message") ?: "Clique para confirmar"

        val serviceIntent = Intent(context, PersistentForegroundService::class.java).apply {
            putExtra("title", title)
            putExtra("message", message)
        }

        // Inicia o serviço em primeiro plano
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }
}