import { v2 as cloudinary } from 'cloudinary';
import { log } from 'console';
import fs from "fs"

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_CLOUD_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        //fil has been uploaded successful
        console.log("file is uploaded on cloudinary", response.url)
        return response
    } catch (error) {
        //remove the locally save temporary file as the upload operation got failed
        fs.unlinkSync(localFilePath)
        return null

    }
}

cloudinary.v2.uploader.upload("https://media.istockphoto.com/id/2153573059/photo/mountain-covered-with-a-coniferous-fir-tree-forest-scenic-landscape-from-carpathian-mountains.jpg?s=1024x1024&w=is&k=20&c=hwDTriUtxDP_4A6jQKVRWTTTXLf8jim4w3w1K2dcaHU=",
    { public_id: "olympic_flag" },
    function (error, result) {
        console.log(result);

    }
    
)

export {uploadOnCloudinary}
