let mongoose = require('mongoose')

const CommunitySchema = mongoose.Schema({
    userName: String,
    community: Array
})

module.exports = mongoose.model('Community', CommunitySchema,'Community')