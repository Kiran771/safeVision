document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('userForm');
    const addButton = document.querySelector('.add-button');
    const closeButton = document.querySelector('.close-btn');
    const cancelButton = document.querySelector('.btn-cancel');
    const submitButton = document.querySelector('.btn-submit');

    // Open modal
    addButton.addEventListener('click', () => {
        form.classList.add('show');
    });

    // Close modal
    closeButton.addEventListener('click', () => {
        form.classList.remove('show');
    });

    cancelButton.addEventListener('click', () => {
        form.classList.remove('show');
    });

    form.addEventListener('click', (e) => {
        if (e.target === form) {
            form.classList.remove('show');
        }
    });

    // Submit form
    submitButton.addEventListener('click', (e) => {
        e.preventDefault();
        
        const userName = document.getElementById('userName').value;
        const userEmail = document.getElementById('userEmail').value;
        const contact = document.getElementById('Contact').value;
        const userRole = document.getElementById('userRole').value;
        
        if (!userName || !userEmail || !contact) {
            alert('Please fill in all fields');
            return;
        }
        
        console.log('Form submitted:', {
            username: userName,
            email: userEmail,
            contact: contact,
            role: userRole
        });
        
        form.classList.remove('show');
        
        // Clear form
        document.getElementById('userName').value = '';
        document.getElementById('userEmail').value = '';
        document.getElementById('Contact').value = '';
    });
});