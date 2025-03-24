import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();
// Generate Token for auth
const generateToke= (userId) =>{
    return jwt.sign({userId},process.env.JWT_SECRET,{expiresIn: "15d"});
}
// login route
router.post("/login", async (req,res)=>{
    try{
        const {email,password } = req.body;
        if (!email || !password) return res.status(400).json({message:"All fields are required"});
        const user = await User.findOne({email});
        if(!user) return res.status(400).json({message: "Invalid Credentials"});
        const isPasswordCorrect = await user.comparePassword(password);
        if(!isPasswordCorrect) return res.status(400).json({message: "Invalid Credentials"});

        const token = generateToke(user._id);
        res.status(201).json({
            token,
            user:{
                id:user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                createdAt: user.createdAt,
            }});
    }catch(error){
        console.log("Error in login route", error);
        res.status(500).json({message:"Internal Server error"});
    }
});
// register route
router.post("/register", async (req,res)=>{
    try
    {
        const {username, email, password }= req.body;
        if(!username || !email || !password )
        {
            return res.status(400).json({message:"All fields are required"});
        }
        if(password.length < 6 )
        {
            return res.status(400).json({message:"Password must be atleast 6 Character long"});
        }
        if(username.length < 3 )
        {
            return res.status(400).json({message:"Username must be atleast 3 Character long"});
        }
        const existingEmail = await User.findOne({email});
        if(existingEmail){
            return res.status(400).json({message: "Email already exists"});
        }
        const existingUsername = await User.findOne({username});
        if(existingUsername){
            return res.status(400).json({message: "Username already exists"});
        }
        const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
        const user = new User({
            email,
            username,
            password,
            profileImage,
        });
        await user.save();
        const token = generateToke(user._id);
        res.status(201).json({
            token,
            user:{
                id:user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                createdAt: user.createdAt,
            },
        });
    } catch(error){
        console.log("Error in register route", error);
        res.status(500).json({message:"Internal Server error"});
    }

});

export default router;