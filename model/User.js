let mongoose = require('mongoose')

let UserSchema = mongoose.Schema({
    email: String,
    gender: String,
    interest: Array,
    isVerified: Boolean,
    location: Map,
    name: String,
    userName: String,
    flag: Boolean
})

let User = mongoose.model('Users', UserSchema,'Users')

module.exports = User