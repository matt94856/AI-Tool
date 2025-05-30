const axios = require('axios');
const formidable = require('formidable');
const fs = require('fs');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // Netlify passes the body as base64-encoded string
  const form = new formidable.IncomingForm();
  form.keepExtensions = true;

  return new Promise((resolve, reject) => {
    // formidable expects a Node.js request object, so we need to fake it
    const req = Object.assign(require('stream').Readable.from(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')),
      {
        headers: event.headers,
        method: event.httpMethod,
        url: event.path,
      });
    req.headers['content-type'] = event.headers['content-type'];

    form.parse(req, async (err, fields, files) => {
      if (err) {
        resolve({
          statusCode: 400,
          body: JSON.stringify({ error: 'Error parsing form data' }),
        });
        return;
      }

      const file = files.image;
      if (!file) {
        resolve({
          statusCode: 400,
          body: JSON.stringify({ error: 'No image file provided' }),
        });
        return;
      }

      try {
        // Use file.buffer if available, otherwise read from file._writeStream.buffer or file.filepath
        let imageBuffer;
        if (file.buffer) {
          imageBuffer = file.buffer;
        } else if (file._writeStream && file._writeStream.buffer) {
          imageBuffer = file._writeStream.buffer;
        } else if (file.filepath) {
          imageBuffer = fs.readFileSync(file.filepath);
        } else {
          resolve({
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not extract image buffer' }),
          });
          return;
        }

        const contentType = file.mimetype || file.type || 'application/octet-stream';

        const hfResponse = await axios.post(
          'https://api-inference.huggingface.co/models/google/vit-base-patch16-224',
          imageBuffer,
          {
            headers: {
              'Authorization': `Bearer ${process.env.MY_HF_TOKEN}`,
              'Content-Type': contentType,
            },
          }
        );

        const predictions = hfResponse.data.map(pred => ({
          label: pred.label,
          score: pred.score,
        }));

        resolve({
          statusCode: 200,
          body: JSON.stringify({ predictions }),
        });
      } catch (error) {
        console.error('Error:', error?.response?.data || error);
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: 'Error processing image' }),
        });
      }
    });
  });
}; 