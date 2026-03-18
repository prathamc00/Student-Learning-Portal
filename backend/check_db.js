require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/courseModel');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const courses = await Course.find({}).sort({ updatedAt: -1 }).lean();
    let foundVideo = false;
    for (const c of courses) {
       for (const m of (c.modules || [])) {
           if (m.videoUrl) {
               console.log('FOUND VIDEO! Course:', c.title, '| Module:', m.title, '| videoUrl:', m.videoUrl);
               foundVideo = true;
           }
       }
    }
    if (!foundVideo) {
        console.log('No video uploads found in the database. The uploads must be failing mid-flight.');
    }
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
