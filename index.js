const express = require('express');
const cors = require('cors');
const app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
  const users = tourCollection.collection('users')
  const stories = tourCollection.collection('stories')
  const payments = tourCollection.collection('payments')
  const applications = tourCollection.collection('applications')



  // Middlewares
  const verifyToken = (req, res, next) => {
   console.log(req.headers);
   if (!req.headers.authorization) {
    return res.status(401).send({ message: 'unauthorized access' })
   }
   const token = req.headers.authorization.split(' ')[1]
   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
     return res.status(401).send({ message: 'unauthorized access' })
    }
    req.decoded = decoded
    next()
   })
  }


  // use verify admin after verifyToken
  const verifyAdmin = async (req, res, next) => {
   const email = req.decoded.email;
   const query = { email: email };
   const user = await users.findOne(query);
   const isAdmin = user?.role === 'admin';
   if (!isAdmin) {
    return res.status(403).send({ message: 'forbidden access' });
   }
   next();
  }

  // use verify admin after verifyToken
  const verifyGuide = async (req, res, next) => {
   const email = req.decoded.email;
   const query = { email: email };
   const user = await users.findOne(query);
   const isGuide = user?.role === 'guide';
   if (!isGuide) {
    return res.status(403).send({ message: 'forbidden access' });
   }
   next();
  }

  // JWT API
  app.post('/jwt', async (req, res) => {
   const user = req.body
   console.log("User Info Received:", user);
   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '1h'
   })
   res.send({ token })
  })

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
  // Payments API
  // payment intent
  app.post('/create-payment-intent', async (req, res) => {
   const { price } = req.body;
   const amount = parseInt(price * 100);
   console.log(amount, 'amount inside the intent')

   const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types: ['card']
   });

   res.send({
    clientSecret: paymentIntent.client_secret
   })
  });

  app.post('/payments', async (req, res) => {
   const payment = req.body
   const id = payment.bookingId
   const query = { _id: new ObjectId(id) }
   const updatedDoc = {
    $set: {
     status: 'in-review'
    }
   }
   const paymentResult = await payments.insertOne(payment)
   const updateResult = await bookings.updateOne(query, updatedDoc)
   res.send({ paymentResult, updateResult })
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

  app.get('/bookings', async (req, res) => {
   const email = req.query.email
   const query = { touristEmail: email }
   const result = await bookings.find(query).toArray()
   res.send(result)
  })
  app.get('/bookings/assigned', async (req, res) => {
   const email = req.query.email
   const query = { guideEmail: email }
   const result = await bookings.find(query).toArray()
   res.send(result)
  })
  app.patch('/bookings/assigned/:id', async (req, res) => {
   const id = req.params.id
   const { action } = req.body;
   const filter = { _id: new ObjectId(id) }
   const updatedDoc = {
    $set: {
     status: action === 'accept' ? 'Accepted' : action === 'reject' ? 'Rejected' : null,
    },
   };
   const result = await bookings.updateOne(filter, updatedDoc);
   res.send(result)
  })

  app.patch('/bookings/:id', async (req, res) => {
   const id = req.params.id
   const query = { _id: new ObjectId(id) }
   const updateDoc = {
    $unset: {
     tripTitle: "", // Remove the 'tripTitle' field
     touristName: "" // Remove the 'touristName' field
    }
   };
   const result = await bookings.updateOne(query, updateDoc)
   res.send(result)
  })

  // Applications API
  app.post("/applications", async (req, res) => {
   const application = req.body
   const result = await applications.insertOne(application)
   res.send(result)
  })
  // Stories API
  app.post('/stories', async (req, res) => {
   const story = req.body
   const result = await stories.insertOne(story)
   res.send(result)
  })


  app.get('/stories-home', async (req, res) => {
   const cursor = stories.aggregate([{ $sample: { size: 4 } }])
   const result = await cursor.toArray()
   res.send(result)
  })

  app.get('/stories', async (req, res) => {
   const cursor = stories.find()
   const result = await cursor.toArray()
   res.send(result)
  })


  app.get('/stories/:email', verifyToken, async (req, res) => {
   const email = req.params.email
   const query = { storyTeller: email }
   const result = await stories.find(query).toArray()
   res.send(result)
  })

  app.patch('/stories/:id', verifyToken, async (req, res) => {
   const id = req.params.id;
   const { pullImage, pushImage } = req.body;
   const filter = { _id: new ObjectId(id) };
   try {
    // Initialize the update object
    const update = {};

    // Check if images to remove are provided
    if (pullImage) {
     update.$pull = { images: pullImage }; // Add $pull operation to the update object
    }

    // Check if images to add are provided
    if (pushImage) {
     update.$push = { images: pushImage }; // Add $push operation to the update object
    }

    // Perform the update
    const result = await stories.updateOne(filter, update);
    res.send({ success: true, result });
   } catch (error) {
    console.error("Error updating story:", error);
    res.status(500).send({ success: false, message: "Failed to update story." });
   }
  });


  app.delete('/stories/:id', verifyToken, async (req, res) => {
   const id = req.params.id
   const query = { _id: new ObjectId(id) }
   const result = await stories.deleteOne(query)
   res.send(result)
  })
  // Users API
  app.post('/users', async (req, res) => {
   const user = req.body
   const query = { email: user.email }
   const existingUser = await users.findOne(query)
   if (existingUser) {
    return res.send({ message: 'user already exist', insertedId: null })
   }
   const result = await users.insertOne(user)
   res.send(result)
  })

  // Get Admin
  app.get('/users/admin/:email', verifyToken, async (req, res) => {
   const email = req.params.email;

   if (email !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' })
   }

   const query = { email: email };
   const user = await users.findOne(query);
   let admin = false;
   if (user) {
    admin = user?.role === 'admin';
   }
   res.send({ admin });
  })
  // Get Guide

  app.get('/users/guide/:email', verifyToken, async (req, res) => {
   const email = req.params.email;

   if (email !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' })
   }

   const query = { email: email };
   const user = await users.findOne(query);
   let guide = false;
   if (user) {
    guide = user?.role === 'guide';
   }
   res.send({ guide });
  })

  app.get('/users/:email', async (req, res) => {
   const email = req.params.email
   const query = { email: email }
   const result = await users.findOne(query)
   res.send(result)
  })
  app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
   const cursor = users.find()
   // console.log(req.headers);
   const result = await cursor.toArray()
   res.send(result)
  })
  // Make admin
  app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
   const id = req.params.id
   const filter = { _id: new ObjectId(id) }
   const updatedDoc = {
    $set: {
     role: 'admin'
    }
   }
   const result = await users.updateOne(filter, updatedDoc)
   res.send(result)
  })

  // Make guide
  app.patch('/users/guide/:id', verifyToken, verifyAdmin, async (req, res) => {
   const id = req.params.id
   const filter = { _id: new ObjectId(id) }
   const updatedDoc = {
    $set: {
     role: 'guide'
    }
   }
   const result = await users.updateOne(filter, updatedDoc)
   res.send(result)
  })

  app.get('/admin-stats', async (req, res) => {
   try {
    const usersCount = await users.estimatedDocumentCount();
    const packagesCount = await packages.estimatedDocumentCount();
    const guidesCount = await guides.estimatedDocumentCount();
    const bookingsCount = await bookings.estimatedDocumentCount();
    const storiesCount = await stories.estimatedDocumentCount();
    const applicationsCount = await applications.estimatedDocumentCount();

    // Ensure the `price` field exists in the payments collection
    const result = await payments.aggregate([
     {
      $addFields: {
       numericPrice: { $toDouble: "$price" }, // Converts `price` to a number
      },
     },
     {
      $group: {
       _id: null,
       totalRevenue: {
        $sum: { $ifNull: ["$numericPrice", 0] }, // Aggregate numeric values
       },
      },
     },
    ]).toArray();

    const totalRevenue = result.length > 0 ? result[0].totalRevenue : 0;

    res.send({
     users: usersCount,
     packages: packagesCount,
     guides: guidesCount,
     bookings: bookingsCount,
     stories: storiesCount,
     applications: applicationsCount,
     revenue: totalRevenue,
    });
   } catch (error) {
    console.error("Error in /admin-stats API:", error);
    res.status(500).send({ message: "An error occurred while fetching stats", error });
   }
  });


  app.patch('/users/:id', verifyToken, async (req, res) => {
   const id = req.params.id
   const updatedProfileData = req.body;
   const filter = { _id: new ObjectId(id) }
   const update = {
    $set: {
     name: updatedProfileData.name,
     photo: updatedProfileData.photo
    }
   };
   const result = await users.updateOne(filter, update);
   res.send(result)
  })
  app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
   const id = req.params.id
   const query = { _id: new ObjectId(id) }
   const result = await users.deleteOne(query)
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