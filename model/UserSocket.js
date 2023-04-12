const mongoose = require('mongoose')

const UserSocket = mongoose.Schema({
    userName: String,
    socketId: String,
    firebaseToken: String,
    expoToken:String
})

module.exports = mongoose.model('UserSockets', UserSocket, 'UserSockets')
