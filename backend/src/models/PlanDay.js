const mongoose = require("mongoose");

const planDaySchema = new mongoose.Schema(
{
    bookingPlanId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"BookingPlan",
        required:true
    },

    date:{
        type:Date,
        required:true
    },

    selectedHostelId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Hostel",
        required:true
    },

    attendanceStatus:{
        type:String,
        enum:["PRESENT","ABSENT"],
        default:"PRESENT"
    },

    lastAbsenceUpdate:{
        type:Date
    }
},
{timestamps:true}
);

module.exports = mongoose.model("PlanDay", planDaySchema);