// One-off: node scripts/check-auth-user.js someone@example.com
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
});

(async () => {
  const email = process.argv[2];
  try {
    const u = await admin.auth().getUserByEmail(email);
    console.log('AUTH USER EXISTS:', {
      uid: u.uid,
      email: u.email,
      disabled: u.disabled,
      providers: u.providerData.map((p) => p.providerId),
      created: u.metadata.creationTime,
      lastSignIn: u.metadata.lastSignInTime,
    });
    const profile = await admin.firestore().collection('users').doc(u.uid).get();
    console.log('FIRESTORE users/<uid> profile:', profile.exists ? profile.data() : 'MISSING');
  } catch (e) {
    console.log('NO AUTH USER (' + e.code + '):', e.message);
  }
})();
