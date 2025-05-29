import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


//Generates a new pair of access and refresh tokens for the authenticated user.
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}
// Registers a new user in the system.
const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    const { username, fullName, email, password } = req.body;
    console.log();

    // Validation - check if any field is empty

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }


    // check if user already exists: username , email
    const existedUserByUsername = await User.findOne({ username });
    if (existedUserByUsername) {
        throw new ApiError(409, "This username already exists");
    }

    const existedUserByEmail = await User.findOne({ email });
    if (existedUserByEmail) {
        throw new ApiError(409, "This email already exists");
    }
    console.log(req.files);

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    console.log(avatarLocalPath);


    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }
    // upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    console.log(avatar);

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar is required")
    }

    // create user oject - create entry in database
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // remove password and refresh token field from response
    const createUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // check for user creation
    if (!createUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }
    // return res
    return res.status(201).json(
        new ApiResponse(200, createUser, "user register Successfully")
    )

})
// Logs in an existing user
const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    const { email, username, password } = req.body
    console.log(password);


    // check valid email or username
    if (!username && !email) {
        throw new ApiError(400, "username or password is required")
    }
    //find the user
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User dose not exist")
    }
    // check valid password
    const isPasswordValid = await user.isPasswordCorrect(password)
    console.log(isPasswordValid);


    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    // create access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // send cookie
    const options = {
        httpOnly: true,
        secure: true
    }
    // send response
    return res.
        status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged In Successfully"
            )
        )
})
// Logs out the currently authenticated user
const logoutUser = asyncHandler(async (req, res) => {
    await User.findOneAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }

    )

    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out"))
})
//Generates a new access token using a valid refresh token.
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, " unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.ACCESS_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, " Invalid Refresh Token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, " Refresh Token is Expired")
        }

        const options = {
            httpOnly: true,
            secure: true
        }
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                200,
                { accessToken, refreshToken: newRefreshToken },
                "Access Token Refreshed"
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}