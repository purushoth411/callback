const postmark = require("postmark");

// Create a client using your Server API token
const client = new postmark.ServerClient(process.env.POSTMARK_KEY);

/**
 * Sends an email using Postmark
 * @param {Object} options
 * @param {string} options.from - Sender email address
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Subject of the email
 * @param {string} options.body - HTML body content
 * @param {string} [options.bcc] - Optional BCC email address
 * @param {Function} callback - Callback function(err, result)
 */
function sendPostmarkMail({ from, to, subject, body, bcc = "" }, callback) {
  const emailData = {
    From: from,
    To: "web@thesisindia.net",
    Subject: subject,
    HtmlBody: body,
  };

  if (bcc) {
    emailData.Bcc = "web@thesisindia.net";
  }

  client.sendEmail(emailData, (error, result) => {
    if (error) {
      console.error("Postmark send error:", error.message);
      return callback(error, null);
    } else {
      console.log("Email sent via Postmark:", result);
      return callback(null, result);
    }
  });
}

module.exports = sendPostmarkMail;
