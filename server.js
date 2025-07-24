const express = require('express');
require('dotenv').config();
const cors = require('cors');
const admin = require('firebase-admin');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// API Endpoints
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, username } = req.body;
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: username,
    });
    await db.collection('users').doc(userRecord.uid).set({
      email,
      username,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(201).json({ message: 'User created', uid: userRecord.uid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  // Client-side Firebase Authentication handles login; return success for compatibility
  res.status(200).json({ message: 'Login handled client-side' });
});

app.get('/api/auth/verify', verifyToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: userDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cheques', verifyToken, async (req, res) => {
  const { number, date, amount, bank } = req.body;
  try {
    const chequeRef = await db.collection('cheques').add({
      userId: req.user.uid,
      number,
      date,
      amount,
      bank,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(201).json({ id: chequeRef.id, message: 'Cheque added' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cheques', verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection('cheques').where('userId', '==', req.user.uid).get();
    const cheques = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(cheques);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cheques/:id', verifyToken, async (req, res) => {
  try {
    await db.collection('cheques').doc(req.params.id).delete();
    res.json({ message: 'Cheque deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));