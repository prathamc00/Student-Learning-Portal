// ─── Login Form Handler ───
const loginForm = document.getElementById("loginForm");

function getDashboardPathForUser(user) {
    if (!user) return 'dashboard.html';
    if (user.role === 'admin') return 'admin/admin-dashboard.html';
    if (user.role === 'instructor') return 'instructor/dashboard.html';
    return 'dashboard.html';
}

if (loginForm) {
    const authMode = (loginForm.dataset.authMode || 'general').toLowerCase();

    // API auto-discovery
    const API_CANDIDATES = [5000, 5001, 5002, 5003, 5004, 5005].map(
        (port) => `http://${window.location.hostname || 'localhost'}:${port}/api`
    );
    let apiBase = null;

    async function getApiBase() {
        if (apiBase) return apiBase;
        for (const base of API_CANDIDATES) {
            try { const res = await fetch(`${base}/courses`); if (res.ok) { apiBase = base; return apiBase; } } catch (_) { }
        }
        throw new Error('Unable to connect to backend API.');
    }

    loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const emailEl = document.getElementById("loginEmail") || document.getElementById("email");
        const passEl = document.getElementById("loginPassword") || document.getElementById("password");
        const btn = loginForm.querySelector('button[type="submit"]');

        const email = emailEl.value.trim().toLowerCase();
        const password = passEl.value;

        // Real API login
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Signing in...';
        }

        try {
            const base = await getApiBase();
            const loginPath = authMode === 'instructor' ? '/auth/instructor/login' : '/auth/login';
            const res = await fetch(`${base}${loginPath}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                if (authMode === 'instructor') {
                    window.location.href = window.location.pathname.includes('/authentication/')
                        ? '../instructor/dashboard.html'
                        : 'instructor/dashboard.html';
                    return;
                }

                window.location.href = getDashboardPathForUser(data.user);
            } else {
                alert(data.message || 'Login failed');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Sign In';
                }
            }
        } catch (err) {
            alert('Server error. Please try again.');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Sign In';
            }
        }
    });
}
