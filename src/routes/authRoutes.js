import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import {
	sendPasswordResetEmail,
	sendResetSuccessEmail,
	sendVerificationEmail,
	sendWelcomeEmail,
} from "../../mailtrap/emails.js"
import crypto from "crypto";

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
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
        const user = new User({
            email,
            username,
            password,
            profileImage,
            verificationToken,
			verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        });
        await user.save();
        const token = generateToke(user._id);
        await sendVerificationEmail(user.email, verificationToken);
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

// email verification route
router.post("/verifyEmail", async (req,res)=>{
    const { code } = req.body;
	try {
		const user = await User.findOne({
			verificationToken: code,
			verificationTokenExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
		}
		user.isVerified = true;
		user.verificationToken = undefined;
		user.verificationTokenExpiresAt = undefined;
		await user.save();
        await sendWelcomeEmail(user.email, user.name);

        const token = generateToke(user._id);

        res.status(201).json({
            success: true,
			message: "Email verified successfully",
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

// forget password route
router.post("/forgetPassword", async (req,res)=>{
    const { email } = req.body;
	try {
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}
        console.log(`Received email: ${email}`);

		// Generate reset token
		const resetToken = crypto.randomBytes(20).toString("hex");
		const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

		user.resetPasswordToken = resetToken;
		user.resetPasswordExpiresAt = resetTokenExpiresAt;

		await user.save();

		// send email
		await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);

		res.status(200).json({ success: true, message: "Password reset link sent to your email" });
	} catch (error) {
		console.log("Error in forgotPassword ", error);
		res.status(400).json({ success: false, message: error.message });
	}
});

// reset password route
router.post("/resetPassword", async (req,res)=>{
    try {
		const { token } = req.params;
		const { password } = req.body;

		const user = await User.findOne({
			resetPasswordToken: token,
			resetPasswordExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
		}

		// update password
        const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password,salt);

		user.password = hashedPassword;
		user.resetPasswordToken = undefined;
		user.resetPasswordExpiresAt = undefined;
		await user.save();

		await sendResetSuccessEmail(user.email);

		res.status(200).json({ success: true, message: "Password reset successful" });
	} catch (error) {
		console.log("Error in resetPassword ", error);
		res.status(400).json({ success: false, message: error.message });
	}
});

export default router;