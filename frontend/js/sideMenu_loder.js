document.addEventListener("DOMContentLoaded", () => {
  fetch("/frontend/html/sideMenu.html")
    .then(response => response.text())
    .then(html => {
      document.getElementById("sidebar-container").innerHTML = html;
    })
    .catch(error => {
      console.error("Error loading sidebar:", error);
    });
});
