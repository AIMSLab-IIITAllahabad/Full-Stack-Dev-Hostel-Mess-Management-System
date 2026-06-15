const mongoose = require("mongoose");

const mealSchema = new mongoose.Schema(
{
    hostelId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Hostel",
        required:true
    },

    mealType:{
        type:String,
        enum:["BREAKFAST","LUNCH","DINNER"],
        required:true
    },

    date:{
        type:Date,
        required:true
    },

    capacity:{
        type:Number,
        default:0
    }
},
{timestamps:true}
);

module.exports = mongoose.model("Meal", mealSchema);