/**
 * Stage 8 distribution preflight.
 * Does not publish, sign or touch user data. Emits a machine-readable go/no-go report.
 */
import assert from 'node:assert/strict';
import {existsSync,readFileSync,mkdirSync,writeFileSync,statSync} from 'node:fs';
import {join} from 'node:path';

const read=path=>readFileSync(path,'utf8');
const manifest=JSON.parse(read('public/manifest.webmanifest'));
const capacitor=JSON.parse(read('mobile/capacitor.config.json'));
const webVersion=JSON.parse(read('package.json')).version;
const nativeVersion=JSON.parse(read('mobile/package.json')).version;
const android=read('mobile/android/app/src/main/AndroidManifest.xml');
const gradle=read('mobile/android/app/build.gradle');
const androidWorkflow=read('.github/workflows/android-play-release.yml');
const iosWorkflow=read('.github/workflows/ios-native-preflight.yml');
const appAccount=read('components/account-control.tsx');
const checks=[];
function check(id,label,ok,{severity='critical',detail=''}={}){
 checks.push({id,label,ok:Boolean(ok),severity,detail});
}
check('pwa_identity','Manifest con identidad y navegación instalable',
 manifest.name?.includes('Viaja')&&manifest.display==='standalone'&&manifest.start_url==='/'&&manifest.scope==='/');
check('pwa_icons','Iconos de instalación de 192 y 512 píxeles',
 [192,512].every(size=>manifest.icons?.some(icon=>icon.sizes===size+'x'+size&&existsSync('public'+icon.src)&&statSync('public'+icon.src).size>0)));
check('offline_safe','Pantalla sin conexión y servicio sin caché privada',
 existsSync('public/offline.html')&&existsSync('public/sw.js')&&read('public/sw.js').includes("u.pathname.startsWith('/api/')"));
check('android_identity','Android ID de aplicación consistente',
 capacitor.appId==='com.matiabad.viaja'&&gradle.includes('com.matiabad.viaja')&&android.includes('android:exported="true"'));
check('android_transport','Android sin HTTP inseguro ni copias de seguridad personales',
 android.includes('android:usesCleartextTraffic="false"')&&android.includes('android:allowBackup="false"')&&capacitor.server?.cleartext===false);
check('android_permissions','Android solicita únicamente INTERNET',
 [...android.matchAll(/<uses-permission\s+android:name="([^"]+)"/g)].map(x=>x[1]).join(',')==='android.permission.INTERNET');
check('android_signing','Release AAB firmada solo con secretos y ejecución manual',
 androidWorkflow.includes('workflow_dispatch')&&androidWorkflow.includes('environment: android-release')&&androidWorkflow.includes('bundleRelease')&&androidWorkflow.includes('jarsigner -verify'));
check('version_alignment','Versión web y nativa alineadas',webVersion===nativeVersion);
check('ios_unsigned','Xcode preflight compilable sin claves de distribución',
 iosWorkflow.includes('xcodebuild')&&iosWorkflow.includes('CODE_SIGNING_ALLOWED=NO')&&iosWorkflow.includes('macos-26'));
check('preview_isolation','Workflows Preview sin credenciales de producción',
 (()=>{const p=read('.github/workflows/viaja-premium-preview.yml');return p.includes('environment: preview')&&p.includes('VIAJA_CF_PREVIEW_API_TOKEN')&&!p.includes('secrets.VIAJA_CF_API_TOKEN')})());
check('web_artifact','Build distribuible generado por CI',
 existsSync('web-dist/index.html'),{detail:'Debe ejecutarse después de npm run build:demo'});

// Blocking business/compliance items must remain visible, not silently passed.
check('privacy_url','Política de privacidad pública con responsable y contacto verificables',
 existsSync('public/privacy.html'),{severity:'release-blocker',detail:'Falta publicar política jurídica revisada y correo de contacto.'});
check('account_deletion','Eliminación de cuenta iniciable desde la propia aplicación',
 /Eliminar (?:mi )?cuenta/.test(appAccount),{severity:'release-blocker',detail:'No existe aún un flujo autenticado de eliminación completa, incluyendo Storage y colaboraciones.'});
check('support_contact','Canal de soporte privado accesible',
 existsSync('public/support.html'),{severity:'release-blocker',detail:'Definir correo de soporte o formulario privado antes de publicar en tiendas.'});
check('apple_signing','Firma y distribución Apple configuradas',
 false,{severity:'manual',detail:'Requiere Apple Developer Program, equipo, certificados/perfiles y App Store Connect.'});
check('play_signing','Keystore de subida Google Play provisto',
 false,{severity:'manual',detail:'Requiere secretos Android del entorno android-release y Play Console.'});
const technical=checks.filter(x=>x.severity==='critical'),blockers=checks.filter(x=>x.severity!=='critical'&&!x.ok);
const report={product:'Viaja',stage:8,appId:capacitor.appId,version:webVersion,generatedAt:new Date().toISOString(),
 technicalPassed:technical.every(x=>x.ok),readyForSubmission:checks.every(x=>x.ok),checks,blockers:blockers.map(x=>({id:x.id,detail:x.detail}))};
const dir='artifacts/store-readiness';mkdirSync(dir,{recursive:true});
writeFileSync(join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');
const lines=['# Viaja · Preparación de tiendas (etapa 8)','',
 'Resultado técnico: '+(report.technicalPassed?'APROBADO':'NO APROBADO'),
 'Listo para enviar a tiendas: '+(report.readyForSubmission?'SÍ':'NO'),'',
 ...checks.map(x=>'- '+(x.ok?'[x]':'[ ]')+' **'+x.label+'**'+(x.detail?' — '+x.detail:'')),'',
 'Nota: el resultado técnico no sustituye pruebas en dispositivos físicos ni la revisión de Apple/Google.'];
writeFileSync(join(dir,'report.md'),lines.join('\n')+'\n');
for(const c of checks)console.log((c.ok?'PASS ':c.severity==='critical'?'FAIL ':'BLOCK ')+c.id+': '+c.label);
console.log('Release-ready: '+report.readyForSubmission+'; report '+join(dir,'report.json'));
assert.equal(report.technicalPassed,true,'Technical distribution contract failed');
