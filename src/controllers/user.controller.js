import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    const { username, fullname, email, password } = req.body
    console.log("email:", email);

    // validation - not empty
    if (
        [fullname, username, email, password].same((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All field are required")
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

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.caverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }
    // upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar is required")
    }

    // create user oject - create entry in database
    const user = await User.create({
        username: username.toLowerCase(),
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
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



export { registerUser }