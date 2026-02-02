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
      const res = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.value,
          password: password.value,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Check backend error message
        if (data.detail === "User not found") {
          usernameError.innerText = "Invalid username";
          username.classList.add("error");
        } else if (data.detail === "Incorrect password") {
          passwordError.innerText = "Invalid password";
          password.classList.add("error");
        } else {
          passwordError.innerText = "Invalid username or password";
          username.classList.add("error");
          password.classList.add("error");
        }
        return;
      }

      // Success → redirect
      window.location.href = "/dashboard.html";
    } catch (err) {
      console.error(err);
      passwordError.innerText = "Server error. Try again.";
    }
  });
});
