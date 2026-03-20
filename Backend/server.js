import dotenv from 'dotenv';
import app from './src/app.js';
import { connectDB } from './src/config/database.js';

dotenv.config({ path: '.env' });

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
