let mongoose = require('mongoose')

let UserChats = mongoose.Schema({
    userName: String,
    communityId: Array
}, { timestamps: true })

let UserChat = mongoose.model('UserChats', UserChats, 'UserChats')

module.exports = UserChat