// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyCZ4WSzJwXWeaISwvb9Mj_zOpeuV6ZpizE',
    authDomain: 'improvdatabase.firebaseapp.com',
    databaseURL: 'https://improvdatabase.firebaseio.com',
    projectId: 'improvdatabase',
    storageBucket: 'improvdatabase.appspot.com',
    messagingSenderId: '540135102191',
    appId: '1:540135102191:web:cb263593d69ebd72a22d1a',
    measurementId: 'G-7P8PS1JE62'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
import 'zone.js/dist/zone-error';  // Included with Angular CLI.
