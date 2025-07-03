
const logger = require("firebase-functions/logger");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require('firebase-admin')
const sgMail = require("@sendgrid/mail");
const { getLastWeeksNumbers, generateWeeklyReportHTML } = require('./helper');
const { onRequest } = require("firebase-functions/https");
const { defineSecret } = require("firebase-functions/params");

// The es6-promise-pool to limit the concurrency of promises.
const PromisePool = require("es6-promise-pool").default;
// Maximum concurrent account deletions.
const MAX_CONCURRENT = 3;

const sendGridKey = defineSecret('SEND_GRID_API_KEY')
const sendGridEmail = defineSecret('SEND_GRID_EMAIL')

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.database();

exports.addPartnerEmails = onRequest({ region: "us-central1" }, async (req, res) => {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { userId, emails } = req.body;
  logger.info("======[req.body]=====", req.body);

  // Validate inputs
  if (!userId || !Array.isArray(emails)) {
    return res.status(400).json({
      error: 'Invalid request: userId must be provided and emails must be an array',
    });
  }

  try {
    const userEmailsRef = db.ref(`providerEmails/${userId}`);

    // Fetch existing emails
    const snapshot = await userEmailsRef.once('value');
    const existingEmails = snapshot.exists() ? snapshot.val() : [];

    // Merge and ensure uniqueness
    const mergedEmails = Array.from(new Set([...(existingEmails || []), ...emails]));

    // Save updated list
    await userEmailsRef.set(mergedEmails);

    return res.status(200).json({
      message: `Emails successfully added for user ${userId}`,
      data: mergedEmails,
    });

  } catch (error) {
    logger.error('Error writing to database:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

exports.emailSchedular = onSchedule("0 9 * * 1", async (context) => {

  const SendGridKey = sendGridKey.value()
  const SendGridEmail = sendGridEmail.value()

  console.log("======[SendGridKey]=====", JSON.stringify(SendGridKey, null, 1))
  console.log("======[SendGridEmail]=====", JSON.stringify(SendGridEmail, null, 1))

  sgMail.setApiKey(SendGridKey)

  const userAndEmails = await getProviderUsersAndEmails()
  // console.log("======[userAndEmails]=====", JSON.stringify(userAndEmails, null, 1))
  const userIDs = Object.keys(userAndEmails)
  for (const userId of userIDs) {
    const userWeeklyData = await db.ref(`users/${userId}/weeklyNumbers`).once('value');
    const weeklyValue = await userWeeklyData.val()
    if (!weeklyValue) {
      continue
    }
    const result = getLastWeeksNumbers(weeklyValue)
    if (Object.keys(result).length) {
      console.log("======[result]=====", JSON.stringify(result, null, 1))
      const emailBody = generateWeeklyReportHTML(result)
      const userEmails = userAndEmails[userId]
      console.log("======[emailBody]=====", JSON.stringify(emailBody, null, 1))
      await sendEmail(SendGridEmail, userEmails, "Last Week Report", emailBody)

    }
  }

  return { message: "Message" }

});

const getProviderUsersAndEmails = async () => {
  const snapshot = await db.ref(`providerEmails`).once('value');
  const values = snapshot.val();
  return values
}

const sendEmail = async (senderMail, emails, subject, html) => {
  try {
    const msg = {
      to: emails,
      from: senderMail, // Use your verified sender
      subject,
      html
    };

    const res = await sgMail.send(msg, false); // Set to false to send as individual messages
    console.log("======[res]=====", JSON.stringify(res, null, 1))
  } catch (error) {
    console.log("======[error SEND EMAIL error]=====", JSON.stringify(error?.message, null, 1))
  }
}