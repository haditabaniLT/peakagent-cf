/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions, } = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const functions = require("firebase-functions");
const sgMail = require("@sendgrid/mail");

const SENDGRID_API_KEY = "functions.config().sendgrid.key";
sgMail.setApiKey(SENDGRID_API_KEY);

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });


exports.sendBulkEmails = functions.https.onCall(async (data, context) => {
  const { subject, message, emailList} = data;


  if (!emailList || !Array.isArray(emailList) || emailList.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid email list");
  }

  const msg = emailList.map(email => ({
    to: email,
    from: "your-email@example.com", // Use your verified sender
    subject: subject,
    html: message
  }));

  try {
    await sgMail.send(msg, false); // Set to false to send as individual messages
    return { success: true };
  } catch (error) {
    console.error("Error sending email", error);
    throw new functions.https.HttpsError("internal", "Email send failed");
  }
});