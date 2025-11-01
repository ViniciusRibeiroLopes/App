package com.app

import android.os.Build // <-- IMPORTAR
import android.os.Bundle
import android.view.WindowManager // <-- IMPORTAR
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "App"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * Called when the activity is starting.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    try {
      // super.onCreate() deve ser chamado antes de modificar a janela
      super.onCreate(savedInstanceState)

      // ✅ INÍCIO: Código Kotlin equivalente para showWhenLocked e turnScreenOn
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        // Para Android 8.1 (API 27) e mais recentes
        setShowWhenLocked(true)
        setTurnScreenOn(true)
        // Você também pode querer dispensar a tela de bloqueio (opcional)
        // (requer: import android.app.KeyguardManager e android.content.Context)
        // val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        // keyguardManager.requestDismissKeyguard(this, null)
      } else {
        // Para versões mais antigas do Android (antes da API 27)
        @Suppress("DEPRECATION")
        window.addFlags(
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )
      }
      // ✅ FIM: Código adicionado

    } catch (e: Exception) {
      android.util.Log.e("MainActivity", "Error in onCreate", e)
      throw e
    }
  }

  /**
   * Called when the activity is destroyed.
   */
  override fun onDestroy() {
    try {
      super.onDestroy()
    } catch (e: Exception) {
      android.util.Log.e("MainActivity", "Error in onDestroy", e)
    }
  }
}