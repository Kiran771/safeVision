document.addEventListener('DOMContentLoaded', () => {
    // Find ANY sidebar on the page
    const sidebars = document.querySelectorAll('.sidebar');
    if (!sidebars.length) return;

    const currentPage = window.location.pathname
        .split('/')
        .pop()
        .toLowerCase();

    sidebars.forEach(sidebar => {
        const navItems = sidebar.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            const link = item.querySelector('a');
            if (!link) return;

            const linkPage = link
                .getAttribute('href')
                .split('/')
                .pop()
                .toLowerCase();

            if (currentPage === linkPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    });
});