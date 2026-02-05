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
    const roleSelect = document.getElementById('userRole');
        if (roleSelect) roleSelect.selectedIndex = 0;
}

    const validateContact = (contact) => {
        const trimmed = contact.trim();
        if (!trimmed) return { valid: false, msg: "Contact number is required" };
        if (!/^(97|98)[0-9]{8}$/.test(trimmed)) {
            if (trimmed.length !== 10) return { valid: false, msg: "Contact must be exactly 10 digits" };
            if (!/^(97|98)/.test(trimmed)) return { valid: false, msg: "Mobile number must start with 97 or 98" };
            return { valid: false, msg: "Invalid mobile number format" };
        }
        return { valid: true };
    };

    function validateForm(data) {
    let isValid = true;
    clearErrors();

    // Username validation
    if (!data.username.trim()) {
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
    if (!data.email.trim()) {
        showError("userEmailError", "Email is required");
        isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(data.email)) {
        showError("userEmailError", "Please enter a valid email");
        isValid = false;
    }

    // Contact validation
    const contactResult = validateContact(data.contact);
    if (!contactResult.valid) {
        showError("userContactError", contactResult.msg);
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

    const loadAdmins = async () => {
        const token = getToken();
        if (!token) {
            alert("Please login first");
            return;
        }

        try {
            const res = await fetch("http://127.0.0.1:8000/admins/", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    alert("Session expired. Please login again.");
                    localStorage.removeItem("token");
                    return;
                }
                if (res.status === 403) {
                    alert("You do not have permission to view admins.");
                    return;
                }
                throw new Error("Failed to load admins");
            }

            const admins = await res.json();

            tableBody.innerHTML = '';
            admins.forEach(admin => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${admin.id}</td>
                    <td>${admin.username}</td>
                    <td>${admin.email}</td>
                    <td>${admin.role}</td>
                    <td class="action-buttons">
                        <button class="icon-btn btn-edit" data-id="${admin.id}">
                            <img src="/frontend/resources/edit.png" alt="Edit">
                        </button>
                        <button class="icon-btn btn-delete" data-id="${admin.id}">
                            <img src="/frontend/resources/delete.png" alt="Delete">
                        </button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });

            totalAdminEl.textContent = admins.length;

        } catch (err) {
            console.error("Load admins error:", err);
            alert("Cannot load admins. Server may be down.");
        }
    };

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
