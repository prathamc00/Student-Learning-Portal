const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./models/courseModel');
const User = require('./models/userModel');
const FormData = require('form-data');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    let admin = await User.findOne({ role: 'admin' });
    if(!admin) {
        admin = await User.create({name:'Test',email:'test@x.com',password:'123',role:'admin',college:'N',branch:'N',semester:1,phone:'0'});
    }
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);

    let course = await Course.findOne({});
    if(!course) {
        course = await Course.create({title:'Debug Course', instructor:'Test', category:'IT', level:'Beginner', createdBy:admin._id});
    }

    fs.writeFileSync('test.mp4', 'dummy video');
    
    const form = new FormData();
    form.append('title', 'Debug Module');
    form.append('video', fs.createReadStream('test.mp4'));

    const res = await fetch('http://127.0.0.1:5001/api/courses/' + course._id + '/modules', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: form
    });
    
    const data = await res.json();
    console.log(data);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
