/*
Copyright 2017 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// libraries
const App = require("actions-on-google").DialogflowApp;
const functions = require("firebase-functions");
const _ = require("lodash");
const fs = require("fs");

// custom modules
const FirebaseDatabase = require("./modules/FirebaseDatabase.js");
const KnowledgeGraphQuery = require("./modules/KnowledgeGraphQuery.js");
const Reminders = require("./modules/Reminders.js");
const Comparison = require("./modules/Comparison.js");
const Reply = require("./modules/Reply.js");
const SSMLResponse = require("./modules/SSMLResponse.js");

// data
const gameData = JSON.parse(fs.readFileSync(__dirname + "/modules/data/game_data.json", "utf8"));
const profanities = JSON.parse(fs.readFileSync(__dirname + "/modules/data/profanities.json", "utf8"));

let totalQuestionsAllowed = 20;
let startingNewGame = false;

let firebaseDB = new FirebaseDatabase();
firebaseDB.initialize();

// webhook
exports.mysteryAnimal = functions.https.onRequest((request, response) => {
	const app = new App({ request, response });

	// called when the player starts the app
	const welcomeIntent = app => {
		startingNewGame = true;
		newRound(app);
	};

	// called to start a new round
	const newRound = app => {
		app.data.currentRound++;
		let remainingAnimal, alreadyPlayedNums, currentRound;
		let reply = new Reply();

		// if we're starting a new game, start the data from scratch
		// if we're just starting a new round, get the data saved in app.data
		if (startingNewGame) {
			alreadyPlayedNums = [];
			currentRound = 1;
		} else {
			currentRound = app.data.currentRound;
			alreadyPlayedNums = app.data.alreadyPlayedNums;
			wonRound = app.data.wonRound;
		}

		// the animal numbers range from 0 to 39
		let remainingAnimals = _.pullAll(_.range(40), alreadyPlayedNums);
		let newAnimalNum = _.sample(remainingAnimals); // pick a new random animal start start
		let newAnimal = gameData.gameData[newAnimalNum].animal;

		// pass newRound into firebase
		firebaseDB.newRound(request.body.sessionId, currentRound, newAnimal);

		// save data in the built in Actions on Google app.data object
		app.data = {
			categoriesAsked: [],
			currentRound: currentRound,
			roundOver: false,
			currentAnswer: "neither",
			alreadyPlayedNums: alreadyPlayedNums,
			answersFound: [],
			gotHint: false,
			questionsAskedNum: 0,
			questionsAsked: [],
			animalNum: newAnimalNum
		};

		let say = startingNewGame ? reply.getScript("intro") : reply.getScript("newRound");
		let ssml = new SSMLResponse("intro_intro", say);

		// add the intro sound after the first sentence is spoken on welcome
		let firstPart = say.split(".")[0] + ".";
		let secondPart = say.replace(firstPart, "");
		let introScript = ssml.twoParts(firstPart, secondPart);
		app.ask(introScript, noInput(app));
		startingNewGame = false;
	};

	// called when a normal question intent we can handle is triggered
	// for example, when a player asks about the animal's size, or diet, or habitat
	const findInfo = app => {
		let sayRemaining = countRemaining(app); // check how many questions are left and add special responses accordingly
		let correctData = gameData.gameData[app.data.animalNum][app.data.key]; // finds the correct info for the question asked
		let reply = new Reply(); // make a new Reply
		let result = reply.checkGuess(correctData, app.data.guess, app.data.answertype); // check the guess against the correct data
		let soundType;

		// depending on the response, set the current answer type and the sound type
		if (result == "response_true") {
			app.data.currentAnswer = "yes";
			soundType = "gameplay_yesA";
		} else if (result == "response_false") {
			app.data.currentAnswer = "no";
			soundType = "gameplay_noA";
		} else if (result == "unknown") {
			unknownIntent(app);
			return;
		} else {
			app.data.currentAnswer = "neither";
			soundType = "gameplay_idleResponse";
		}

		let say = reply.getResponse(app.data.key, app.data.guess, result) + sayRemaining; // get response based on result
		let ssml = new SSMLResponse(soundType, say); // add the sound effects and the response text in to get an SSML formatted response
		firebaseDB.save(request.body.sessionId, app.data.currentRound, app.getRawInput(), say, app.data.questionsAskedNum, app.data.roundOver);

		// save the question asked info to be used in noInput()
		let obj = {};
		obj[app.data.questionsAskedNum] = { guess: app.data.guess, result: result, key: app.data.key };
		app.data.answersFound.push(obj);
		app.data.categoriesAsked.push(app.data.key);

		app.ask(ssml.response, noInput(app));
	};

	// called when the player correctly guesses the animal OR runs out of questions
	const endRound = (app, wonRound) => {
		app.data.alreadyPlayedNums.push(app.data.animalNum);
		app.data.wonRound = wonRound;

		let reply = new Reply();
		let correctAnimal = gameData.gameData[app.data.animalNum].animal;
		let questionsAskedString = app.data.questionsAskedNum == 1 ? "1 question" : app.data.questionsAskedNum.toString() + " questions";

		reply.addDataToScript("animal", correctAnimal);
		reply.addDataToScript("questionsAskedString", questionsAskedString);
		let say, soundType;
		if (app.data.roundOver) {
			say = reply.getScript("askPlayAgain");
			soundType = "gameplay_idleResponse";
		} else if (wonRound) {
			say = reply.getScript("win");
			soundType = "gameplay_correctGuess";
		} else {
			say = reply.getScript("lose");
			soundType = "end_lose";
		}

		firebaseDB.save(request.body.sessionId, app.data.currentRound, app.getRawInput(), say, app.data.questionsAskedNum, app.data.roundOver);
		app.data.roundOver = true;
		firebaseDB.endRound(request.body.sessionId, app.data.currentRound, app.data.questionsAskedNum, wonRound);
		let ssml = new SSMLResponse(soundType, say);
		app.ask(ssml.response, ["Let me know if you want to play again.", "Hello? Do you wanna play again?", "Okay, bye!"]);
		return;
	};

	// called when any of the "misc" intents are triggered
	const miscQuestions = app => {
		let sayRemaining = countRemaining(app);
		let reply = new Reply();
		reply.addDataToScript("guess", app.data.guess);
		let say = reply.getScript(app.data.key) + sayRemaining;
		let ssml = new SSMLResponse("gameplay_idleResponse", say);
		app.data.currentAnswer = "neither";
		firebaseDB.save(request.body.sessionId, app.data.currentRound, app.getRawInput(), say, app.data.questionsAskedNum, app.data.roundOver);

		app.ask(ssml.response, noInput(app));
	};

	// called when the player asks for a hint and triggers the hint intent
	const hint = app => {
		let sayRemaining = countRemaining(app);
		let reply = new Reply();
		let say;
		let hint = gameData.gameData[app.data.animalNum].hints;
		say = app.data.gotHint ? reply.getScript("noMoreHints") : reply.getScript("giveHint") + hint;
		say += sayRemaining;
		let ssml = new SSMLResponse("gameplay_idleResponse", say);
		firebaseDB.save(request.body.sessionId, app.data.currentRound, app.getRawInput(), say, app.data.questionsAskedNum, app.data.roundOver);
		app.data.currentAnswer = "neither";
		app.data.gotHint = true;

		app.ask(ssml.response, noInput(app));
	};

	// called when player asks if the animal is bigger or small than another animal
	const compare = app => {
		let sayRemaining = countRemaining(app);
		if (!app.data.compareanimal) {
			unknownIntent(app);
			return;
		}
		let gameAnimalMass = gameData.gameData[app.data.animalNum].adultweightgrams;
		// call the Comparison class to compare the two sizes of the animals
		let comparison = new Comparison(app.data.compareanimal, gameData.gameData[app.data.animalNum].animal, gameAnimalMass, app.data.compareword);
		let result = comparison.compare();
		let guess = app.data.compareword + " a " + app.data.compareanimal;
		let reply = new Reply();
		let say = reply.getResponse("comparesize", guess, result) + sayRemaining; //FIXME

		// based on the results, play different sounds and give different answers
		if (result == "response_true") {
			app.data.currentAnswer = "yes";
			soundType = "gameplay_yesA";
		} else if (result == "response_false") {
			app.data.currentAnswer = "no";
			soundType = "gameplay_noA";
		} else if (result == "unknown") {
			unknownIntent(app);
			return;
		} else {
			app.data.currentAnswer = "neither";
			soundType = "gameplay_idleResponse";
		}
		let ssml = new SSMLResponse(soundType, say);
		firebaseDB.save(request.body.sessionId, app.data.currentRound, app.getRawInput(), say, app.data.questionsAskedNum, app.data.roundOver);

		app.ask(ssml.response, noInput(app));
	};

	// called when a player asks about two things at once
	const comboQuestion = app => {
		let sayRemaining = countRemaining(app);
		let keys = ["comboBody_parts", "comboSize", "comboColor", "comboFeatures"];
		let askedKeys = [];
		keys.forEach(function(key) {
			if (app.data[key].length > 0)
				askedKeys.push(
					key
						.replace("combo", "")
						.replace("_", "")
						.toLowerCase()
				);
		});
		let say = "You asked, " + app.getRawInput() + ", try asking about my " + askedKeys.join(" or ") + " one at a time." + sayRemaining;
		app.data.currentAnswer = "neither";
		let ssml = new SSMLResponse("gameplay_idleResponse", say);
		firebaseDB.save(request.body.sessionId, app.data.currentRound, app.getRawInput(), say, app.data.questionsAskedNum, app.data.roundOver);

		app.ask(ssml.response, noInput(app));
	};

	// called when the player tries to guess what the animal is
	const guessAnimal = app => {
		let sayRemaining = countRemaining(app);
		let correctAnimal = gameData.gameData[app.data.animalNum].animal; // finds the correct animal
		let say;

		// if player guesses the animal correctly, end round
		// otherwise, save the data and continue the game
		if (correctAnimal == app.data.guess) {
			app.data.currentAnswer = "guessedCorrect";
			endRound(app, true);
		} else {
			app.data.currentAnswer = "guessedWrong";
			let sayRemaiing = countRemaining(app);
			let reply = new Reply();
			reply.addDataToScript("guess", app.data.guess);
			let say = reply.getScript("incorrectGuess") + sayRemaining;
			firebaseDB.save(request.body.sessionId, app.data.currentRound, app.getRawInput(), say, app.data.questionsAskedNum, app.data.roundOver);
			let ssml = new SSMLResponse("gameplay_missedGuess", say);
			app.ask(ssml.response, noInput(app));
		}
	};

	// used to count how many questions the player has left in the game
	const countRemaining = app => {
		if (app.data.roundOver) {
			askForRestart(app);
		}
		if (app.data.questionsAskedNum < 20) app.data.questionsAskedNum++;
		let remaining = totalQuestionsAllowed - app.data.questionsAskedNum;
		if (remaining === 0) {
			endRound(app, false);
		} else if (remaining == 15 || remaining == 10 || remaining == 5 || remaining == 1) {
			let remainingKey = "remaining" + remaining;
			let reply = new Reply();
			return reply.getScript(remainingKey);
		} else return "";
	};

	// called when player asks how many questions are left
	const askQuestionsLeft = app => {
		if (app.data.questionsAskedNum < 20) app.data.questionsAskedNum++;
		let remaining = totalQuestionsAllowed - app.data.questionsAskedNum;
		let reply = new Reply();
		reply.addDataToScript("remaining", remaining.toString());
		let say = reply.getScript("questionsLeft");
		firebaseDB.save(request.body.sessionId, app.data.currentRound, app.getRawInput(), say, app.data.questionsAskedNum, app.data.roundOver);
		app.data.currentAnswer = "neither";
		let ssml = new SSMLResponse("gameplay_idleResponse", say);
		app.ask(ssml.response, noInput(app));
	};


	// called to override normal responses when the round is over
	const askForRestart = app => {
		let reply = new Reply();
		let say = reply.getScript("askPlayAgain");
		let soundType = "gameplay_idleResponse";
		let ssml = new SSMLResponse(soundType, say);
		firebaseDB.save(request.body.sessionId, app.data.currentRound, app.getRawInput(), say, app.data.questionsAskedNum, app.data.roundOver);
		app.ask(ssml.response, ["Let me know if you want to play again.", "Hello? Do you wanna play again?", "Okay, bye!"]);
	};


	// called when Dialogflow doesn't understand the player's questions
	const unknownIntent = app => {
		let sayRemaining = countRemaining(app);
		app.data.currentAnswer = "neither";
		let reply = new Reply();
		let say;

		// checks Knowledge Graph to see if we can find info about the thing the player asked about
		let knowledgeGraphQuery = new KnowledgeGraphQuery();
		knowledgeGraphQuery.checkKnowledgeGraph(app.getRawInput()).then(function(KGResponse) {
			if (!KGResponse) {
				let dontknow = reply.getScript("dontknows");
				reply.addDataToScript("dontKnow", dontknow);
				reply.addDataToScript("input", app.getRawInput());
				let split = app.getRawInput().split(" ");
				for (let word of split) {
					if (profanities.badwords.includes(word.toLowerCase()) || app.getRawInput().includes("*")) {
						say = reply.getScript("dontknow_norepeat");
					} else {
						say = reply.getScript("dontknow_repeat");
					}
				}
			} else {
				reply.addDataToScript("description", KGResponse.description);
				reply.addDataToScript("question", app.getRawInput());
				say = reply.getScript(KGResponse.key);
			}
			say += sayRemaining;
			firebaseDB.save(request.body.sessionId, app.data.currentRound, app.getRawInput(), say, app.data.questionsAskedNum, app.data.roundOver);
			let ssml = new SSMLResponse("gameplay_idleResponse", say);
			app.ask(ssml.response, noInput(app));
		});
	};

	// called when the player asks for what they already know
	const remindMe = app => {
		let sayRemaining = countRemaining(app);
		let say;
		if (app.data.answersFound.length === 0) {
			let reply = new Reply();
			say = reply.getScript("MISC_stuck");
		} else {
			let reminder = getReminder(app);
			say = reminder[0] + sayRemaining;
		}
		let ssml = new SSMLResponse("gameplay_idleResponse", say);
		app.data.currentAnswer = "neither";
		firebaseDB.save(request.body.sessionId, app.data.currentRound, app.getRawInput(), say, app.data.questionsAskedNum, app.data.roundOver);

		app.ask(ssml.response, noInput(app));
	};

	// called when the Assistant detects no input for a certain number of seconds
	const noInput = app => {
		if (app.data.answersFound.length === 0) {
			let reply = new Reply();
			return reply.getRawScriptArray("noInput_noInfoFound");
		} else if (app.data.questionsAskedNum == 19) {
			let reply = new Reply();
			return reply.getRawScriptArray("noInput_QuestionTwenty");
		} else {
			return getReminder(app);
		}
	};

	// used to find what the player already knows
	const getReminder = app => {
		let reminder = new Reminders(app.data.answersFound);
		let guessInfo = reminder.pickAlreadyAnsweredKey();
		let reply = new Reply();

		let alreadyFound = reply.getResponse(guessInfo.key, guessInfo.guess, guessInfo.result);
		return reminder.getResponses(alreadyFound, app.data.categoriesAsked);
	};


	// quit
	const quit = app => {
		firebaseDB.endRound(request.body.sessionId, app.data.currentRound, app.data.questionsAskedNum, false);
		app.tell("Thanks for playing, bye!");
	};

	// map of functions to Dialogflow actions
	let actionMap = new Map();
	actionMap.set("input.welcome", welcomeIntent);
	actionMap.set("new_round", newRound);
	actionMap.set("restart", newRound);
	actionMap.set("input.unknown", unknownIntent);
	actionMap.set("find_info", findInfo);
	actionMap.set("remind_me", remindMe);
	actionMap.set("misc_questions", miscQuestions);
	actionMap.set("combo", comboQuestion);
	actionMap.set("compare_size", compare);
	actionMap.set("guess_animal", guessAnimal);
	actionMap.set("get_hint", hint);
	actionMap.set("ask_questions_left", askQuestionsLeft);
	actionMap.set("quit", quit);
	app.handleRequest(actionMap);
});
