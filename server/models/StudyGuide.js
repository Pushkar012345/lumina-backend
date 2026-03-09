const mongoose = require('mongoose');

const studyGuideSchema = new mongoose.Schema({
    topic: { type: String, required: true },
    // Mixed allows for flexible AI summary structures
    summary: mongoose.Schema.Types.Mixed, 
    flashcards: [
        {
            question: String,
            answer: String
        }
    ],
    // SATURDAY #3: Link this guide to a specific Clerk user
    userId: { 
        type: String, 
        required: true,
        index: true // Adding an index makes searching for your history much faster
    },
    quiz: Array,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudyGuide', studyGuideSchema);