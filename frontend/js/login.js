document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const username = document.getElementById("username");
  const password = document.getElementById("password");
  const usernameError = document.getElementById("usernameError");
  const passwordError = document.getElementById("passwordError");

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Reset errors
    usernameError.innerText = "";
    passwordError.innerText = "";
    username.classList.remove("error");
    password.classList.remove("error");

    let hasError = false;
    if (!username.value.trim()) {
      usernameError.innerText = "Username is required";
      username.classList.add("error");
      hasError = true;
    }
    if (!password.value.trim()) {
      passwordError.innerText = "Password is required";
      password.classList.add("error");
      hasError = true;
    }
    if (hasError) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/login/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: username.value,
          password: password.value,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Show generic invalid credentials error
        usernameError.innerText = "Invalid username or password";
        passwordError.innerText = "Invalid username or password";
        username.classList.add("error");
        password.classList.add("error");
        return;
      }

      // Save token and role in sessionStorage
      sessionStorage.setItem("access_token", data.access_token);
      sessionStorage.setItem("role", data.role);

      // Redirect based on role
      if (data.role === "Super Admin") {
        window.location.href = "/admin-dashboard.html";
      } else if (data.role === "Admin") {
        window.location.href = "/responder-dashboard.html";
      } else {
        window.location.href = "/dashboard.html";
      }
    } catch (err) {
      console.error(err);
      passwordError.innerText = "Server error. Try again.";
    }
  });

});
