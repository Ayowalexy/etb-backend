const book = require('./book.json');
// const info = require('./info.json');
const { Expo } = require('expo-server-sdk');
const schedule = require('node-schedule')
const Token = require('./model/token')

let expo = new Expo();


const rule = new schedule.RecurrenceRule();
rule.hour = 15;
rule.minute = 49;

const job = schedule.scheduleJob(rule, async function(){

  const info = await Token.find()
    let messages = [];
    for (let pushToken of info) {
    
      if (!Expo.isExpoPushToken(pushToken.token)) {
        console.error(`Push token ${pushToken.token} is not a valid Expo push token`);
        continue;
      }
    
      let new_book = book.find(element => element.id === 2)
    
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
    
  })