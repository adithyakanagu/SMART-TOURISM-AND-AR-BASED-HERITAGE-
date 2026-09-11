const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 5000;
const otpStore = new Map();

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_CONFIGURED = Boolean(SMTP_USER && SMTP_PASS && SMTP_USER !== 'yourgmail@gmail.com');

app.use(cors());
app.use(express.json());

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const transporter = SMTP_CONFIGURED
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    })
  : null;

app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  const otp = generateOTP();
  otpStore.set(email.toLowerCase(), otp);

  if (!SMTP_CONFIGURED) {
    console.log(`[DEV OTP] Email: ${email.toLowerCase()} | OTP: ${otp}`);
    return res.json({
      message: 'OTP generated in development mode. Use the code shown on screen to continue.',
      otp
    });
  }

  try {
    await transporter.sendMail({
      from: SMTP_USER,
      to: email,
      subject: 'Nilgiris AR Smart Tourism OTP',
      text: `Your OTP for Nilgiris AR Smart Tourism is: ${otp}. It is valid for 5 minutes.`
    });

    return res.json({ message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('Email send failed:', error);
    return res.status(500).json({ message: 'Failed to send OTP. Please check your SMTP configuration.' });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body || {};

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  const storedOtp = otpStore.get(email.toLowerCase());

  if (!storedOtp) {
    return res.status(400).json({ message: 'OTP not found or expired. Please request a new one.' });
  }

  if (storedOtp !== otp) {
    return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
  }

  otpStore.delete(email.toLowerCase());
  return res.json({ message: 'OTP verified successfully.' });
});

app.listen(PORT, () => {
  console.log(`OTP server running on http://localhost:${PORT}`);
  if (!SMTP_CONFIGURED) {
    console.log('SMTP not configured. Using dev OTP mode. Set SMTP_USER and SMTP_PASS to send real emails.');
  }
});
