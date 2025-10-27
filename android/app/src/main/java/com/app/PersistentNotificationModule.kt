package com.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.ContextWrapper
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Callback
import com.facebook.react.modules.core.DeviceEventManagerModule

class PersistentNotificationModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  private val receiver: BroadcastReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action == "com.app.PERSISTENT_NOTIFICATION_CONFIRMED") {
        // Emit event to JS
        sendEvent("PersistentNotificationConfirmed", null)
      }
    }
  }

  init {
    val filter = IntentFilter()
    filter.addAction("com.app.PERSISTENT_NOTIFICATION_CONFIRMED")

    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
        reactContext.registerReceiver(
            receiver,
            filter,
            Context.RECEIVER_NOT_EXPORTED
        )
    } else {
        reactContext.registerReceiver(receiver, filter)
    }
  }

  override fun getName(): String {
    return "PersistentNotification"
  }

  @ReactMethod
  fun start(title: String?, message: String?) {
    val intent = Intent(reactContext, PersistentForegroundService::class.java).apply {
      action = PersistentForegroundService.ACTION_START
      putExtra("title", title)
      putExtra("message", message)
    }
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      reactContext.startForegroundService(intent)
    } else {
      reactContext.startService(intent)
    }
  }

  @ReactMethod
  fun stop() {
    val intent = Intent(reactContext, PersistentForegroundService::class.java).apply {
      action = PersistentForegroundService.ACTION_STOP
    }
    reactContext.startService(intent)
  }

  private fun sendEvent(eventName: String, params: Any?) {
    reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }

  override fun onCatalystInstanceDestroy() {
    try {
      reactContext.unregisterReceiver(receiver)
    } catch (e: Exception) {
      // ignore
    }
    super.onCatalystInstanceDestroy()
  }
}
