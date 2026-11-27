const form = document.getElementById('signupForm');
const message = document.getElementById('signupMessage');

function showMessage(text, isError) {
  message.textContent = text;
  message.style.color = isError ? '#c0392b' : '#2e7d32';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const full_name = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const role = document.getElementById('role').value;
  if (password !== confirmPassword) {
    showMessage('Passwords do not match.', true);
    return;
  }

  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, email, password, role }),
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || 'Something went wrong.', true);
      return;
    }

    showMessage('Account created! Redirecting to login...', false);
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
  } catch (err) {
    showMessage('Could not reach the server. Is it running?', true);
  }
});
  