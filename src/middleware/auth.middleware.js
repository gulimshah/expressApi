import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protectRoute = async (req, res, next) =>{
    try {
        const token = req.header("Authorization").replace("Baearer ","");
        if(!token) return res.status(401).json({message: "Not authorized"});
        const decoded = jwt.verify(token,process.env.JWT_SECRET);
        const user = User.findById(decoded.userId).select("-password");
        if(!user) return res.status(401).json({message: "Access Token is not valid"});
        req.user = user;
        next();
    } catch (error) {
        console.log("Authentication error:",error.message);
        res.status(401).json({message: "Token is not valid"});
    }
}
export default protectRoute;