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

// a class representing the Firebase Database

"use strict";

const serviceAccount = require("../firebase_service_account_key.json");
const admin = require("firebase-admin");
const config = require("./config.json"); // bring your own config

// set up firebase config
// TODO: remove databaseurl
module.exports = class FirebaseDatabase {
	constructor() {
		this.config = {
			credential: admin.credential.cert(serviceAccount),
			databaseURL: config.FB_DATABASE_URL
		};
	}

	// if firebase is not already initialized, initialize it
	// create a "games" ref and set roundsWon to 0
	initialize() {
		if (!admin.apps.length) {
			admin.initializeApp(this.config);
		}
		this.ref = admin.database().ref();
		this.gamesDataRef = this.ref.child("games");
	}

	// create a new ref when a new round begins and save data
	newRound(sessionId, currentRound, newAnimal) {
		this.currentGameRef = this.gamesDataRef.child(sessionId);
		this.currentRoundRef = this.currentGameRef.child("ROUND " + currentRound);
		this.currentRoundRef.set({
			questionsAskedNum: 0,
			animal: newAnimal
		});
	}

	// save questions and responses during gameplay
	save(sessionId, currentRound, input, response, currentQuestionsAskedNum, roundOver) {
		if (!roundOver) {
			this.currentGameRef = this.gamesDataRef.child(sessionId);
			this.currentRoundRef = this.currentGameRef.child("ROUND " + currentRound);
			this.questions = this.currentRoundRef.child("questions");
			this.questions.push({ rawInput: input, response: response });
			this.currentRoundRef.update({ questionsAskedNum: currentQuestionsAskedNum });
		}
	}

	// update refs when a round ends
	endRound(sessionId, currentRound, currentQuestionsAskedNum, won) {
		this.currentGameRef = this.gamesDataRef.child(sessionId);
		this.currentRoundRef = this.currentGameRef.child("ROUND " + currentRound);
		this.currentRoundRef.update({
			wonRound: won,
			questionsAskedNum: currentQuestionsAskedNum
		});
	}
};
