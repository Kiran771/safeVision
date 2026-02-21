window.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("authorityForm");
    const tableBody = document.getElementById("authorityTableBody");
    let selectedContactId = null; 

    const submitButton = document.querySelector(".btn-submit");

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
        form.reset();
        selectedLocation.textContent="Click on the map to select a location",
        window.selectedLat = null;
        window.selectedLng = null;
    }



    const validateContact = (contact) => {
        const trimmed = contact.trim();
        if (!trimmed) return { valid: false, msg: "Contact number is required" };
        if (!/^(97|98)[0-9]{8}$/.test(trimmed)) {
            if (trimmed.length !== 10) return { valid: false, msg: "Must contain 10 digits" };
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
    const name = data.authority_name.trim();
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
    const contactResult = validateContact(data.contact_number);
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
        selectedLocation.style.color = "black";                        
        selectedLocation.style.fontWeight = "500";

    }

        return isValid;
    }


    // Fetch and populate table 
    async function loadContacts() {
        
        tableBody.innerHTML = ""; // clear table first
        try {
            const res = await fetch(API_BASE);
            const contacts = await res.json();
            console.log("Contacts received:", contacts); 

            if (!Array.isArray(contacts) || contacts.length === 0) {
                const row = document.createElement("tr");
                row.innerHTML = `<td colspan="7" style="text-align:center;">No contacts registered</td>`;
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
                    <td>${contact.is_active ? "Active" : "Pending"}</td>
                    
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
            row.innerHTML = `<td colspan="7" style="text-align:center; color:red;">Error loading contacts</td>`;
            tableBody.appendChild(row);
        }
    }

    // Form submit (create/update)
    form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const contactData = {
        authority_name: authorityName.value.trim(),
        contact_number: contact.value.trim(),
        category: category.value,
        email: email.value.trim(),
        latitude: Number(window.selectedLat) || 0,
        longitude: Number(window.selectedLng) || 0,
        location: selectedLocation.textContent.trim()
    };

    console.log("Sending this data:", contactData);

    if (!validateForm(contactData)) {
        console.log("Frontend validation failed");
        return;
    }

    try {
        let res;
        let alertMessage = "";
        let alertTitle = "";
        if (selectedContactId) {
            // Fetch the existing contact to compare changes
            const existingRes = await fetch(`${API_BASE}/${selectedContactId}`);
            const existingContact = await existingRes.json();

            // Check if any field changed
            const isChanged = Object.keys(contactData).some(
            key => contactData[key] !== existingContact[key]
            );

            if (!isChanged) {
            Swal.fire({
            icon: 'info',
            title: 'No changes detected',
            text: 'You did not modify any fields.',
            confirmButtonText: 'OK',
            width: '400px'
            });
            resetForm();
            submitButton.textContent = "Register Authority";
            selectedContactId=null;
            selectedLocation.textContent = "Click on the map to select a location"; 
            return;
            }
            // Update existing contact
            res = await fetch(`${API_BASE}/${selectedContactId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(contactData)
            });
            alertTitle = "Contact Updated!";
            alertMessage = `The contact <b>${contactData.authority_name}</b> has been updated successfully.`;

        } else {
            res = await fetch(API_BASE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(contactData)
            });
            alertTitle = "Contact Registered!";
            alertMessage = `A verification email has been sent to <b>${contactData.email}</b>.<br>The contact will become active after they confirm.`;
        

        }

        if (!res.ok) {
            const errorBody = await res.json();               
            console.error("Backend validation error:", errorBody);
            alert(`Server error: ${errorBody.detail || "Unknown"}`);
            throw new Error("Failed to save");
        }

        
        Swal.fire({
        icon: 'success',
        title: alertTitle,
        html: alertMessage,
        confirmButtonText: 'OK',
        width: '500px'
        });

        resetForm();
        submitButton.textContent = "Register Authority";
        selectedContactId=null;
        selectedLocation.textContent = "Click on the map to select a location";
        await loadContacts();
    } catch (err) {
        console.error("Submit error:", err);
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

            selectedContactId = id; 
            submitButton.textContent = "Update Authority";

        } catch (err) {
            console.error("Error fetching contact:", err);
            Swal.fire({
                icon: 'error',
                title: 'Failed to load contact',
                text: 'An error occurred while trying to load the contact details.',
                confirmButtonText: 'OK',
                width: '400px',
                height: '20px'
            });
        }
    }

    // Delete contact
    async function deleteContact(e) {
        const id = e.currentTarget.dataset.id;
        if (!confirm("Are you sure you want to delete this contact?")) return;

        try {
            const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'The contact has been deleted successfully.',
                confirmButtonText: 'OK',
                width: '400px'
            });
            await loadContacts();
        } catch (err) {
            console.error(err);
            alert("Error deleting contact");
        }
    }

    // Initialize
    loadContacts();
});
