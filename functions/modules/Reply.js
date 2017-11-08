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

// a class representing replies from the Mystery Animal

"use strict";

const fs = require("fs");
const tracery = require("tracery-grammar");

// sets up the response data
module.exports = class Reply {
	constructor() {
		this.responseData = JSON.parse(fs.readFileSync(__dirname + "/data/responses.json", "utf8"));
	}

	// adds a variable to be used by Tracery
	addDataToScript(key, value) {
		this.responseData.scripts[key] = value;
	}

	// gets a script based on an event, e.g. a win/lose condition
	getScript(key) {
		let currentObj = this.responseData.scripts;
		let grammar = tracery.createGrammar(currentObj);
		grammar.addModifiers(tracery.baseEngModifiers);
		return grammar.flatten("#" + key + "#");
	}

	// checks whether the player's guess is correct or not based on the type of question they asked
	checkGuess(correctData, guess, answerType) {
		if (!guess) return "unknown";
		let result;
		switch (answerType) {
			case "count":
			case "specialcategories":
				result = guess == correctData ? "response_true" : "response_false";
				break;
			case "yesno":
				result = correctData;
				break;
			case "specialinfo":
			case "match":
				result = correctData.indexOf(guess) !== -1 ? "response_true" : "response_false";
				break;
			case "countries":
				if (correctData == "COMMONLY FOUND") result = "response_possible";
				else result = correctData.indexOf(guess) !== -1 ? "response_true" : "response_false";
				break;
			case "comparelegsnumber":
				let split = guess.split(" ");
				if (split.length != 3) {
					result = "unknown";
				} else {
					let compareWord = split[0];
					let compareNum = parseInt(split[2]);

					if (correctData > compareNum) {
						if (compareWord == "more") {
							result = "response_true";
						} else if (compareWord == "less") {
							result = "response_false";
						}
					} else if (correctData < compareNum) {
						if (compareWord == "more") {
							result = "response_false";
						} else if (compareWord == "less") {
							result = "response_true";
						}
					} else if (correctData === compareNum) {
						result = "response_false";
					}
				}
				break;
		}

		return result;
	}

	// get a response based on what the player asked about, what their guess was, and whether or not they were correct
	// create a new object base don the key and add in the possible responses to be used by Tracery
	getResponse(key, guess, result) {
		let currentObj = this.responseData.answers[key];
		if (!currentObj) {
			return "unknown"; // TODO;
		}

		currentObj.guess = guess;
		currentObj.yes = this.responseData.scripts.yes;
		currentObj.no = this.responseData.scripts.no;
		currentObj.well = this.responseData.scripts.well;
		currentObj.us = this.responseData.scripts.us;

		let grammar = tracery.createGrammar(currentObj);
		grammar.addModifiers(tracery.baseEngModifiers);
		return grammar.flatten("#" + result + "#");
	}

	getRawScriptArray(key) {
		return this.responseData.scripts[key];
	}
};
