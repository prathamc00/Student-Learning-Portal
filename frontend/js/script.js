let generatedPhoneOTP = ""

function sendPhoneOTP(){

let phone = document.getElementById("phone").value

if(phone.length < 10){

alert("Enter valid phone number")
return
}

/* Generate OTP */

generatedPhoneOTP = Math.floor(100000 + Math.random()*900000)

alert("Phone OTP: " + generatedPhoneOTP)

}

function verifyPhoneOTP(){

let userOtp = document.getElementById("phoneOtp").value

if(userOtp == generatedPhoneOTP){

alert("Phone Verified")

}else{

alert("Invalid Phone OTP")

}

}