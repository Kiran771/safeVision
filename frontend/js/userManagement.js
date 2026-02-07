document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('userForm');
    const addButton = document.querySelector('.add-button');
    const closeButton = document.querySelector('.close-btn');
    const cancelButton = document.querySelector('.btn-cancel');
    const submitButton = document.querySelector('.btn-submit');
    const tableBody = document.getElementById("userTableBody");
    const totalAdminEl = document.getElementById("totalAdmin");

    //MODAL HANDLING

    addButton.addEventListener('click', () => {
        form.classList.add('show');
    });

    closeButton.addEventListener('click', closeForm);
    cancelButton.addEventListener('click', closeForm);

    form.addEventListener('click', (e) => {
        if (e.target === form) closeForm();
    });

    function closeForm() {
        form.classList.remove('show');
        clearErrors();
        resetForm();
    }

    //ERROR HANDLING 

    function showError(id, message) {
        const el = document.getElementById(id);
        if (el) el.innerText = message;
    }

    function clearErrors() {
        document.querySelectorAll(".error").forEach(e => e.innerText = "");
    }

    function resetForm() {
        document.getElementById('userName').value = '';
        document.getElementById('userEmail').value = '';
        document.getElementById('userContact').value = '';
        document.getElementById('Password').value = '';
        document.getElementById('userRole').selectedIndex = 0;
    }

    //VALIDATION

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

        if (!data.email.trim()) {
            showError("userEmailError", "Email is required");
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(data.email)) {
            showError("userEmailError", "Please enter a valid email");
            isValid = false;
        }

        const contactResult = validateContact(data.contact);
        if (!contactResult.valid) {
            showError("userContactError", contactResult.msg);
            isValid = false;
        }

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

    //LOAD ADMINS

    const loadAdmins = async () => {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch("http://127.0.0.1:8000/admins/", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to load admins");

        const admins = await res.json();

        // Remove "No admin found" row
        tableBody.innerHTML = "";

        if (admins.length === 0) {
            // If no admins, show message
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="5" class="no-data">No admin found</td>`;
            tableBody.appendChild(tr);
        } else {
            // Add all admin rows
            admins.forEach(admin => {
                const tr = document.createElement("tr");
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
        }

        totalAdminEl.textContent = admins.length;

    } catch (err) {
        console.error(err);
        alert("Unable to load admins");
    }
};

    // CREATE ADMIN 

    submitButton.addEventListener('click', async (e) => {
        e.preventDefault();

        const data = {
            username: userName.value.trim(),
            email: userEmail.value.trim(),
            contact: userContact.value.trim(),
            role: userRole.value,
            password: Password.value
        };

        if (!validateForm(data)) return;

        try {
            const token = getToken();

            const response = await fetch("http://127.0.0.1:8000/admins/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                handleBackendErrors(result);
                return;
            }

            closeForm();
            await loadAdmins(); //  AUTO UPDATE TABLE
            alert("User created successfully");

        } catch (error) {
            console.error(error);
            alert("Server error");
        }
    });

    //INITIAL LOAD 

    loadAdmins();
});
