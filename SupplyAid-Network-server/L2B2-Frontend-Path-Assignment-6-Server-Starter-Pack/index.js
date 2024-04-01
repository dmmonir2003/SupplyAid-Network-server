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


        const db = client.db('assignment');
        const collection = db.collection('users');
        const supplyCollection = db.collection('supplies');
        const donationCollection = db.collection('donation')
        const volunteerCollection = db.collection('volunteer');
        const gratitudeCollection = db.collection('gratitude');
        const testimonialCollection = db.collection('testimonial');

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


                const { image, title, category, quantity, description } = req.body;


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


        //   donation code start ---------------------


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



        app.get('/api/v1/donations/all-donors', async (req, res) => {
            try {
                const donorData = await donationCollection.aggregate([
                    {
                        $group: {
                            _id: "$userId",
                            totalAmount: { $sum: "$amount" }
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            let: { userId: { $toObjectId: "$_id" } },
                            pipeline: [
                                { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
                                { $project: { _id: 1, name: 1, email: 1 } }
                            ],
                            as: "user"
                        }
                    },
                    {
                        $unwind: "$user"
                    },
                    {
                        $project: {
                            _id: "$user._id",
                            name: "$user.name",
                            email: "$user.email",
                            totalAmount: 1
                        }
                    },
                    {
                        $sort: { totalAmount: -1 }
                    }
                ]).toArray();

                res.json({ success: true, donors: donorData });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });


        //   donation code end ---------------------




        // volunteer  code _   start-------------------------------------

        // Volunteer Application
        app.post('/api/v1/volunteer-application', async (req, res) => {
            try {
                const { name, email, phoneNumber, address, facebookId, volunteerFor } = req.body;


                const existingVolunteer = await volunteerCollection.findOne({ email });
                if (existingVolunteer) {
                    return res.status(400).json({
                        success: false,
                        message: 'Volunteer application already exists for this email'
                    });
                }


                await volunteerCollection.insertOne({
                    name,
                    email,
                    phoneNumber,
                    address,
                    facebookId,
                    volunteerFor,
                    isApproved: false
                });

                res.status(201).json({
                    success: true,
                    message: 'Volunteer application submitted successfully'
                });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });



        // Get All Volunteer Applications
        app.get('/api/v1/volunteer-applications', async (req, res) => {
            try {
                const volunteerApplications = await volunteerCollection.find({}).toArray();
                res.json({ success: true, volunteerApplications });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // Approve Volunteer Application
        app.put('/api/v1/volunteer-applications/approve/:id', async (req, res) => {
            try {
                const { id } = req.params;

                // Validate if the ID is a valid ObjectId
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ success: false, message: 'Invalid volunteer application ID' });
                }


                const updatedApplication = await volunteerCollection.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    { $set: { isApproved: true } },
                    { returnOriginal: false }
                );

                if (updatedApplication) {
                    return res.status(200).json({
                        success: true,
                        message: 'Volunteer application approved successfully',

                    });
                } else {
                    return res.status(404).json({ success: false, message: 'Volunteer application not found' });
                }
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });



        app.delete('/api/v1/volunteer-applications/:id', async (req, res) => {
            try {
                const { id } = req.params;



                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ success: false, message: 'Invalid volunteer application ID' });
                }

                const deletedApplication = await volunteerCollection.findOneAndDelete({ _id: new ObjectId(id) });

                if (deletedApplication) {
                    return res.status(200).json({
                        success: true,
                        message: 'Volunteer application deleted successfully',

                    });
                } else {
                    return res.status(404).json({ success: false, message: 'Volunteer application not found' });
                }
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });




        // Get All Approved Volunteer Applications
        app.get('/api/v1/volunteer-applications/approved', async (req, res) => {
            try {
                const approvedVolunteerApplications = await volunteerCollection.find({ isApproved: true }).toArray();
                res.json({ success: true, approvedVolunteerApplications });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });




        // /gratitude-----------start



        app.post('/api/v1/gratitude', async (req, res) => {
            try {
                const { name, location, message, projectName, image } = req.body;
                const userGratitudeTime = new Date();

                // Insert gratitude data into MongoDB
                const result = await gratitudeCollection.insertOne({
                    name,
                    location,
                    message,
                    projectName,
                    image,
                    userGratitudeTime
                });

                res.status(201).json({
                    success: true,
                    message: 'Gratitude connection created successfully'
                });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });



        app.get('/api/v1/gratitude', async (req, res) => {
            try {
                // Query MongoDB for all gratitude entries
                const gratitudeEntries = await gratitudeCollection.find({}).toArray();

                // Respond with the gratitude entries as JSON
                res.json({
                    success: true,
                    gratitudeEntries
                });
            } catch (error) {
                // If an error occurs, respond with an error message
                res.status(500).json({
                    success: false,
                    message: 'Failed to retrieve gratitude entries',
                    error: error.message
                });
            }
        });


        //     testimonials   ----------start



        app.post('/api/v1/testimonials', async (req, res) => {
            try {
                const { name, description, image } = req.body;

                // Insert donor testimonial into the database
                await testimonialCollection.insertOne({ name, description, image });

                res.status(201).json({
                    success: true,
                    message: 'Testimonial created successfully',
                });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // Get all testimonials
        app.get('/api/v1/testimonials', async (req, res) => {
            try {
                const testimonials = await testimonialCollection.find({}).toArray();
                res.json(testimonials);
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