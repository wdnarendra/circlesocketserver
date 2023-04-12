let mongoose = require('mongoose')

const chatSchema = mongoose.Schema({
    userId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    }],
    communityId: {
        type: String
    },
    chats: [{
        userName: String,
        chat: String,
        time: Number
    }]
}, { timestamps: true })

module.exports = mongoose.model('Chats', chatSchema, 'Chats')