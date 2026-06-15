const mongoose = require("mongoose");

const entryLogSchema = new mongoose.Schema(
{
    studentId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Student",
        required:true
    },

    mealId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Meal",
        required:true
    },

    verificationMethod:{
        type:String,
        enum:["FACE","QR"],
        required:true
    },

    status:{
        type:String,
        enum:["SUCCESS","FAILED"],
        default:"SUCCESS"
    },

    entryTime:{
        type:Date,
        default:Date.now
    }
},
{timestamps:true}
);

module.exports = mongoose.model("EntryLog", entryLogSchema);