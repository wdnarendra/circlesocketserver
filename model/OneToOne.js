const mongoose = require('mongoose')

const oneToOneSchema = mongoose.Schema({
    userName: Array,
    chats: [{
        userName: String,
        time: Number,
        chat: String
    }],
    readEd:[{userName:String,read:Number}]
})

module.exports = mongoose.model('OneToOne', oneToOneSchema)