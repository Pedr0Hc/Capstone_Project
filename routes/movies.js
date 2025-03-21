const express = require("express");
const router = express.Router();
const Movie = require("../models/moviesTR");
const protect = require("../middlewares/auth");
const { upload } = require("../middlewares/upload");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const checkAdmin = require("../middlewares/checkAdmin");

// Route to add a new movie
router.post("/", protect, checkAdmin, upload.single("poster"), async (req, res) => {
    try {
        let { title, genre, rating, year, type } = req.body;

        if (!title || !genre || !rating || !year || !type || !req.file) {
            return res.status(400).json({ error: "All fields (title, genre, rating, year, type, poster) are required." });
        }

        if (!["movie", "series"].includes(type)) {
            return res.status(400).json({ error: "Type must be 'movie' or 'series'." });
        }

        if (typeof genre === "string") {
            genre = genre.split(",").map(g => g.trim());
        }

        const streamUpload = (file) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream((error, result) => {
                    if (result) {
                        resolve(result);
                    } else {
                        reject(error);
                    }
                });
                streamifier.createReadStream(file.buffer).pipe(stream);
            });
        };

        const result = await streamUpload(req.file); // upload to Cloudinary

        const newMovie = new Movie({
            title,
            genre,
            rating,
            year,
            type,
            poster: result.secure_url, // image URL saved in Cloudinary
        });

        await newMovie.save();

        res.status(201).json({ message: "Movie added successfully!", movie: newMovie });
    } catch (error) {
        console.error("Error adding movie:", error);
        res.status(500).json({ error: "Internal server error while adding movie." });
    }
});

// Route to list movies (with search functionality)
router.get("/", async (req, res) => {
    try {
        const { genre, type, search } = req.query; 
        let filter = {}; // empty initial filter

        if (genre) {
            filter.genre = { $in: genre.split(',') };
        }

       // Add filter for type (movie or series)
        if (type) {
            filter.type = type;
        }

        // add filter for search if "search" parameter is sent and is not empty
        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), "i"); // regular expression for case insensitive search
            filter.title = regex;
        }

        const movies = await Movie.find(filter).select("title year genre poster rating");
        res.json(movies);
    } catch (error) {
        console.error("Error fetching movies:", error);
        res.status(500).json({ error: "Error fetching movies." });
    }
});


router.get("/user/reviews", protect, async (req, res) => {
    try {
        const userId = req.userId; 

        // filter movies that have user ratings
        const movies = await Movie.find({
            "reviews.userId": userId
        });

        // maps relevant data for display
        const userReviews = movies.map((movie) => {
            const userReview = movie.reviews.find((review) => review.userId.toString() === userId);
            return {
                title: movie.title,
                poster: movie.poster,
                rating: userReview.rating
            };
        });

        res.json(userReviews);
    } catch (error) {
        console.error("Error fetching user reviews:", error);
        res.status(500).json({ error: "Error fetching reviews." });
    }
});


// Update a movie by ID
router.put("/:id",protect, checkAdmin, async (req, res) => {
    try {
        const { title, rating, genre, year, type } = req.body;

        if (type && !["movie", "series"].includes(type)) {
            return res.status(400).json({ error: "Type must be 'movie' or 'series'" });
        }

        const updatedMovie = await Movie.findByIdAndUpdate(
            req.params.id, // movie ID
            { title, rating, genre, year, type }, // Data to be updated
            { new: true } // Returns the new updated document
        );

        if (!updatedMovie) {
            return res.status(404).json({ error: "Movie or Series not found" });
        }

        res.json(updatedMovie);
    } catch (error) {
        res.status(500).json({ error: "Error updating movie" });
    }
});


// Deleting a movie by ID
router.delete("/:id", protect, checkAdmin, async (req, res) => {
    try {
        const deletedMovie = await Movie.findByIdAndDelete(req.params.id);

        if (!deletedMovie) {
            return res.status(404).json({ error: "Movie not found" });
        }

        res.json({ message: "Successfully deleted movie" });
    } catch (error) {
        res.status(500).json({ error: "Error when deleting the movie" });
    }
});


// Create or update assessment
router.post("/:id/review", protect, async (req, res) => {
    const { rating } = req.body;
    const movieId = req.params.id;
    const userId = req.userId; // the userID will be filled by the middleware when the tolken is send

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5." });
    }

    try {
        // check if the media exist
        const movie = await Movie.findById(movieId);
        if (!movie) {
            return res.status(404).json({ error: "Movie not found" });
        }

        // check if user have review
        let review = movie.reviews.find(review => review.userId.toString() === userId);

        if (review) {
            // if yes update the rview
            review.rating = rating;
        } else {
            // if not create a new
            movie.reviews.push({ userId, rating });
        }

        // recalculate the average of reviews
        const totalRatings = movie.reviews.length;
        const totalScore = movie.reviews.reduce((acc, review) => acc + review.rating, 0);
        movie.rating = totalScore / totalRatings; 

        await movie.save();

        res.status(200).json({ message: "Review added/updated successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error adding/updating review" });
    }
});

// Get info from media
router.get("/:id", async (req, res) => {
    const movieId = req.params.id;
    const userId = req.userId; // userId for logged users

    try {
        const movie = await Movie.findById(movieId);

        if (!movie) {
            return res.status(404).json({ error: "Movie not found" });
        }

        let userRating = null;
        if (userId) {
            // show logged user reviews
            const review = movie.reviews.find(review => review.userId.toString() === userId);
            if (review) {
                userRating = review.rating;
            }
        }

        // calculate percentage of reviews
        const ratingPercentages = movie.reviews.reduce((acc, review) => {
            acc[review.rating] = (acc[review.rating] || 0) + 1;
            return acc;
        }, {});

        // calculate of reviews
        const totalReviews = movie.reviews.length;
        for (let rating in ratingPercentages) {
            ratingPercentages[rating] = `${((ratingPercentages[rating] / totalReviews) * 100).toFixed(2)}%`;
        }

        // show all info
        res.json({
            ...movie.toObject(),
            userRating,  
            ratingPercentages
        });
    } catch (error) {
        res.status(500).json({ error: "Error fetching movie details" });
    }
});

const streamUpload = (file) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream((error, result) => {
            if (error) {
                reject(new Error("Cloudinary upload failed")); // Improved error message
            } else {
                resolve(result);
            }
        });
        streamifier.createReadStream(file.buffer).pipe(stream);
    });
};
module.exports = router;
