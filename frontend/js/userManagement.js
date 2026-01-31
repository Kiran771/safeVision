document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('userForm');
    const addButton = document.querySelector('.add-button');
    const closeButton = document.querySelector('.close-btn');
    const cancelButton = document.querySelector('.btn-cancel');
    const submitButton = document.querySelector('.btn-submit');


    addButton.addEventListener('click', () => {
        form.classList.add('show');
    });

    closeButton.addEventListener('click', () => {
        form.classList.remove('show');
        clearErrors();
        resetForm();
    });

    cancelButton.addEventListener('click', () => {
        form.classList.remove('show');
        clearErrors();
        resetForm();
    });

    form.addEventListener('click', (e) => {
        if (e.target === form) {
            form.classList.remove('show');
        }
    });

    function showError(id, message) {
        const el = document.getElementById(id);
        if (el) el.innerText = message;
    }

    function clearErrors() {
        document.querySelectorAll(".error").forEach(e => e.innerText = "");
    }
    // Reset form fields
    function resetForm() {
    document.getElementById('userName').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userContact').value = '';
    document.getElementById('Password').value = '';
}

    function validateForm(data) {
    let isValid = true;
    clearErrors();

    // Username validation
    if (!data.username) {
        showError("userNameError", "Username is required");
        isValid = false;

    } else if (/^\d/.test(data.username)) {
        showError("userNameError", "Username must not start with a number");
        isValid = false;
    } else if (data.username.length < 3) {
        showError("userNameError", "Username must be at least 3 characters");
        isValid = false;
    } 

    // Email validation
    if (!data.email) {
        showError("userEmailError", "Email is required");
        isValid = false;
    } else if (!data.email.includes("@")) {
        showError("userEmailError", "Invalid email address");
        isValid = false;
    }

    // Contact validation
    if (!data.contact) {
        showError("userContactError", "Contact is required");
        isValid = false;
    } else if (data.contact.length < 10) {
        showError("userContactError", "Contact must be at least 10 digits");
        isValid = false;
    }

    // Password validation
    if (!data.password) {
        showError("passwordError", "Password is required");
        isValid = false;
    } else if (data.password.length < 8) {
        showError("passwordError", "Password must be at least 8 characters");
        isValid = false;
    }

    return isValid;
}


    function handleBackendErrors(error) {
        if (!error.detail) return;

        error.detail.forEach(err => {
            const field = err.loc[1];
            if (field === "username") showError("userNameError", err.msg);
            if (field === "email") showError("userEmailError", err.msg);
            if (field === "contact") showError("userContactError", err.msg);
            if (field === "password") showError("passwordError", err.msg);
        });
    }

    // Form submission
    submitButton.addEventListener('click', async (e) => {
        e.preventDefault();

        const data = {
            username: document.getElementById('userName').value.trim(),
            email: document.getElementById('userEmail').value.trim(),
            contact: document.getElementById('userContact').value.trim(),
            role: document.getElementById('userRole').value,
            password: document.getElementById('Password').value
        };

        // Frontend validation
        if (!validateForm(data)) return;

        try {
            const response = await fetch("http://127.0.0.1:8000/admins/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            // Backend validation errors
            if (!response.ok) {
                handleBackendErrors(result);
                return;
            }

            // Success : close modal & clear form
            form.classList.remove('show');
            document.getElementById('userName').value = '';
            document.getElementById('userEmail').value = '';
            document.getElementById('userContact').value = '';
            document.getElementById('Password').value = '';

            alert("User created successfully");

        } catch (error) {
            console.error(error);
            alert("Server error. Please try again.");
        }
    });
});
