import {execFileSync} from 'node:child_process';
// Restore the official wrapper from the exact Capacitor CLI package locked in mobile/package-lock.json.
execFileSync('tar',['-xzf','mobile/node_modules/@capacitor/cli/assets/android-template.tar.gz','-C','mobile/android','gradle/wrapper/gradle-wrapper.jar']);
