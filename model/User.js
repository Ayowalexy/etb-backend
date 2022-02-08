const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    token: Number
})

module.exports = mongoose.model('user', userSchema)