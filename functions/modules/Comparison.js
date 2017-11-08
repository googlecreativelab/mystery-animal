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

// a class representing a size comparison between animals.

"use strict";

const fs = require("fs");
const _ = require("lodash");
// json containing size and name data of animals
const sizeData = JSON.parse(fs.readFileSync(__dirname + "/data/animal_names_sizes.json", "utf8"));

module.exports = class Comparison {
	constructor(guessAnimal, gameAnimal, gameAnimalMass, compareWord) {
		this.guessAnimal = guessAnimal.toLowerCase();
		this.gameAnimalMass = gameAnimalMass;
		// counts how many words are in the guess - "prairie dog" vs "dog"
		this.guessAnimalWordNums = this.guessAnimal.split(" ").length;
		this.gameAnimal = gameAnimal;
		this.compareWord = compareWord;
		this.matches = [];
		this.totalMass = 0.0;
		this.avgMass = 0.0;
	}

	// a function getting the size data of the game animal and the guess animal and comparing them
	compare() {
		if (this.guessAnimal == this.gameAnimal) return "response_sometimes";

		// loop through the sizeData json to find all entries that contain the animal guess (guessAnimal)
		// save the matches to a new array
		for (let speciesObj of sizeData.sizeData) {
			let lowerCased = speciesObj.common_names.toLowerCase();
			if (lowerCased.indexOf(this.guessAnimal) !== -1) {
				let matchedAnimals = speciesObj.common_names.split(",");
				for (let match of matchedAnimals) {
					let fullName = match.split(" ");
					let simpleName = _.join(_.takeRight(fullName, this.guessAnimalWordNums), " ");
					let matchObj = {};
					matchObj.name = match.toLowerCase();
					matchObj.simpleName = simpleName.toLowerCase();
					matchObj.mass = speciesObj.mass_average_g;
					this.matches.push(matchObj);
				}
			}

			// if the simple name of the matches don't match the guess, remove them from the array
			for (let match of this.matches) {
				if (match.simpleName !== this.guessAnimal) {
					let index = this.matches.indexOf(match);
					if (index > -1) this.matches.splice(index, 1);
				}
			}
		}
		if (this.matches.length === 0) return "response_possible";
		// for every remaining match, get the total mass, add it together, then divide to get the average
		for (let animal of this.matches) {
			this.totalMass += _.round(animal.mass);
		}
		this.guessAnimalMass = this.totalMass / this.matches.length;

		// if the size of the compare animal is within 20% of the game animal's mass,
		// say that they are close in size
		let closeMax = 1.2 * this.gameAnimalMass;
		let closeMin = 0.8 * this.gameAnimalMass;
		let result;
		if (_.inRange(this.guessAnimalMass, closeMin, closeMax)) result = "response_sometimes";
		else {
			// check to see which animal is bigger - the game animal or the guess animal
			let gameAnimalIsBigger = this.guessAnimalMass > this.gameAnimalMass ? false : true;

			// generate the response based on which animal is bigger and which animal the player guessed is bigger

			if (this.compareWord == "bigger than" && gameAnimalIsBigger) result = "response_true";
			else if (this.compareWord == "smaller than" && gameAnimalIsBigger) result = "response_false";
			else if (this.compareWord == "bigger than" && gameAnimalIsBigger === false) result = "response_false";
			else if (this.compareWord == "smaller than" && gameAnimalIsBigger === false) result = "response_true";
			else result = "unknown";
		}
		return result;
	}
};
