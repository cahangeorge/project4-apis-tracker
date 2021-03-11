const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());


mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on('connected', () => {
  console.log('connected');
  console.log(mongoose.connection.readyState);
});




let exerciseSchema = new mongoose.Schema({
  userId: String,
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: Date
});
let Session = mongoose.model('Session', exerciseSchema);



let clientSchema = new mongoose.Schema({
  username: {type: String, required: true}, 
  _id: { type: String, required: true },
  log: [exerciseSchema]
});
let Client = mongoose.model('Client', clientSchema);




app.post('/api/exercise/new-user', (req, res) => {
  let user = req.body.username;
  let generateID = mongoose.Types.ObjectId();

  Client.create({
    username: user,
    _id: generateID
  });

  res.json({
    username: user,
    _id: generateID
  });
});

app.get('/api/exercise/users', (req, res) => {
  Client.find({}, (err, result) => {
    if(!err){
      res.json(result);
    }
  });
});



app.post('/api/exercise/add', (req, res) => {
  
  let newSession = new Session({
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date
  });

  if(newSession.date === ''){
    newSession.date = new Date().toISOString().substring(0, 10);
  }

  Client.findByIdAndUpdate(req.body.userId, { $push: {log: newSession} }, {new: true}, (err, update) => {
    if(!err){
      let responseObject = {};
      responseObject['_id'] = update._id;
      responseObject['username'] = update.username;
      responseObject['date'] = new Date(newSession.date).toDateString();
      responseObject['duration'] = newSession.duration;
      responseObject['description'] = newSession.description;

      res.json(responseObject);

    }
  });

  
});


app.get('/api/exercise/log', (req, res) => {
  let { userId, from, to, limit } = req.query;

  Client.findById(userId, (error, result) => {
    if(!error){
      let resObject = result;
      
      if(from || to){
        let fromDate = new Date(0);
        let toDate = new Date();

        if(from){
          fromDate = new Date(from);
        }
        if(to){
          toDate = new Date(to);
        }

        fromDate = fromDate.getTime();
        toDate = toDate.getTime();

        resObject.log = resObject.log.filter((session) => {
          let sessionDate = new Date(session.date).getTime();

          return sessionDate >= fromDate && sessionDate <= toDate;
        });
      }

      if(req.query.limit){
        resObject.log = resObject.log.slice(0, req.query.limit)
      }
      resObject = resObject.toJSON()
      resObject['count'] = result.log.length
      res.json(resObject)
    }
  })
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
