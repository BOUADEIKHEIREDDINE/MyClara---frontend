document.addEventListener('DOMContentLoaded', () => {
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginSubmitBtn = document.getElementById('login-submit-btn');
    const emailInput = document.getElementById('email');

    const API_BASE_URL = 'http://localhost/myclara-api';
    let isSignupMode = false;

    async function handleTeacherLogin() {
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

            if (data.userType !== 'Teacher') {
                alert('This account is not a teacher account.');
                return;
            }

            // Store info for later use
            localStorage.setItem('currentUserId', data.userId);
            localStorage.setItem('currentUserEmail', data.email);
            localStorage.setItem('currentUserType', data.userType);

            console.log('Teacher login successful');
            window.location.href = 'teacher-create-class.html';
        } catch (err) {
            console.error('Network or server error:', err);
            alert('Unable to contact the server. Is XAMPP running?');
        }
    }

    async function handleTeacherSignup() {
        const email = emailInput.value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            console.log('Email and password are required for signup.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/signup.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    userType: 'Teacher'
                })
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                alert(data.error || 'Signup failed');
                return;
            }

            // auto-login after signup
            localStorage.setItem('currentUserId', data.userId);
            localStorage.setItem('currentUserEmail', data.email);
            localStorage.setItem('currentUserType', data.userType);

            console.log('Teacher signup successful');
            window.location.href = 'teacher-create-class.html';
        } catch (e) {
            console.error(e);
            alert('Server error during signup.');
        }
    }

    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener('click', () => {
            if (isSignupMode) {
                handleTeacherSignup();
            } else {
                handleTeacherLogin();
            }
        });
    }

    if (signupTab) {
        signupTab.addEventListener('click', () => {
            console.log('Switch to teacher sign up tab');
            isSignupMode = true;
            signupTab.classList.add('active');
            if (loginTab) {
                loginTab.classList.remove('active');
            }
        });
    }

    if (loginTab) {
        loginTab.addEventListener('click', () => {
            console.log('Switch to login tab');
            isSignupMode = false;
            loginTab.classList.add('active');
            if (signupTab) {
                signupTab.classList.remove('active');
            }
        });
    }
});
