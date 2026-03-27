import mongoose from 'mongoose';

/**
 * Opens the MongoDB connection used by the Express app.
 * The server startup file handles process exit if this promise rejects.
 */
export async function connectToDB(){
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in Backend/.env')
  }

  await mongoose.connect(process.env.MONGO_URI)
  console.log('CONNECTED TO DB')
}
