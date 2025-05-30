import express from 'express';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// API endpoint for image prediction
app.post('/api/predict', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageBuffer = req.file.buffer;

    const response = await axios.post(
      'https://api-inference.huggingface.co/models/google/vit-base-patch16-224',
      imageBuffer, // send the buffer directly
      {
        headers: {
          'Authorization': `Bearer ${process.env.MY_HF_TOKEN}`,
          'Content-Type': req.file.mimetype, // e.g. 'image/jpeg'
        },
      }
    );

    // Process the predictions
    const predictions = response.data.map(pred => ({
      label: pred.label,
      score: pred.score
    }));

    res.json({ predictions });
  } catch (error) {
    console.error('Error:', error?.response?.data || error);
    res.status(500).json({ error: 'Error processing image' });
  }
});

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 