/* Donation page logic: image preview, validation and sending the form to the Flask API. */

// Address of your Flask backend. Change it after you host Flask online.
const API_BASE = "http://127.0.0.1:5000";
const MAX_IMAGE_MB = 5;

const form = document.getElementById("donationForm");
const message = document.getElementById("donationMessage");
const submitBtn = document.getElementById("submitBtn");
const imageInput = document.getElementById("foodImage");
const preview = document.getElementById("imagePreview");

function showMessage(text, isError) {
  message.textContent = text;
  message.style.color = isError ? "#C0392B" : "";
  message.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* Image preview and size/type check */
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  preview.hidden = true;
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    showMessage("Please choose a JPG, PNG or WEBP image.", true);
    imageInput.value = "";
    return;
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    showMessage("That image is larger than " + MAX_IMAGE_MB + " MB. Please choose a smaller one.", true);
    imageInput.value = "";
    return;
  }
  message.textContent = "";
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
});

/* Checks that the browser's required-field rules cannot do */
function checkDates() {
  const prepared = new Date(form.preparedAt.value);
  const expiry = new Date(form.expiryAt.value);
  const pickup = new Date(form.pickupTime.value);
  if (expiry <= prepared) return "The best-before time must be after the preparation time.";
  if (expiry <= new Date()) return "This food has already passed its best-before time.";
  if (pickup > expiry) return "The pickup time must be before the best-before time.";
  return "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  message.textContent = "";

  if (!form.checkValidity()) {
    form.reportValidity();           // shows the browser's message on the first bad field
    return;
  }
  const dateError = checkDates();
  if (dateError) { showMessage(dateError, true); return; }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";
  try {
    const res = await fetch(API_BASE + "/api/donations", { method: "POST", body: new FormData(form) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "The server could not save your donation.");

    // Success is shown only after the server confirms the donation was saved
    form.reset();
    preview.hidden = true;
    showMessage("Thank you! Your donation was submitted" + (data.donation_id ? " (ID: " + data.donation_id + ")" : "") + ". You can see it on the Available Food page.", false);
  } catch (err) {
    console.error(err);
    const offline = err instanceof TypeError;   // fetch could not reach the server at all
    showMessage(offline ? "Could not reach the donation server. Please try again later." : err.message, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Donation ↗";
  }
});

/* Header menu and footer year */
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
menuToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("af-open");
  menuToggle.setAttribute("aria-expanded", open);
});
document.getElementById("year").textContent = new Date().getFullYear();
