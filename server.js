import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import Messages from './dbMessages.js';
import Pusher from 'pusher';
import cors from 'cors';

dotenv.config();

// app config
const app = express();
const port = process.env.PORT || 5000

const pusher = new Pusher({
  appId: '1096727',
  key: '737fbac157154505f9c2',
  secret: 'dbfad6532fce1f2345e4',
  cluster: 'us2',
  useTLS: true
});

// middleware
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cors()); // sets headers for us, allows any message in

// DB config
mongoose.connect(process.env.dbURI, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;

db.once('open', () => {
  console.log('db is connected');

  const msgCollection = db.collection("messagecontents");
  const changeStream = msgCollection.watch();

  changeStream.on('change', (change) => {
    console.log(change);
    if (change.operationType === 'insert') {
      const messageDetails = change.fullDocument;
      pusher.trigger('messages', 'inserted', {
        name: messageDetails.name,
        message: messageDetails.message,
        received: messageDetails.received,
        timeStamp: messageDetails.timeStamp
      })
    } else {
      console.log("error triggering pusher");
    }
  })
})

// api routes
app.get('/', (req, res) => {
  res.status(200).send('ello world!')
})

app.get('/messages/sync', (req, res) => {
  Messages.find((err, data) => {
    return (err) ? res.status(500).send(err) : res.status(200).send(data);
  })
})

app.post('/messages/new', (req, res) => {
  const dbMessage = req.body;

  Messages.create(dbMessage, (err, data) => {
    return (err) ? res.status(500).send(err) : res.status(201).send(data);
  })

})

// listener
app.listen(port, () => {
  console.log(`Listening on localhost:${port}`)
})