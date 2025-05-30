const axios = require('axios');

exports.handler = async function(event, context) {
  try {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }

    // Parse the multipart form data
    const boundary = event.headers['content-type'].split('boundary=')[1];
    const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    const parts = bodyBuffer.toString().split(`--${boundary}`);
    // Find the part that contains the file
    const filePart = parts.find(part => part.includes('Content-Disposition: form-data;') && part.includes('filename='));
    if (!filePart) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No image file provided' }),
      };
    }
    // Extract the binary data (after two CRLFs)
    const fileBuffer = Buffer.from(filePart.split('\r\n\r\n')[1].split('\r\n')[0], 'binary');
    // Get the content type
    const contentTypeMatch = filePart.match(/Content-Type: ([^\r\n]+)/);
    const contentType = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';

    // Call Hugging Face API
    const hfResponse = await axios.post(
      'https://api-inference.huggingface.co/models/google/vit-base-patch16-224',
      fileBuffer,
      {
        headers: {
          'Authorization': `Bearer ${process.env.MY_HF_TOKEN}`,
          'Content-Type': contentType,
        },
      }
    );

    const predictions = hfResponse.data.map(pred => ({
      label: pred.label,
      score: pred.score
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ predictions }),
    };
  } catch (error) {
    console.error('Error:', error?.response?.data || error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error processing image' }),
    };
  }
}; 
