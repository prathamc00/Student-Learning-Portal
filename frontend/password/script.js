document.getElementById("registerForm").addEventListener("submit", function (e) {

    let pass = document.getElementById("password").value
    let confirm = document.getElementById("confirmPassword").value

    if (pass !== confirm) {
        alert("Passwords do not match")
        e.preventDefault()
    }

})