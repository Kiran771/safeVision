window.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("authorityForm");
    const tableBody = document.getElementById("authorityTableBody");
    let selectedContactId = null; 

    const authorityName=document.getElementById("authorityName");
    const contact=document.getElementById("contactNumber")
    const selectedLocation=document.getElementById("selectedLocation")
    const category=document.getElementById("category");
    const email=document.getElementById("email");


    const API_BASE = "http://127.0.0.1:8000/contacts"; 

    function showError(id, msg) {
        const el = document.getElementById(id);
        if (el) 
        {
            el.textContent = msg;
            el.style.display = "block";
        }
    }

    function markFieldAsError(fieldId, hasError = true) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    if (hasError) {
        field.classList.add("error");
    } else {
        field.classList.remove("error");
    }
    }
    function clearErrors() {
    document.querySelectorAll(".error-message").forEach(el => {
        el.textContent = "";
        el.style.display = "none";         
    });
    document.querySelectorAll(".form-input.error, .form-select.error")
        .forEach(el => el.classList.remove("error"));
    
    }
    function resetForm(){
        authorityName.value="",
        contact.value="",
        email.value='',
        category.value="",
        selectedLocation.textContent="Click on the map to select a location",
        window.selectedLat = null;
        window.selectedLng = null;
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

    // Utility to show error messages
    function validateForm(data) {
    let isValid = true;
    clearErrors();                    

    // Authority Name
    const name = data.authorityName.trim();
    if (!name) {
        showError("authorityName-error", "Authority Name is required");
        markFieldAsError("authorityName", true);
        isValid = false;
    } else if (/^\d/.test(name)) {
        showError("authorityName-error", "Authority Name cannot start with a number");
        markFieldAsError("authorityName", true);
        isValid = false;
    } else if (name.length < 2) {
        showError("authorityName-error", " Authority Name must be at least 2 characters");
        markFieldAsError("authorityName", true);
        isValid = false;
    } else {
        markFieldAsError("authorityName", false);
    }

    // Contact
    const contactResult = validateContact(data.contactNumber);
    if (!contactResult.valid) {
        showError("contactNumber-error", contactResult.msg);
        markFieldAsError("contactNumber", true);
        isValid = false;
    } else {
        markFieldAsError("contactNumber", false);
    }

    // Category
    if (!data.category) {
        showError("category-error", "Please select a category");
        markFieldAsError("category", true);
        isValid = false;
    } else {
        markFieldAsError("category", false);
    }

    // Email
    const emailVal = data.email.trim();
    if (!emailVal) {
        showError("email-error", "Email is required");
        markFieldAsError("email", true);
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        showError("email-error", "Invalid email format");
        markFieldAsError("email", true);
        isValid = false;
    } else {
        markFieldAsError("email", false);
    }

        // Location validation
        if (typeof window.selectedLat !== "number" || typeof window.selectedLng !== "number" || 
        window.selectedLat === 0 || window.selectedLng === 0) {
        
        
        selectedLocation.textContent = "Please select a location on the map";
        selectedLocation.style.color = 'red';         
        selectedLocation.style.fontWeight = "500";              
        
        isValid = false;
    } else {
        selectedLocation.style.color = "";                        
        selectedLocation.style.fontWeight = "";

    }

        return isValid;
    }


    // Fetch and populate table 
    async function loadContacts() {
        
        tableBody.innerHTML = ""; // clear table first
        try {
            const res = await fetch(API_BASE);
            const contacts = await res.json();
            console.log("Contacts received:", contacts); // DEBUG

            if (!Array.isArray(contacts) || contacts.length === 0) {
                const row = document.createElement("tr");
                row.innerHTML = `<td colspan="6" style="text-align:center;">No contacts registered</td>`;
                tableBody.appendChild(row);
                return;
            }

            contacts.forEach(contact => {
                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>${contact.authority_name}</td>
                    <td>${contact.category}</td>
                    <td>${contact.contact_number}</td>
                    <td>${contact.email || ""}</td>
                    <td>${contact.location}</td>
                    <td class="action-buttons">
                        <button class="icon-btn btn-edit" data-id="${contact.contactid}">
                            <img src="/frontend/resources/edit.png" alt="Edit">
                        </button>
                        <button class="icon-btn btn-delete" data-id="${contact.contactid}">
                            <img src="/frontend/resources/delete.png" alt="Delete">
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            // Attach edit/delete listeners after table rows are added
            document.querySelectorAll(".btn-edit").forEach(btn => {
                btn.addEventListener("click", editContact);
            });
            document.querySelectorAll(".btn-delete").forEach(btn => {
                btn.addEventListener("click", deleteContact);
            });

        } catch (err) {
            console.error("Error fetching contacts:", err);
            const row = document.createElement("tr");
            row.innerHTML = `<td colspan="6" style="text-align:center; color:red;">Error loading contacts</td>`;
            tableBody.appendChild(row);
        }
    }

    // Form submit (create/update)
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        

        const contactData = {
            authorityName: document.getElementById("authorityName").value,
            contactNumber: document.getElementById("contactNumber").value,
            category: document.getElementById("category").value,
            email: document.getElementById("email").value,
            latitude: window.selectedLat || 0, 
            longitude: window.selectedLng || 0,
            location: document.getElementById("selectedLocation").textContent
        };
        if (!validateForm(contactData)) {
            return;
        }

        try {
            let res;
            if (selectedContactId) {
                // UPDATE
                res = await fetch(`${API_BASE}/${selectedContactId}`, {
                    method: "PUT",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(contactData)
                });
                selectedContactId = null; // reset
            } else {
                // CREATE
                res = await fetch(API_BASE, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(contactData)
                });
            }

            if (!res.ok) throw new Error("Failed to save contact");
            form.reset();
            document.getElementById("selectedLocation").textContent = "Click on the map to select a location";

            await loadContacts(); // refresh table

        } catch (err) {
            console.error(err);
            alert("Error saving contact");
        }
    });

    // Edit contact
    async function editContact(e) {
        const id = e.currentTarget.dataset.id;
        try {
            const res = await fetch(`${API_BASE}/${id}`);
            if (!res.ok) throw new Error("Failed to fetch contact");
            const contact = await res.json();

            document.getElementById("authorityName").value = contact.authority_name;
            document.getElementById("contactNumber").value = contact.contact_number;
            document.getElementById("category").value = contact.category;
            document.getElementById("email").value = contact.email || "";
            document.getElementById("selectedLocation").textContent = contact.location;

            window.selectedLat = contact.latitude;
            window.selectedLng = contact.longitude;

            selectedContactId = id; // set for update
        } catch (err) {
            console.error("Error fetching contact:", err);
            alert("Failed to load contact for editing");
        }
    }

    // Delete contact
    async function deleteContact(e) {
        const id = e.currentTarget.dataset.id;
        if (!confirm("Are you sure you want to delete this contact?")) return;

        try {
            const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            await loadContacts();
        } catch (err) {
            console.error(err);
            alert("Error deleting contact");
        }
    }

    // Initialize
    loadContacts();
});
