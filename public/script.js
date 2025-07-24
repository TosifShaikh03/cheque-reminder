const firebaseConfig = {
  // Replace with your Firebase project config from Firebase Console
 apiKey: "AIzaSyAfqturwH3YDGSL199gF9y9kq4rdNo_8fI",
  authDomain: "cheque-remind.firebaseapp.com",
  projectId: "cheque-remind",
  storageBucket: "cheque-remind.firebasestorage.app",
  messagingSenderId: "424212410693",
  appId: "1:424212410693:web:9de1c41cdd79d5d2e30e2c",
  measurementId: "G-LD77V5VCM7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const authForm = document.getElementById('auth-form');
const authButton = document.getElementById('auth-button');
const toggleLink = document.getElementById('toggle-link');
const formTitle = document.getElementById('form-title');
const usernameInput = document.getElementById('username');
const authSection = document.getElementById('auth-section');
const chequeSection = document.getElementById('cheque-section');
const chequeForm = document.getElementById('cheque-form');
const chequeList = document.getElementById('cheque-list');
const logoutButton = document.getElementById('logout-button');
let isLoginMode = true;

toggleLink.addEventListener('click', (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  formTitle.textContent = isLoginMode ? 'Login' : 'Sign Up';
  authButton.textContent = isLoginMode ? 'Login' : 'Sign Up';
  usernameInput.style.display = isLoginMode ? 'none' : 'block';
  toggleLink.textContent = isLoginMode ? 'Sign Up' : 'Login';
  document.getElementById('toggle-auth').innerHTML = isLoginMode
    ? `Don't have an account? <a href="#" id="toggle-link">Sign Up</a>`
    : `Already have an account? <a href="#" id="toggle-link">Login</a>`;
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const username = document.getElementById('username').value;

  try {
    if (isLoginMode) {
      await auth.signInWithEmailAndPassword(email, password);
    } else {
      await auth.createUserWithEmailAndPassword(email, password);
      await auth.currentUser.updateProfile({ displayName: username });
      await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });
    }
    checkAuthState();
  } catch (error) {
    alert(error.message);
  }
});

logoutButton.addEventListener('click', async () => {
  await auth.signOut();
  checkAuthState();
});

chequeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const number = document.getElementById('cheque-number').value;
  const date = document.getElementById('cheque-date').value;
  const amount = document.getElementById('cheque-amount').value;
  const bank = document.getElementById('cheque-bank').value;

  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch('/api/cheques', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ number, date, amount, bank }),
    });
    if (response.ok) {
      chequeForm.reset();
      fetchCheques();
    } else {
      alert('Error adding cheque');
    }
  } catch (error) {
    alert(error.message);
  }
});

async function fetchCheques() {
  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch('/api/cheques', {
      headers: { 'Authorization': `Bearer ${idToken}` },
    });
    const cheques = await response.json();
    chequeList.innerHTML = '';
    cheques.forEach(cheque => {
      const li = document.createElement('li');
      li.innerHTML = `Cheque ${cheque.number} - ${cheque.bank} - $${cheque.amount} - ${cheque.date} 
        <button onclick="deleteCheque('${cheque.id}')">Delete</button>`;
      chequeList.appendChild(li);
    });
  } catch (error) {
    alert(error.message);
  }
}

async function deleteCheque(id) {
  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch(`/api/cheques/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${idToken}` },
    });
    if (response.ok) {
      fetchCheques();
    } else {
      alert('Error deleting cheque');
    }
  } catch (error) {
    alert(error.message);
  }
}

function checkAuthState() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      authSection.style.display = 'none';
      chequeSection.style.display = 'block';
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/auth/verify', {
          headers: { 'Authorization': `Bearer ${idToken}` },
        });
        if (response.ok) {
          fetchCheques();
        } else {
          auth.signOut();
        }
      } catch (error) {
        alert(error.message);
        auth.signOut();
      }
    } else {
      authSection.style.display = 'block';
      chequeSection.style.display = 'none';
    }
  });
}

checkAuthState();