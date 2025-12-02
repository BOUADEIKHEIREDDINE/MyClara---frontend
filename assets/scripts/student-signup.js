document.addEventListener('DOMContentLoaded', () => {
    const signupSubmitBtn = document.getElementById('signup-submit-btn');
    const emailInput = document.getElementById('email');
    const API_BASE_URL = 'http://localhost/myclara-api';

    async function handleStudentSignup() {
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
                    userType: 'Student'
                })
            });

            let data = null;
            try {
                data = await res.json();
            } catch (jsonErr) {
                // If response is not JSON, capture raw text for debugging
                const text = await res.text();
                alert(`Signup failed (status ${res.status}). Raw response: ${text}`);
                return;
            }

            if (!res.ok || (data && data.error)) {
                alert(data && data.error ? data.error : `Signup failed (status ${res.status})`);
                return;
            }

            localStorage.setItem('currentUserId', data.userId);
            localStorage.setItem('currentUserEmail', data.email);
            localStorage.setItem('currentUserType', data.userType);

            console.log('Student signup successful');
            window.location.href = 'student-create-module.html';
        } catch (e) {
            console.error(e);
            alert('Server error during signup.');
        }
    }

    if (signupSubmitBtn) {
        signupSubmitBtn.addEventListener('click', handleStudentSignup);
    }
});


