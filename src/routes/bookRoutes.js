import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Book from "../models/Book.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protectRoute, async (req, res) => {

    try {
        const {title, caption, rating, image }= req.body;
        if(!image || !title || !caption || !rating)
        {
            return res.status(400).json({message: "Please provide all fields"});
        }
    
        const uploadResponse = await cloudinary.uploader.upload(image);
        const imageUrl = uploadResponse.secure_url;
        const newBook = new Book({
            title,
            caption,
            rating,
            image: imageUrl,
            user: req.user._id,
        });
        await newBook.save();
        res.status(201).json(newBook)
    } catch (error) {
        console.log("Error creating Book",error);
        res.status(500).json({message: error.message});
    }
});

router.get("/",protectRoute, async (req, res)=>{
    try {
        const page = req.query.page || 1;
        const limit = req.query.limit || 5;
        const skip = (page -1) * limit;
        const books = await Book.find()
        .sort({createdAt: -1})
        .limit(limit)
        .skip(skip)
        .populate("user","username profileImage");

        const totalBook = await Book.countDocuments();

        res.send({
            books,
            currentPage : page,
            totalBook,
            totalPages: Math.ceil(totalBook / limit),
        });
    } catch (error) {
        console.log("Error in getting all books",error);
        res.status(500).json({message:"Internal server error"});
    }
});

router.delete("/:id", protectRoute, async (req, res) =>{
    try {
        const book = await Book.findById(req.params.id);
        if(!book) return res.status(400).json({message: "Book not found"});
        console.log(" Book user ref is: ", book.user.toString())
        conosle.log("Req user ref is: ", req.user._id.toString());
        if(book.user.toString() !== req.user._id.toString())
        {
            return res.status(401).json({message: "Un-authorized to delete the book"});
        }
        if(book.image && book.image.includes("cloudinary"))
        {
            try {
                const publicId = book.image.split("/").pop.split(".")[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (deleteError) {
                console.log("Error deleting image from cloudinary",deleteError)
            }
        }
        await book.deleteOne();
    } catch (error) {
        console.log("Error deleting in Book", error);
        res.status(500).json({message: "Internal server error"});
    }
});

router.get("/user", protectRoute, async (req, res) =>{
    try {
        const books = await Book.find({user: req.user._id}).sort({createdAt: -1});
        res.json(books);
    } catch (error) {
        console.log("Error get user books",error);
        res.status(500).json({message: "Internal server error"});
    }
});
export default router;