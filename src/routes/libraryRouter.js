const express = require("express");
const router = new express.Router();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const func = require("../functions/new");

require("../db/conn");
const Question = require("../models/questions");

router.use(express.json());
router.use(express.urlencoded({ extended: false }));

router.get("/addq", async (req, res) => {
    if (req.cookies.jwt) {
        const superUser = await func.superUser(req.cookies.jwt);
        if (!superUser) return res.render("index", {isAuthenticated: req.cookies.jwt, active: func.getActive("/"), superUser: superUser, message: "You are not authorized to add questions.", messageStatus: "Error!"});
        res.render("addq", {isAuthenticated: req.cookies.jwt, headerTitle: "Add Question", superUser: superUser, active: func.getActive("/library")});
    } else {
        res.render("login", {isAuthenticated: req.cookies.jwt, active: func.getActive("/login")});
    }
});

router.get("/library", async (req, res) => {
    if (req.cookies.jwt) {
        const superUser = await func.superUser(req.cookies.jwt);
        if (!superUser) return res.render("index", {isAuthenticated: req.cookies.jwt, active: func.getActive("/"), superUser: superUser});
        res.render("library", {isAuthenticated: req.cookies.jwt, active: func.getActive(req.path), superUser: superUser});
    } else {
        res.render("login", {isAuthenticated: req.cookies.jwt, active: func.getActive(req.path)});
    }
});

async function q_and_t(_id, topic) {
    const questions = await Question.find({topic: topic});
    // console.log(questions);
    const _title = topic.replace("-", " ").replace("and", "&").replace("-", " ").replace("-", " ");
    const title = _title.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    return {questions: questions, title: title};
}

router.get("/deleteq", async (req, res) => {
    if (req.cookies.jwt) {
        const superUser = await func.superUser(req.cookies.jwt);
        if (!req.query._id) return res.render("library", {isAuthenticated: req.cookies.jwt, active: func.getActive("/library"), superUser: superUser});
        const question = await Question.findById(req.query._id);
        let data = await q_and_t(req.query._id, req.query.topic);
        if (!question) return res.render("questions", {isAuthenticated: req.cookies.jwt, questions: data.questions, title: data.title, active: func.getActive("/library"), superUser: superUser});
        if (!superUser) return res.render("index", {isAuthenticated: req.cookies.jwt, active: func.getActive("/library"), superUser: superUser});
        if (question.author_id === jwt.verify(req.cookies.jwt, process.env.SECRET_KEY)._id) {
            await Question.deleteOne({_id: req.query._id});
            data = await q_and_t(req.query._id, req.query.topic);
            res.render("questions", {isAuthenticated: req.cookies.jwt, message: "Question deleted successfully.",
                messageStatus: "Success!", questions: data.questions, title: data.title, active: func.getActive("/library"), superUser: superUser});
        } else {
            data = await q_and_t(req.query._id, req.query.topic);
            res.render("questions", {isAuthenticated: req.cookies.jwt, message: "You are not authorized to delete this question.",
                messageStatus: "Error!", questions: data.questions, title: data.title, active: func.getActive("/library"), superUser: superUser});
        }
    } else {
        res.render("login", {isAuthenticated: req.cookies.jwt});
    }
});

router.get("/editq", async (req, res) => {
    if (req.cookies.jwt) {
        const superUser = await func.superUser(req.cookies.jwt);
        if (!superUser) return res.render("index", {isAuthenticated: req.cookies.jwt, active: func.getActive("/"), superUser: superUser});
        if (!req.query._id) return res.render("library", {isAuthenticated: req.cookies.jwt, active: func.getActive("/library"), superUser: superUser});
        const data = await q_and_t(req.query._id, req.query.topic);
        const question = await Question.findById(req.query._id);
        res.render("addq", {isAuthenticated: req.cookies.jwt, _id: req.query._id,
            title: data.title, question: question.question, answer: question.answer, topic: question.topic, headerTitle: "Update Question",
            active: func.getActive("/library"), superUser: superUser});
    } else {
        res.render("login", {isAuthenticated: req.cookies.jwt});
    }
});

router.get("/questions", async (req, res) => {
    if (req.cookies.jwt) {
        const superUser = await func.superUser(req.cookies.jwt);
        if (!superUser) return res.render("index", {isAuthenticated: req.cookies.jwt, active: func.getActive("/"), superUser: superUser});
        if (!req.query.topic) return res.render("library", {isAuthenticated: req.cookies.jwt, active: func.getActive("/library"), superUser: superUser});
        const data = await q_and_t(req.query._id, req.query.topic);
        res.render("questions", {isAuthenticated: req.cookies.jwt, questions: data.questions, title: data.title, active: func.getActive("/library"), superUser: superUser});
    } else {
        res.render("login", {isAuthenticated: req.cookies.jwt});
    }
});

router.post("/editq", async (req, res) => {
    // console.log(req.body);
    try {
        const _id = req.query._id;
        const topic = req.query.topic;
        const question = req.body.question;
        const answer = req.body.answer;
        const questionData = await Question.findById(_id);
        let data = await q_and_t(_id, topic)
        const superUser = await func.superUser(req.cookies.jwt);
        if (!questionData) return res.render("questions", {isAuthenticated: req.cookies.jwt, message: "Question not found.", messageStatus: "Error!", questions: data.questions, title: data.title,
            active: func.getActive("/library"), superUser: superUser});
        if (!superUser) return res.render("questions", {isAuthenticated: req.cookies.jwt, message: "You are not authorized to edit this question.", messageStatus: "Error!", questions: data.questions, title: data.title,
            active: func.getActive("/library"), superUser: superUser});
        if (questionData.author_id === jwt.verify(req.cookies.jwt, process.env.SECRET_KEY)._id) {
            await Question.updateOne({_id: _id}, {$set: {question: question, answer: answer}});
            let data = await q_and_t(_id, topic);
            res.render("questions", {isAuthenticated: req.cookies.jwt, message: "Question updated successfully.", messageStatus: "Success!", questions: data.questions, title: data.title,
                active: func.getActive("/library"), superUser: superUser});
        } else {
            res.render("questions", {isAuthenticated: req.cookies.jwt, message: "You are not authorized to edit this question.", messageStatus: "Error!", questions: data.questions, title: data.title,
                active: func.getActive("/library"), superUser: superUser});
        }
    } catch (error) {
        // console.log(error);
        res.status(401).send(error);
    }
});

router.post("/addq", async (req, res) => {
    // console.log(req.body);
    try {
        const superUser = await func.superUser(req.cookies.jwt);
        const topic = req.body.topic;
        const question = req.body.question;
        const answer = req.body.answer;
        const questionData = new Question({
            topic: topic,
            question: question,
            answer: answer,
            author_id: jwt.verify(req.cookies.jwt, process.env.SECRET_KEY)._id,
        });
        if (!superUser) return res.render("library", {isAuthenticated: req.cookies.jwt, message: "You are not authorized to add questions.", messageStatus: "Error!", active: func.getActive("/library"), superUser: superUser});
        await questionData.save();
        res.status(201).render("addq", {isAuthenticated: req.cookies.jwt, message: "Question added successfully.", messageStatus: "Success!", headerTitle: "Add Question", active: func.getActive("/library"), superUser: superUser});
    } catch (error) {
        // console.log(error);
        res.status(401).send(error);
    }
});

module.exports = router;