const mongoose = require('mongoose')

const NoficiationSchema = mongoose.Schema({
    userName: String,
    notification: Array
})

module.exports = mongoose.model('Notifications', NoficiationSchema, 'Notifications')