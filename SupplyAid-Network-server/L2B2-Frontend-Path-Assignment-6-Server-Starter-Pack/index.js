const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        // Connect to MongoDB
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db('assignment');
        const collection = db.collection('users');
        const supplyCollection = db.collection('supplies');
        const donationCollection = db.collection('donation')

        // User Registration
        app.post('/api/v1/register', async (req, res) => {
            const { name, email, password } = req.body;

            // Check if email already exists
            const existingUser = await collection.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists'
                });
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user into the database
            await collection.insertOne({ name, email, password: hashedPassword });

            res.status(201).json({
                success: true,
                message: 'User registered successfully'
            });
        });

        // User Login
        app.post('/api/v1/login', async (req, res) => {
            const { email, password } = req.body;

            // Find user by email
            const user = await collection.findOne({ email });
            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Compare hashed password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Generate JWT token
            const token = jwt.sign({ email: user.email, name: user.name, userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.EXPIRES_IN });

            res.json({
                success: true,
                message: 'Login successful',
                token
            });
        });


        // ==============================================================
        // WRITE YOUR CODE HERE


        app.post('/api/v1/supplies', async (req, res) => {
            try {
                const { image, title, category, quantity, description } = req.body;


                const result = await supplyCollection.insertOne({ image, title, category, quantity, description });

                res.status(201).json({
                    success: true,
                    message: 'Supply created successfully',

                });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });



        // Update Supply
        app.put('/api/v1/supplies/:id', async (req, res) => {
            try {
                const { id } = req.params;
                console.log('Updating supply with ID:', id);

                const { image, title, category, quantity, description } = req.body;
                console.log('Updated fields:', { image, title, category, quantity, description });

                const updatedSupply = await supplyCollection.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    { $set: { image, title, category, quantity, description } },
                    { returnOriginal: false }
                );

                if (updatedSupply !== null && updatedSupply.value !== null) {
                    return res.status(200).json({
                        success: true,
                        message: 'Supply updated successfully',
                        supply: updatedSupply.value
                    });
                } else {

                    return res.status(404).json({ success: false, message: 'Supply not found' });
                }


            } catch (error) {
                console.error('Error updating supply:', error);
                res.status(500).json({ success: false, message: error.message });
            }
        });


        // Delete Supply
        app.delete('/api/v1/supplies/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const deletedSupply = await supplyCollection.findOneAndDelete({ _id: new ObjectId(id) });



                if (deletedSupply !== null && deletedSupply.value !== null) {
                    return res.status(200).json({
                        success: true,
                        message: 'Supply deleted successfully',
                        supply: deletedSupply.value
                    });
                } else {
                    console.log('Supply not found');
                    return res.status(404).json({ success: false, message: 'Supply not found' });
                }
            } catch (error) {
                console.error('Error deleting supply:', error);
                res.status(500).json({ success: false, message: error.message });
            }
        });





        // Get All Supply 
        app.get('/api/v1/supplies', async (req, res) => {
            try {
                const supplies = await supplyCollection.find({}).toArray();
                res.json(supplies);
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });





        // Get Supply Details
        app.get('/api/v1/supplies/:id', async (req, res) => {
            try {
                const { id } = req.params;

                const supply = await supplyCollection.findOne({ _id: new ObjectId(id) });

                if (!supply) {
                    return res.status(404).json({ success: false, message: 'Supply not found' });
                }

                res.json({ success: true, supply });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });



        app.post('/api/v1/donations', async (req, res) => {
            try {
                const { category, userId, amount } = req.body;


                const donationAmount = parseFloat(amount);


                if (isNaN(donationAmount)) {
                    throw new Error('Invalid amount');
                }


                await donationCollection.insertOne({ category, userId, amount: donationAmount });

                res.status(201).json({
                    success: true,
                    message: 'Donation created successfully',
                });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });


        app.get('/api/v1/donations/total', async (req, res) => {
            try {
                const totalDonation = await donationCollection.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalAmount: { $sum: "$amount" }
                        }
                    }
                ]).toArray();


                const totalAmount = totalDonation.length > 0 ? totalDonation[0].totalAmount : 0;
                res.json({ totalDonation: totalAmount });
            } catch (error) {


                res.status(500).json({ success: false, message: error.message });
            }
        });






        app.get('/api/v1/donations/category/:category', async (req, res) => {
            try {
                const { category } = req.params;


                const totalCategoryDonation = await donationCollection.aggregate([
                    {
                        $match: { category: category }
                    },
                    {
                        $group: {
                            _id: null,
                            totalAmount: { $sum: "$amount" }
                        }
                    }
                ]).toArray();

                res.json({ totalCategoryDonation: totalCategoryDonation.length > 0 ? totalCategoryDonation[0].totalAmount : 0 });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        app.get('/api/v1/donations', async (req, res) => {
            try {

                const allDonations = await donationCollection.find({}).toArray();


                res.json({ success: true, donations: allDonations });
            } catch (error) {

                res.status(500).json({ success: false, message: error.message });
            }
        });


        app.get('/api/v1/donations/user/:userId', async (req, res) => {
            try {
                const { userId } = req.params;


                const userDonations = await donationCollection.find({ userId: userId }).toArray();
                const totalUserDonation = userDonations.reduce((total, donation) => total + donation.amount, 0);

                res.json({ totalUserDonation });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });



        app.get('/api/v1/donations/donation-data/user/:userId', async (req, res) => {
            try {
                const { userId } = req.params;


                const userDonations = await donationCollection.aggregate([
                    { $match: { userId } },
                    { $group: { _id: "$category", totalAmount: { $sum: "$amount" } } }
                ]).toArray();


                const formattedDonations = userDonations.map(donation => ({
                    category: donation._id,
                    totalAmount: donation.totalAmount
                }));

                res.json({ success: true, userId, donations: formattedDonations });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });






        // ==============================================================


        // Start the server
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });

    } finally {
    }
}

run().catch(console.dir);

// Test route
app.get('/', (req, res) => {
    const serverStatus = {
        message: 'Server is running smoothly',
        timestamp: new Date()
    };
    res.json(serverStatus);
});