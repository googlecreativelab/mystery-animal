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

// a class representing a Knowledge Graph Query

"use strict";

const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const rp = require("request-promise");
const config = require("./config.json");

// sets up the API search parameters
module.exports = class KnowledgeGraphQuery {
	constructor() {
		this.stopWordsData = JSON.parse(fs.readFileSync(__dirname + "/data/stop_words.json", "utf8"));
		this.params = {
			query: "",
			limit: 1,
			indent: true,
			key: config.KG_API_KEY
		};
		this.options = {
			uri: "https://kgsearch.googleapis.com/v1/entities:search",
			method: "GET",
			qs: this.params,
			headers: { "User-Agent": "Request-Promise" },
			json: true
		};
	}

	// split the input, check if any of the words are in the stop words list, if so remove them
	// join the words that are not stop words and save it as the query
	// make the GET request with the query and return the "description"
	checkKnowledgeGraph(input) {
		let split = input.split(" ");
		let end = " ";
		let foundWords = [];
		for (let word of split) {
			if (this.stopWordsData.stopWords.includes(word.toLowerCase())) {
				foundWords.push(word);
			}
		}
		_.pullAll(split, foundWords);

		let processedQuery = split.join(" ");
		this.params.query = processedQuery;
		let profanities = JSON.parse(fs.readFileSync(__dirname + "/data/profanities.json", "utf8"));
		return rp(this.options)
			.then(function(body) {
				if (body.itemListElement.length > 0) {
					let key;
					let description = body.itemListElement[0].result.description;
					let types = body.itemListElement[0].result["@type"];
					// gives special responses based on the type of thing found
					if (types.includes("Person")) key = "KG_person";
					else if (types.includes("Movie") || (types.includes("TVSeries") || types.includes("MovieSeries"))) key = "KG_movietv";
					else if (types.includes("Book")) key = "KG_book";
					else if (types.includes("Place")) key = "KG_place";
					else if (types.includes("VideoGame") || types.includes("VideoGameSeries")) key = "KG_videogame";
					else key = "KG_general";

					if (description == "Animal" || description == "Fish" || description == "Reptile" || description == "Bird" || description == "Amphibian" || description == "Amphibians") key = "KG_animal";

					// check if there are bad words
					for (let word of split) {
						if (profanities.badwords.includes(word.toLowerCase()) || input.includes("*")) {
							key = "KG_noRepeat";
						}
					}

					if (description) return { key: key, description: description };
					else return;
				} else return;
			})
			.catch(function(err) {
				console.log("KG Error", err);
			});
	}
};
