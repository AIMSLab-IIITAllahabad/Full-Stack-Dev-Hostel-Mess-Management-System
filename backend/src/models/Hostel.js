
const mongoose = require("mongoose");

const hostelSchema = new mongoose.Schema(
{
    name:{
        type:String,
        required:true,
        unique:true
    },

    capacity:{
        type:Number,
        required:true
    }
},
{
    timestamps:true
}
);

module.exports = mongoose.model("Hostel", hostelSchema);