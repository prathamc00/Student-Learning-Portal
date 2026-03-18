const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./models/courseModel');
const User = require('./models/userModel');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    let admin = await User.findOne({ role: 'admin' });
    if(!admin) {
        admin = await User.create({name:'Test',email:'test2@x.com',password:'123',role:'admin',college:'N',branch:'N',semester:1,phone:'0'});
    }
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);

    let course = await Course.findOne({});
    if(!course) {
        course = await Course.create({title:'Debug Course', instructor:'Test', category:'IT', level:'Beginner', createdBy:admin._id});
    }

    // Create 10MB dummy file
    const buffer = Buffer.alloc(10 * 1024 * 1024, 'a');
    
    const formData = new FormData();
    formData.append('title', 'Debug Module 10MB');
    
    // In Node fetch, we can append a Blob
    const blob = new Blob([buffer], { type: 'video/mp4' });
    formData.append('video', blob, 'test.mp4');

    console.log('Sending request to', 'http://127.0.0.1:5001/api/courses/' + course._id + '/modules');

    const res = await fetch('http://127.0.0.1:5001/api/courses/' + course._id + '/modules', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
    });
    
    const data = await res.json();
    console.log('Response:', res.status, data);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
