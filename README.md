# AI Calorie Tracker

A web application that uses AI to identify food items from images and estimate their calorie content.

## Features

- Drag-and-drop or file input for image upload
- Real-time food recognition using Hugging Face's ResNet-50 model
- Calorie estimation for common food items
- Responsive design with Tailwind CSS
- Shows top 3 predictions with confidence scores

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Hugging Face API token

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-calorie-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your Hugging Face API token:
```
MY_HF_TOKEN=your_hugging_face_token_here
```

4. Start the development server:
```bash
npm run dev
```

5. In a separate terminal, start the backend server:
```bash
node server.js
```

The application will be available at `http://localhost:5173`

## Building for Production

1. Build the frontend:
```bash
npm run build
```

2. Start the production server:
```bash
node server.js
```

## Environment Variables

- `MY_HF_TOKEN`: Your Hugging Face API token
- `PORT`: Port for the backend server (default: 3001)

## Technologies Used

- React
- Vite
- Tailwind CSS
- Express.js
- Hugging Face API
- Axios

## License

MIT 