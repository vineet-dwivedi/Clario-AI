import mongoose from 'mongoose';

export const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    throw new Error('MONGO_URI is not set');
  }

  await mongoose.connect(mongoURI);
  console.log('Connected to DB');
};

export default mongoose;
