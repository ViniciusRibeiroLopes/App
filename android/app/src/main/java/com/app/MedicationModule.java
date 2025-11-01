package com.app; // ALTERE para o package do seu app

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import androidx.annotation.NonNull;

/**
 * Módulo React Native para controlar o serviço de foreground
 * Permite iniciar/parar o serviço e receber eventos de confirmação
 */
public class MedicationModule extends ReactContextBaseJavaModule {
    
    private static final String TAG = "MedicationModule";
    private final ReactApplicationContext reactContext;
    private BroadcastReceiver medicationReceiver;
    
    public MedicationModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        registerReceiver();
    }
    
    @NonNull
    @Override
    public String getName() {
        return "MedicationModule";
    }
    
    /**
     * Registra o receiver para capturar eventos de confirmação
     */
    private void registerReceiver() {
        medicationReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("MEDICATION_CONFIRMED".equals(intent.getAction())) {
                    Log.d(TAG, "📥 Recebido evento de confirmação");
                    
                    WritableMap params = Arguments.createMap();
                    params.putString("medicationName", intent.getStringExtra("medicationName"));
                    params.putString("dosage", intent.getStringExtra("dosage"));
                    params.putString("time", intent.getStringExtra("time"));
                    params.putString("medicationId", intent.getStringExtra("medicationId"));
                    params.putString("alarmType", intent.getStringExtra("alarmType"));
                    params.putString("intervalHours", intent.getStringExtra("intervalHours"));
                    
                    sendEvent("onMedicationConfirmed", params);
                }
            }
        };
        
        IntentFilter filter = new IntentFilter("MEDICATION_CONFIRMED");
        reactContext.registerReceiver(medicationReceiver, filter);
    }
    
    /**
     * Envia evento para o JavaScript
     */
    private void sendEvent(String eventName, WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }
    
    /**
     * Inicia o serviço de foreground com a notificação persistente
     */
    @ReactMethod
    public void startForegroundService(ReadableMap medicationData, Promise promise) {
        try {
            Log.d(TAG, "🚀 Iniciando serviço de foreground");
            
            Intent serviceIntent = new Intent(reactContext, MedicationForegroundService.class);
            serviceIntent.putExtra(MedicationForegroundService.EXTRA_MEDICATION_NAME, 
                                  medicationData.getString("medicationName"));
            serviceIntent.putExtra(MedicationForegroundService.EXTRA_DOSAGE, 
                                  medicationData.getString("dosage"));
            serviceIntent.putExtra(MedicationForegroundService.EXTRA_TIME, 
                                  medicationData.getString("time"));
            serviceIntent.putExtra(MedicationForegroundService.EXTRA_MEDICATION_ID, 
                                  medicationData.getString("medicationId"));
            serviceIntent.putExtra(MedicationForegroundService.EXTRA_ALARM_TYPE, 
                                  medicationData.getString("alarmType"));
            
            if (medicationData.hasKey("intervalHours")) {
                serviceIntent.putExtra(MedicationForegroundService.EXTRA_INTERVAL_HOURS, 
                                      medicationData.getString("intervalHours"));
            }
            
            reactContext.startService(serviceIntent);
            
            Log.d(TAG, "✅ Serviço iniciado com sucesso");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao iniciar serviço: " + e.getMessage());
            promise.reject("START_SERVICE_ERROR", e.getMessage());
        }
    }
    
    /**
     * Para o serviço de foreground (remove a notificação)
     */
    @ReactMethod
    public void stopForegroundService(Promise promise) {
        try {
            Log.d(TAG, "🛑 Parando serviço de foreground");
            
            Intent serviceIntent = new Intent(reactContext, MedicationForegroundService.class);
            serviceIntent.setAction(MedicationForegroundService.ACTION_STOP_SERVICE);
            reactContext.stopService(serviceIntent);
            
            Log.d(TAG, "✅ Serviço parado com sucesso");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao parar serviço: " + e.getMessage());
            promise.reject("STOP_SERVICE_ERROR", e.getMessage());
        }
    }
    
    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        try {
            if (medicationReceiver != null) {
                reactContext.unregisterReceiver(medicationReceiver);
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao desregistrar receiver: " + e.getMessage());
        }
    }
}