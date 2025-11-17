document.addEventListener('DOMContentLoaded', () => {
    const studentBtn = document.querySelector('.student-btn');
    const teacherBtn = document.querySelector('.teacher-btn');

    if (studentBtn) {
        studentBtn.addEventListener('click', () => {
            console.log("Selected: Student");
            window.location.href = 'student-login.html';
        });
    }

    if (teacherBtn) {
        teacherBtn.addEventListener('click', () => {
            console.log("Selected: Teacher");
        });
    }

    // Page Load Animation
    const logo = document.querySelector('.logo');
    const welcomeMessage = document.querySelector('.welcome-message');
    const rolePrompt = document.querySelector('.role-prompt');
    const studentCard = document.querySelector('.student-card');
    const teacherCard = document.querySelector('.teacher-card');
    const helpIcon = document.querySelector('.help-icon');

    const elementsToAnimate = [
        { element: logo, delayClass: 'fade-in-up' },
        { element: welcomeMessage, delayClass: 'fade-in-up' },
        { element: rolePrompt, delayClass: 'fade-in-up' },
        { element: studentCard, delayClass: 'fade-in-up-stagger-1' },
        { element: teacherCard, delayClass: 'fade-in-up-stagger-2' },
        { element: helpIcon, delayClass: 'fade-in-up' }, // Add help icon to animation
    ];

    elementsToAnimate.forEach(item => {
        if (item.element) {
            item.element.classList.remove('hidden-onload');
            item.element.classList.add(item.delayClass);
        }
    });
});
