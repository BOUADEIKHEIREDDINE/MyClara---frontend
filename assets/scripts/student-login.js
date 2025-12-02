document.addEventListener('DOMContentLoaded', () => {
    const loginSubmitBtn = document.getElementById('login-submit-btn');
    const goToSignupBtn = document.getElementById('go-to-signup-btn');
    const emailInput = document.getElementById('email');

    const API_BASE_URL = 'http://localhost/myclara-api';

    async function handleStudentLogin() {
        const email = emailInput.value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            console.log('Email and password are required.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/login.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (!response.ok || data.error) {
                console.error('Login error:', data.error || response.statusText);
                alert('Login failed. Check your email and password.');
                return;
            }

            if (data.userType !== 'Student') {
                alert('This account is not a student account.');
                return;
            }

            localStorage.setItem('currentUserId', data.userId);
            localStorage.setItem('currentUserEmail', data.email);
            localStorage.setItem('currentUserType', data.userType);

            console.log('Student login successful');
            window.location.href = 'student-create-module.html';
        } catch (err) {
            console.error('Network or server error:', err);
            alert('Unable to contact the server. Is XAMPP running?');
        }
    }

    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener('click', () => {
            handleStudentLogin();
        });
    }

    if (goToSignupBtn) {
        goToSignupBtn.addEventListener('click', () => {
            window.location.href = 'student-signup.html';
        });
    }
});
