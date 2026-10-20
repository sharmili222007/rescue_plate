// RESCUE PLATE — INTERACTIONS
// This is a front-end demo. Connect a backend/database later for real donations and accounts.
const intro = document.getElementById('intro');
const skipIntro = document.getElementById('skipIntro');
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
const authModal = document.getElementById('authModal');
const authTitle = document.getElementById('authTitle');
const authDescription = document.getElementById('authDescription');
const authSubmit = document.getElementById('authSubmit');
const authMessage = document.getElementById('authMessage');
let introClosed = false;

function closeIntro() {
  if (introClosed) return;
  introClosed = true;
  intro.classList.add('is-done');
  // Remove it after its fade-out, so the main page can be used normally.
  window.setTimeout(() => intro.remove(), 900);
}
skipIntro.addEventListener('click', closeIntro);
window.setTimeout(closeIntro, 4300);

menuToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});

function openAuth(mode) {
  const isSignup = mode === 'signup';
  authTitle.textContent = isSignup ? 'Join Rescue Plate' : 'Welcome back';
  authDescription.textContent = isSignup
    ? 'Create an account to be part of the food rescue movement.'
    : 'Log in to continue making a difference.';
  authSubmit.innerHTML = isSignup ? 'Create account <span>↗</span>' : 'Log in <span>↗</span>';
  authMessage.textContent = '';
  authModal.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeAuth() {
  authModal.hidden = true;
  document.body.style.overflow = '';
}
document.getElementById('loginLink').addEventListener('click', event => {
  event.preventDefault(); openAuth('login');
});
document.getElementById('signupLink').addEventListener('click', event => {
  event.preventDefault(); openAuth('signup');
});
document.querySelectorAll('a[href="#signup"]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault(); openAuth('signup');
  });
});
document.getElementById('closeModal').addEventListener('click', closeAuth);
authModal.addEventListener('click', event => {
  if (event.target === authModal) closeAuth();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !authModal.hidden) closeAuth();
});
document.getElementById('authForm').addEventListener('submit', event => {
  event.preventDefault();
  authMessage.textContent = 'Demo only: this form is not connected to a real account system yet.';
});

const foodCards = [...document.querySelectorAll('.food-card')];
const searchMessage = document.getElementById('searchMessage');
document.getElementById('searchForm').addEventListener('submit', event => {
  event.preventDefault();
  const query = document.getElementById('locationInput').value.trim().toLowerCase();
  let visible = 0;
  foodCards.forEach(card => {
    const matches = !query || card.dataset.location.includes(query);
    card.hidden = !matches;
    if (matches) visible++;
  });
  if (!query) {
    searchMessage.textContent = 'Showing all sample listings. Real-time donations will appear after a database and donor accounts are connected.';
  } else if (visible) {
    searchMessage.textContent = `Showing ${visible} sample listing(s) matching “${document.getElementById('locationInput').value.trim()}”. These are demonstration listings, not live donations.`;
  } else {
    searchMessage.textContent = `No sample listings found for “${document.getElementById('locationInput').value.trim()}”. Try Bengaluru, Indiranagar, Jayanagar or Whitefield.`;
  }
  document.getElementById('available-food').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('contactForm').addEventListener('submit', event => {
  event.preventDefault();
  document.getElementById('contactMessage').textContent = 'Thanks for trying the demo! Connect this form to a backend or email service to receive messages.';
  event.target.reset();
});
document.getElementById('year').textContent = new Date().getFullYear();
