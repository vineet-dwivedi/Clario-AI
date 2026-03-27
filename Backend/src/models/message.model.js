import mongoose from 'mongoose';

/**
 * One stored message inside a chat.
 * `role` tells whether the content came from the user or the AI.
 */
const messageSchema = new mongoose.Schema(
    {
        chat: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Chat',
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        kind: {
            type: String,
            enum: [ 'text', 'image' ],
            default: 'text',
        },
        images: {
            type: [
                {
                    dataUrl: {
                        type: String,
                        required: true,
                    },
                    mimeType: {
                        type: String,
                        required: true,
                    },
                },
            ],
            default: [],
        },
        role: {
            type: String,
            enum: [ 'user', 'ai' ],
            required: true,
        },
        provider: {
            type: String,
            default: null,
            trim: true,
        },
        model: {
            type: String,
            default: null,
            trim: true,
        },
    },
    { timestamps: true }
);

const messageModel = mongoose.model('Message', messageSchema);

export default messageModel;
