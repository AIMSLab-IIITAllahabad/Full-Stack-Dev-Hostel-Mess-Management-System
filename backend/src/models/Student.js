const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
{
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    rollNumber:{
        type:String,
        unique:true,
        required:true
    },

    hostelId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Hostel",
        required:true
    },

    roomNumber:{
        type:String
    }
},
{timestamps:true}
);

module.exports = mongoose.model("Student", studentSchema);