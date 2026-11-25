const user = JSON.parse(localStorage.getItem('user') || 'null');
const authArea = document.getElementById('authArea');

if (authArea) {
  if (user) {
    authArea.innerHTML = `
      <span>Hi, ${user.full_name.split(' ')[0]}</span>
      <a href="#" id="logoutLink">Log out</a>
    `;
    document.getElementById('logoutLink').addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('user');
      window.location.href = 'index.html';
    });
  } else {
    authArea.innerHTML = `
      <a href="login.html">Log in</a>
      <a href="signup.html">Sign up</a>
    `;
  }
}
