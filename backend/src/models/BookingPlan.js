const mongoose = require("mongoose");

const bookingPlanSchema = new mongoose.Schema(
{
    studentId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Student",
        required:true
    },

    startDate:{
        type:Date,
        required:true
    },

    endDate:{
        type:Date,
        required:true
    }
},
{timestamps:true}
);

module.exports = mongoose.model("BookingPlan", bookingPlanSchema);