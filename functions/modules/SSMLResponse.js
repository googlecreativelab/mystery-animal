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

// a class representing sounds for the Mystery Animal
// adds the SSML tags properly for the Home to play the sounds

"use strict";

module.exports = class Reply {
	constructor(soundType, say) {
		this.baseUrl = "https://storage.googleapis.com/mystery-animal-sounds/";
		this.soundType = soundType;
		this.say = say;
		this.mp3Url = this.baseUrl + soundType + ".mp3";
		this.audio = `<audio src="${this.mp3Url}"></audio>`;
		this.response = `<speak>${this.audio}${say}</speak>`;
	}

	// adds the sound in the middle of a string
	// used only in the Welcome intent
	twoParts(firstPart, secondPart) {
		return `<speak>${firstPart}${this.audio}${secondPart}</speak>`;
	}


};
