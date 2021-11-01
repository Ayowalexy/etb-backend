require("dotenv").config();
const express = require('express')
const app = express()
const Stripe = require('stripe')


const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = Stripe(stripeSecretKey, {apiVersion: "2020-08-27"})

app.use(express.json())



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
        res.json({error: e.message})

    }
})


const PORT = process.env.PORT || 8080

app.listen(PORT, () => console.log('Listening on Port 8080'))