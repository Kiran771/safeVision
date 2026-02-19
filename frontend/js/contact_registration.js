window.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("authorityForm");
    const tableBody = document.getElementById("authorityTableBody");
    let selectedContactId = null; // for editing

    const API_BASE = "http://127.0.0.1:8000/contacts"; 


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
    function validateForm() {
    let isValid = true;

    // Clear previous error messages
    document.querySelectorAll(".error-message").forEach(el => el.textContent = "");

    // Authority Name
    const name = document.getElementById("authorityName").value.trim();
    if (name.length < 2) {
        document.getElementById("authorityName-error").textContent = "Name must be at least 2 characters";
        isValid = false;
    }

    // Contact Number
    const contactResult = validateContact(data.contact);
        if (!contactResult.valid) {
            showError("contactNumber-error", contactResult.msg);
            isValid = false;
        }

    // Category
    const category = document.getElementById("category").value;
    if (!category) {
        document.getElementById("category-error").textContent = "Please select a category";
        isValid = false;
    }

    // Email (optional)
    const email = document.getElementById("email").value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        document.getElementById("email-error").textContent = "Enter a valid email";
        isValid = false;
    }

    // Location
    const location = document.getElementById("selectedLocation").textContent;
    if (!window.selectedLat || !window.selectedLng || location === "Click on the map to select a location") {
        document.getElementById("location-error").textContent = "Please select a location on the map";
        isValid = false;
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
            authority_name: document.getElementById("authorityName").value,
            contact_number: document.getElementById("contactNumber").value,
            category: document.getElementById("category").value,
            email: document.getElementById("email").value,
            latitude: window.selectedLat || 0, // set by your leaflet map
            longitude: window.selectedLng || 0,
            location: document.getElementById("selectedLocation").textContent
        };

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
