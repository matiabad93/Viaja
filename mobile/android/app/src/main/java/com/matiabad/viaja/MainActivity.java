package com.matiabad.viaja;
import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
   @Override public void handleOnBackPressed() {
    getBridge().getWebView().evaluateJavascript("(function(){var e=new Event('viaja-back',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;})()", handled -> {
     if (!"true".equals(handled)) finish();
    });
   }
  });
 }
}
