// const info = require('./info.json');
require("dotenv").config();
const express = require('express')
const app = express()
const Stripe = require('stripe');
const mongoose = require('mongoose');
const Token = require('./model/token')
const { Expo } = require('expo-server-sdk');
let expo = new Expo();
const schedule = require('node-schedule')
const book = require('./book.json');
const bcrypt = require('bcrypt')
const User = require('./model/User');
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const Auth = require('./middleware/auth')
const log = require('morgan')



const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = Stripe(stripeSecretKey, {apiVersion: "2020-08-27"})


const DB = `mongodb+srv://seinde4:${process.env.PASSWORD}@cluster0.xr3ar.mongodb.net/end-time-bible?retryWrites=true&w=majority` || `mongodb://localhost:27017/etb`;

mongoose.connect(DB,
    {    
    useNewUrlParser: true,
    useUnifiedTopology: true,
    }
)

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error'))
db.once('open', () => {
    console.log('Database connected')
})


app.use(express.json())
app.use(log('dev'))


const rule = new schedule.RecurrenceRule();
rule.hour = 13;
rule.minute = 0;

let book_id = 0;

const job = schedule.scheduleJob(rule, async function(){
    let messages = [];

    const info = await Token.find();

    book_id = book_id + 1;

    for (let pushToken of info) {
    
      if (!Expo.isExpoPushToken(pushToken.token)) {
        console.error(`Push token ${pushToken.token} is not a valid Expo push token`);
        continue;
      }
    
      let new_book = book.find(element => element.id === 1)
    
      messages.push({
        to: pushToken.token,
        sound: 'default',
        title: new_book.book,
        body: new_book.verse,
      })
    }
    
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    (async () => {
      for (let chunk of chunks) {
        try {
          let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          console.log(ticketChunk);
          tickets.push(...ticketChunk);
          
        } catch (error) {
          console.error(error);
        }
      }
    })();
    
    
    let receiptIds = [];
    for (let ticket of tickets) {
      if (ticket.id) {
        receiptIds.push(ticket.id);
      }
    }
    
    let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    (async () => {
      for (let chunk of receiptIdChunks) {
        try {
          let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
          console.log(receipts);
          for (let receiptId in receipts) {
            let { status, message, details } = receipts[receiptId];
            if (status === 'ok') {
              continue;
            } else if (status === 'error') {
              console.error(
                `There was an error sending a notification: ${message}`
              );
              if (details && details.error) {
                
                console.error(`The error code is ${details.error}`);
              }
            }
          }
        } catch (error) {
          console.error(error);
        }
      }
    })();
    
    console.log('The world is going to end today.');
});


app.get('/', (req, res) => {
    res.send('Hello')
})

app.post('/creat-payment-intent/:amount', async (req, res) => {
    const amount = req.params.amount * 100
    try {

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            payment_method_types: ['card']
        })

        const clientSecret = paymentIntent.client_secret

        res.json({
            clientSecret: clientSecret
        })
    } catch (e){
        console.log(e.message)
        res.json({"error": e.message})

    }
})


app.post('/set-push-token', async(req, res) => {
  try {
      const newToken = new Token({...req.body});
      await newToken.save()

      res.status(200).json({"message": "Ok"})
  } catch (e){
    console.log(e.message);
    res.json({"error": e.message})
  }
})

app.post('/sign-up', async (req, res) => {
  try {
        const { username, password } = req.body;
        bcrypt.hash(password, 12).then(async function(hash) {
        const newUser = new User({email, password: hash})
        await newUser.save();

        res.status(200).json({"message": "Ok", "response": newUser})
    });
  } catch (e){
    console.log(e)
  }

})

app.post('/login', async( req, res) => {
  try {
    const { email, password } = req.body;
    const user = User.findOne({email: email})
    if(user){
      bcrypt.compare(password, user.password).then(function(result) {
        if(result){
          return res.status(200).json({"message": "Ok", "response": user})
        } else {
          res.status(401).json({"message": "error", "response": "Username of Password is incorrect"})
        }
      });
    } else {
      res.status(403).json({"message": "Forbidden", "response": "User Does not exist"})
    }
    
  } catch (e){
    console.log(e)
  }
})


app.post('/reset-password-verification', async (req, res) => {
  try {
    const { email } = req.body;
      const user = await User.findOne({email: email})

      if(user){

        const randomToken = Math.floor(Math.random() * 10000)
        await findOneAndUpdate({email: email}, {token: randomToken});
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: `${process.env.FROM}`,
              pass: `${process.env.PASSWORD}`,
            },
          })


        const token = jwt.sign({email: email}, process.env.SECRET_KEY, {expiresIn: '15m'})
  
        const mailOptions = {
          from:   `${process.env.FROM}`, 
          to: `${req.body.email}`, 
          message: 'Reset Password',
          subject: 'Confirm Password Update', 
          text: `A request was sent to update your password, enter this token to verify it came from you \n${randomToken}`
        }
  
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              console.log(error)
            res.json({
              status: 'fail'
            })
          } else {
            console.log(info)
            res.status(200).json(info)
            
          }
        })
        
      }

     
    
  } catch(e){
    console.log(e)
  }
})


app.post('/verification', Auth, async (req, res) => {
  try {
    const {randomToken} = req.body
      jwt.verify(req.token, process.env.SECRET_KEY, async ( err, data) => {
        if(err){
          return res.status(403).json({"message": "Auth Failed"})
        } else {
          const user = await User.findOne({email: data.email})

          if(user){
            if(user.token === randomToken){

              res.status(200).json({"message": "Ok", "response": "Token Matched", "user": user})
            } else {
              res.status(403).json({"message": "error", "response": "Token invalid"})
            }
          }
        }
      }) 
  } catch (e){
    console.log(e)
  }
})


app.patch('/update-password', async (req, res) => {
  try {
    const { email, password } = req.body;

    bcrypt.hash(password, 12).then(async function(hash) {
      await User.findOneAndUpdate({email: email, password: hash})

      res.status(200).json({"message": "Ok", "response": "Password Updated"})
  });

  } catch(e){
    console.log(e)
  }
})

const PORT = process.env.PORT || 8080

app.listen(PORT, () => console.log('Listening on Port 8080'))


