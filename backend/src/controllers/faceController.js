const User = require("../models/User");
const {
  isValidEmbedding,
  EMBEDDING_LENGTH,
} = require("../utils/faceMatch");

const enrollFace = async (req, res) => {
  try {
    const { embedding } = req.body;

    if (!isValidEmbedding(embedding)) {
      return res.status(400).json({
        success: false,
        message: `Embedding must be an array of ${EMBEDDING_LENGTH} numbers`,
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      faceEmbedding: embedding,
      faceEnrolled: true,
    });

    res.status(200).json({
      success: true,
      message: "Face enrolled successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const getFaceStatus = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      faceEnrolled: req.user.faceEnrolled === true,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const deleteFace = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { faceEmbedding: 1 },
      faceEnrolled: false,
    });

    res.status(200).json({
      success: true,
      message: "Face data deleted",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  enrollFace,
  getFaceStatus,
  deleteFace,
};