const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and form data with increased size limits
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (HTML, CSS, JS) from the public folder
app.use(express.static('public'));

// Ensure the uploads directory exists
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

// Set up the email transporter using environment variables
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Route to handle form submissions
app.post('/submit-report', (req, res) => {
  const { firstName, lastName, age, latitude, longitude, notes, imageData } = req.body;

  // ✅ Validate required fields
  if (!firstName || !lastName || !age || !latitude || !longitude || !imageData) {
    return res.status(400).json({ message: 'All required fields must be filled out.' });
  }

  // Decode base64 image
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');
  const imageName = `photo_${Date.now()}.png`;
  const imagePath = path.join(uploadPath, imageName);

  // Save the image to the uploads folder
  fs.writeFileSync(imagePath, imageBuffer);

  // Email configuration
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.TO_EMAIL,
    subject: 'New Garbage Bin Report',
    html: `
      <h3>New Smart Bin Report</h3>
      <p><strong>Name:</strong> ${firstName} ${lastName}</p>
      <p><strong>Age:</strong> ${age}</p>
      <p><strong>Location (GPS):</strong> Latitude: ${latitude}, Longitude: ${longitude}</p>
      <p><a href="https://www.google.com/maps?q=${latitude},${longitude}" target="_blank">📍 View on Google Maps</a></p>
      <p><strong>Notes:</strong> ${notes || 'None'}</p>
    `,
    attachments: [
      {
        filename: imageName,
        path: imagePath
      }
    ]
  };

  // Send the email
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Email error:', err);
      return res.status(500).json({ message: 'Failed to send email.' });
    } else {
      console.log('Email sent:', info.response);
      return res.status(200).json({ message: 'Report submitted and email sent successfully!' });
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
