document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) {
    console.error("Login form not found");
    return;
  }

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const usernameError = document.getElementById("usernameError");
  const passwordError = document.getElementById("passwordError");
  const submitButton = loginForm.querySelector('button[type="submit"]');

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Reset UI state
    usernameError.innerText = "";
    passwordError.innerText = "";
    usernameInput.classList.remove("error");
    passwordInput.classList.remove("error");

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    let hasError = false;

    if (!username) {
      usernameError.innerText = "Username is required";
      usernameInput.classList.add("error");
      hasError = true;
    }

    if (!password) {
      passwordError.innerText = "Password is required";
      passwordInput.classList.add("error");
      hasError = true;
    }

    if (hasError) return;

    // Disable button + loading state
    submitButton.disabled = true;
    submitButton.textContent = "Logging in...";

    try {
      const res = await fetch("http://127.0.0.1:8000/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username: username,
          password: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 401 or 400 from backend
        passwordError.innerText = data.detail || "Login failed. Please check your credentials.";
        usernameInput.classList.add("error");
        passwordInput.classList.add("error");
        return;
      }

      // Success – backend returns access_token + user object
      if (!data.access_token) {
        throw new Error("No access token received");
      }

      // Save token & role (use sessionStorage as you already do)
      sessionStorage.setItem("access_token", data.access_token);
      sessionStorage.setItem("role", data.user.role);
      sessionStorage.setItem("user", JSON.stringify(data.user)); // optional – full user info

      // Role-based redirect (matches your current logic)
      if (data.user.role === "Super Admin") {
        window.location.href = "/html/dashboard.html";
      } else if (data.user.role === "Admin") {
        window.location.href = "/html/detection.html";
      } else {
        window.location.href = "/html/dashboard.html";
      }

    } catch (err) {
      console.error("Login error:", err);
      passwordError.innerText = "Server error. Please try again later.";
    } finally {
      // Always restore button
      submitButton.disabled = false;
      submitButton.textContent = "Login";
    }
  });
});