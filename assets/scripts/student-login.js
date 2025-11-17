document.addEventListener('DOMContentLoaded', () => {
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginSubmitBtn = document.getElementById('login-submit-btn');
    const emailInput = document.getElementById('email');

    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener('click', () => {
            const email = emailInput.value.trim();
            const password = document.getElementById('password').value;

            if (email !== '') {
                console.log("Student login submitted");
                localStorage.setItem('currentUserEmail', email);
                localStorage.setItem('currentUserPassword', password);
                window.location.href = 'student-create-module.html';
            } else {
                console.log("Email field cannot be empty.");
                // Optionally add visual feedback for empty email
            }
        });
    }

    if (signupTab) {
        signupTab.addEventListener('click', () => {
            console.log("Switch to sign up tab");
            const email = emailInput.value.trim();
            const password = document.getElementById('password').value;
            localStorage.setItem('currentUserEmail', email);
            localStorage.setItem('currentUserPassword', password);
            window.location.href = 'student-create-module.html'; // Redirect for signup as well
            // Visual update for active tab would go here
            signupTab.classList.add('active');
            if (loginTab) {
                loginTab.classList.remove('active');
            }
        });
    }

    if (loginTab) {
        loginTab.addEventListener('click', () => {
            console.log("Switch to login tab");
            // Visual update for active tab would go here
            loginTab.classList.add('active');
            if (signupTab) {
                signupTab.classList.remove('active');
            }
        });
    }
});
