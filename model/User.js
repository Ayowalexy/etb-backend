const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    token: Number,
    loggedIn: {
        type: Boolean,
        default: true
    },
    started: {
        type: String,
        default: ''
    },
    expires: {
        type: String,
        default: ''
    },
    subscribed: {
        type: Boolean,
        default: false
    }
})

module.exports = mongoose.model('user', userSchema)