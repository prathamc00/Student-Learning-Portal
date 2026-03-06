const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
        e.preventDefault();

        let emailEl = document.getElementById("loginEmail") || document.getElementById("email");
        let passEl = document.getElementById("loginPassword") || document.getElementById("password");

        let email = emailEl.value.trim().toLowerCase();
        let password = passEl.value;

        console.log("Email entered:", email);
        console.log("Password entered:", password);

        /* ADMIN LOGIN */
        if (email === "admin@crismatech.com" && password === "admin") {
            alert("Welcome Admin");
            window.location.href = "admin/admin-dashboard.html";
        }

        /* STUDENT LOGIN */
        else {
            alert("Welcome Student");
            window.location.href = "dashboard.html";
        }
    });
}
