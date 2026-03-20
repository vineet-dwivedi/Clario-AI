import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  }
}, { timestamps: true });

const chatModel = mongoose.model('Chat', chatSchema);

export default chatModel;
