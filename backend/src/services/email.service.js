const axios = require('axios');
const env = require('../config/env');

class EmailService {
  async sendEmail({ to, subject, htmlContent }) {
    if (!env.BREVO_API_KEY) {
      if (env.NODE_ENV !== 'production') {
        console.log(`[Email Mock] To: ${to} | Subject: ${subject}`);
        return { success: true, mock: true };
      }

      const error = 'Email delivery is not configured: BREVO_API_KEY is missing';
      console.error(`[EmailService] ${error}`);
      return { success: false, error };
    }

    try {
      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { email: env.SENDER_EMAIL, name: env.SENDER_NAME },
          to: Array.isArray(to) ? to.map(e => ({ email: e })) : [{ email: to }],
          subject: subject,
          htmlContent: htmlContent,
        },
        {
          headers: {
            'api-key': env.BREVO_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Brevo Email Error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  async sendStudentCredentials(email, username, password, loginUrl) {
    const htmlContent = `
      <h2>Welcome to VERSANT Testing System</h2>
      <p>Your student account credentials have been created:</p>
      <ul>
        <li><strong>Username:</strong> ${username}</li>
        <li><strong>Password:</strong> ${password}</li>
      </ul>
      <p>Click here to log in: <a href="${loginUrl}">${loginUrl}</a></p>
    `;
    return this.sendEmail({
      to: email,
      subject: 'VERSANT Account Credentials',
      htmlContent,
    });
  }
}

module.exports = new EmailService();
