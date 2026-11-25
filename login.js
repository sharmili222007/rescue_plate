const form = document.getElementById('loginForm');
const message = document.getElementById('loginMessage');

function showMessage(text, isError) {
  message.textContent = text;
  message.style.color = isError ? '#c0392b' : '#2e7d32';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || 'Something went wrong.', true);
      return;
    }

    localStorage.setItem('user', JSON.stringify(data.user));
    showMessage('Login successful! Redirecting...', false);
    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
  } catch (err) {
    showMessage('Could not reach the server. Is it running?', true);
  }
});