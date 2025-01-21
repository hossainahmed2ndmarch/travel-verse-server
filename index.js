const express = require('express');
const cors = require('cors');
const app = express()
require('dotenv').config()

const port = process.env.PORT || 5000


app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.c6qkm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
 serverApi: {
  version: ServerApiVersion.v1,
  strict: true,
  deprecationErrors: true,
 }
});

async function run() {
 try {
  // Connect the client to the server	(optional starting in v4.7)
  await client.connect();
  const tourCollection = client.db('travelDB')
  const packages = tourCollection.collection('packages')
  const guides = tourCollection.collection('guides')
  const bookings = tourCollection.collection('bookings')

  // Packages API
  app.get('/packages-home', async (req, res) => {
   const cursor = packages.aggregate([{ $sample: { size: 3 } }])
   const result = await cursor.toArray()
   res.send(result)
  })

  app.get('/packages', async (req, res) => {
   const cursor = packages.find()
   const result = await cursor.toArray()
   res.send(result)
  })

  app.get('/packages/:id', async (req, res) => {
   const id = req.params.id
   const package = { _id: new ObjectId(id) }
   const result = await packages.findOne(package)
   res.send(result)
  })

  // Guides API
  app.get('/guides', async (req, res) => {
   const cursor = guides.find()
   const result = await cursor.toArray()
   res.send(result)
  })

  app.get('/guides-home', async (req, res) => {
   const cursor = guides.aggregate([{ $sample: { size: 6 } }])
   const result = await cursor.toArray()
   res.send(result)
  })
  app.get('/guides/:id', async (req, res) => {
   const id = req.params.id
   const guide = { _id: new ObjectId(id) }
   const result = await guides.findOne(guide)
   res.send(result)
  })

  // Bookings API
  app.post('/bookings', async (req, res) => {
   const booking = req.body
   const result = await bookings.insertOne(booking)
   res.send(result)
  })
  // Send a ping to confirm a successful connection
  await client.db("admin").command({ ping: 1 });
  console.log("Pinged your deployment. You successfully connected to MongoDB!");
 } finally {
  // Ensures that the client will close when you finish/error
  // await client.close();
 }
}
run().catch(console.dir);


app.get('/', (req, res) => {
 res.send('TravelVerse is rounding')
})

app.listen(port, () => {
 console.log(`TravelVerse is rounding on ${port}`);
})