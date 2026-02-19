document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('userForm');
    const addButton = document.querySelector('.add-button');
    const closeButton = document.querySelector('.close-btn');
    const submitButton = document.querySelector('.btn-submit');
    const CRUD = document.querySelector('.CURD');
    const tableBody = document.getElementById("userTableBody");
    const totalAdminEl = document.getElementById("totalAdmin");

    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userContact = document.getElementById('userContact');
    const userRole = document.getElementById('userRole');
    const Password = document.getElementById('Password');
    const rePassword = document.getElementById('rePassword');

    let selectedAdminId = null;

    // Utility Functions
    function showError(id, msg) { document.getElementById(id).innerText = msg; }
    function clearErrors() { document.querySelectorAll(".error").forEach(e => e.innerText = ""); }
    function resetForm() {
        userName.value = '';
        userEmail.value = '';
        userContact.value = '';
        userRole.selectedIndex = 0;
        Password.value = '';
        rePassword.value = '';
        document.querySelectorAll('.password-section').forEach(group => {
            group.style.display = 'block';
        });
        clearErrors();
    }
    function closeForm() { form.classList.remove('show'); resetForm(); }

    // Contact validation
    const validateContact = (contact) => {
        const trimmed = contact.trim();
        if (!trimmed) return { valid: false, msg: "Contact is required" };
        if (!/^(97|98)[0-9]{8}$/.test(trimmed)) return { valid: false, msg: "Invalid mobile number" };
        return { valid: true };
    };

    // Form validation
    function validateForm(data, isEdit = false) {
        let valid = true;
        clearErrors();

        // Username
        if (!data.username.trim()) { showError("userNameError", "Username required"); valid = false; }
        else if (/^\d/.test(data.username)) { showError("userNameError", "Cannot start with number"); valid = false; }
        else if (data.username.length < 3) { showError("userNameError", "Min 3 characters"); valid = false; }

        // Email
        if (!data.email.trim()) { showError("userEmailError", "Email required"); valid = false; }
        else if (!/\S+@\S+\.\S+/.test(data.email)) { showError("userEmailError", "Invalid email"); valid = false; }

        // Contact
        const contactResult = validateContact(data.contact);
        if (!contactResult.valid) { showError("userContactError", contactResult.msg); valid = false; }

        // Password (only for add)
        if (!isEdit) {
            if (!data.password) { showError("passwordError", "Password required"); valid = false; }
            else if (data.password.length < 8) { showError("passwordError", "Min 8 characters"); valid = false; }

            if (!data.rePassword) { showError("rePasswordError", "Retype password"); valid = false; }
            else if (data.password !== data.rePassword) { showError("rePasswordError", "Passwords do not match"); valid = false; }
        }

        return valid;
    }

    // Load admins
    async function loadAdmins() {
        const token = sessionStorage.getItem("access_token");
        if (!token) {
            alert("Please login first");
            window.location.href = "/frontend/html/login.html";
            return;
        }
        try {
            const res = await fetch("http://127.0.0.1:8000/admins/", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    alert("Session expired or unauthorized. Please login again.");
                    sessionStorage.removeItem("access_token");
                    window.location.href = "/frontend/html/login.html";
                    return;
                }
                throw new Error("Failed to load admins");
            }

            const admins = await res.json();
            console.log("First admin object:", admins[0] || "No admins");
            tableBody.innerHTML = "";

            const adminUsers = admins.filter(admin => admin.role === "Admin");
            const totalAdmins = adminUsers.length;

            if (totalAdmins === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; font-size: 15px; color: #666;">No admin found</td></tr>`;
            }
            else {
                adminUsers.forEach(admin => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td>${admin.id}</td>
                        <td>${admin.username}</td>
                        <td>${admin.email}</td>
                        <td>${admin.role}</td>
                        <td>
                            <button class="btn-edit" data-id="${admin.id}"><img src="/frontend/resources/edit.png" alt="Edit"></button>
                            <button class="btn-delete" data-id="${admin.id}"><img src="/frontend/resources/delete.png" alt="Delete"></button>
                        </td>`;
                    tableBody.appendChild(tr);
                });

                document.querySelectorAll(".btn-edit").forEach(btn => btn.addEventListener("click", editAdmin));
                document.querySelectorAll(".btn-delete").forEach(btn => btn.addEventListener("click", deleteAdmin));
            }

            totalAdminEl.textContent = totalAdmins;
        } catch (err) { console.error(err); alert("Failed to load admins"); }
    }

    // Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = sessionStorage.getItem("access_token");

        if (!token) {
            alert("Please login first");
            window.location.href = "/frontend/html/login.html";
            return;
        }

        const data = {
            username: userName.value.trim(),
            email: userEmail.value.trim(),
            contact: userContact.value.trim(),
            role: userRole.value,
            password: Password.value,
            rePassword: rePassword.value
        };

        const isEdit = !!selectedAdminId;

        if (!validateForm(data, isEdit)) return;

        try {
            let url = "http://127.0.0.1:8000/admins/";
            let method = "POST";

            if (isEdit) {
                url += selectedAdminId;
                method = "PATCH";
                delete data.password;
                delete data.rePassword;
            }

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });


            const result = await res.json();

            if (!res.ok) {
                if (result.detail) alert(result.detail);
                return;
            }

            closeForm();
            await loadAdmins();
            alert(isEdit ? "Admin updated!" : "Admin created!");
            selectedAdminId = null;

        } catch (err) {
            console.error(err);
            alert("Server error");
        }
    });

    // Edit Admin
    async function editAdmin(e) {
        const id = e.currentTarget.dataset.id;
        const token = sessionStorage.getItem("access_token");

        if (!token) {
            alert("Please login first");
            window.location.href = "/frontend/html/login.html";
            return;
        }
        try {
            const res = await fetch(`http://127.0.0.1:8000/admins/${id}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    alert("Session expired or unauthorized. Please login again.");
                    sessionStorage.removeItem("access_token");
                    window.location.href = "/frontend/html/login.html";
                    return;
                }
                throw new Error("Failed to load admin");
            }


            const admin = await res.json();

            userName.value = admin.username;
            userEmail.value = admin.email;
            userContact.value = admin.contact;
            userRole.value = admin.role;

            document.querySelectorAll('.password-section').forEach(group => {
                group.style.display = 'none';
            });
            submitButton.textContent = "Update Admin";
            CRUD.textContent = "Update Admin";
            selectedAdminId = id;
            form.classList.add('show');

            // Always show role dropdown for edit
            userRole.style.display = 'block';

        } catch (err) {
            console.error(err);
            alert("Cannot load admin");
        }
    }

    // Delete Admin
    async function deleteAdmin(e) {
        const id = e.currentTarget.dataset.id;
        if (!confirm("Delete this admin?")) return;

        const token = sessionStorage.getItem("access_token");

        if (!token) {
            alert("Please login first");
            window.location.href = "/frontend/html/login.html";
            return;
        }

        try {
            const res = await fetch(`http://127.0.0.1:8000/admins/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    alert("Session expired or unauthorized. Please login again.");
                    sessionStorage.removeItem("access_token");
                    window.location.href = "/frontend/html/login.html";
                    return;
                }
                throw new Error("Delete failed");
            }

            await loadAdmins();
            alert("Admin deleted successfully");

        } catch (err) {
            console.error(err);
            alert("Delete error");
        }
    }

    // Open Add Admin Form
    addButton.addEventListener('click', async () => {
        form.classList.add('show');
        resetForm();
        submitButton.textContent = "Add Admin";

        document.querySelectorAll('.password-section').forEach(group => {
            group.style.display = 'block';});
            CRUD.textContent = "Add New Admin";
            selectedAdminId = null;

            // Always show role dropdown if adding after first Super Admin
            userRole.style.display = 'block';
        });

        closeButton.addEventListener('click', closeForm);

        // Initial load
        console.log("loadAdmins started");

        console.log("tableBody element:", tableBody);
        loadAdmins();
    });
