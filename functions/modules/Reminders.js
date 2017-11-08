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

// a class representing responses when the Home doesn't detect any input

"use strict";

const _ = require("lodash");
const Reply = require("./Reply.js");

// set up an object with the "friendly" way to describe keys and the answers found data passed in
module.exports = class Reminders {
	constructor(answersFound) {
		this.friendlyKeys = {
			diet: "diet",
			prey: "prey",
			predators: "predators",
			behavior: "behaviors",
			migrate: "migration habits",
			hibernate: "hibernation habits",
			poisonous: "poisonousness",
			endangered: "endangered species status",
			pet: "likelihood of being a pet",
			edible: "edibility",
			class: "class",
			nocturnal: "sleeping habits",
			layeggs: "egg-laying",
			friendlysizemass: "size",
			habitat: "habitat",
			comparesize: "size compared to other animals",
			bodyparts: "body parts",
			colors: "colors"
		};
		this.keyNamesArr = Object.keys(this.friendlyKeys);
		this.answersFound = answersFound;
	}

	// pick a key among the data of already found info
	pickAlreadyAnsweredKey() {
		let pick = _.sample(this.answersFound);
		let guessInfo = Object.keys(pick).map(function(key) {
			return pick[key];
		});
		return guessInfo[0];
	}

	// generate array of 3 responses based on what the player has already found
	getResponses(alreadyFound, categoriesAsked) {
		alreadyFound = alreadyFound.split(", ")[1];
		if (!_.endsWith(alreadyFound, ".")) alreadyFound = alreadyFound + ".";
		let notAsked = _.difference(this.keyNamesArr, categoriesAsked);
		let firstResponse;
		if (notAsked.length > 0) {
			let suggestion = this.friendlyKeys[_.sample(notAsked)];
			let reply = new Reply();
			reply.addDataToScript("alreadyFound", alreadyFound);
			reply.addDataToScript("suggestion", suggestion);
			firstResponse = reply.getScript("noInput_reminders");
		} else firstResponse = "You can ask for a hint.";
		let secondResponse = "Feeling stuck? If you haven't already, try asking me, 'What questions can I ask?'";
		let thirdResponse = "I’m going to go to sleep, but let’s play again soon.";
		return [firstResponse, secondResponse, thirdResponse];
	}
};
