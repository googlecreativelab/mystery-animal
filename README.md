# Mystery Animal

Mystery Animal is a [Voice Experiment](https://voiceexperiments.withgoogle.com/mystery-animal) that lets you play a guessing game where the computer pretends to be an animal, and you have to guess what it is.

![Mystery Animal](https://storage.googleapis.com/mystery-animal-assets/Mystery_Animal_Thumbnail_1920x1080.png)

Play it on a Google Home by saying “Hey Google, let's play Mystery Animal,” or try it in the browser at [g.co/mysteryanimal](https://g.co/mysteryanimal).

This is an experiment, not an official Google product. We will do our best to support and maintain this experiment but your mileage may vary.

## Technology

Mystery Animal is built on [Actions on Google](https://developers.google.com/actions/), the platform that allows you to make things for the Google Assistant and the Google Home. It uses [Dialogflow](https://dialogflow.com/) to handle understanding what the player says, [Firebase Cloud Functions](https://firebase.google.com/docs/functions/) for backend code, and [Firebase Database](https://firebase.google.com/docs/database/) to save data. The project is written in JavaScript, using Actions on Google’s [Node.js client library](https://developers.google.com/actions/nodejs-client-library-release-notes).

This repo contains a pre-built Dialogflow Agent you can import into your own project. It contains all the Intents and Entities for Mystery Animal. This is all in the `dialogflow_agent` folder.

Everything in the `functions` folder is used in Firebase Cloud Functions, which hosts the webhook code for Dialogflow. The webhook handles all the response logic for Mystery Animal. The bulk of the code is in `index.js`.

### Importing the Dialogflow Agent

Go to the [Actions on Google developer console](https://actions-console.corp.google.com/), and create a new project.

Click “BUILD” on the Dialogflow card, and follow the flow to create a new Dialogflow agent.

When your agent is created, click on the gear icon to get to the “Export and Import” tab. You can then compress the `dialogflow_agent` folder from this repo into a zip file, and then import it. You should then see all of Mystery Animal’s Intents and Entities in your project.

[Here](https://dialogflow.com/docs/getting-started/basics)’s some more info about how Dialogflow works in general.

### Setting up the webhook

**Install the Firebase CLI.**

**Go to the `functions` folder**:

`cd functions`

**Install dependencies by going to the running either**

`yarn` or `npm install`

**Initialize Firebase**

`firebase init`

Select “functions” and optionally “database” if you’d also like to save the questions and responses.
Select your Google Project ID as your default project. (This can be found in your Dialogflow agent settings.)

**Deploy your webhook**

`firebase deploy`

**Get your webhook URL and put it in Dialogflow**

Once you’ve successfully deployed your webhook, your terminal should give you a url called “Function URL.” In Dialogflow, click the “Fulfillment” tab and toggle the “Enable” switch for the webhook. Paste that url into the text field.

**You can read more documentation about using Firebase Cloud Functions for Dialogflow fulfillment [here](https://dialogflow.com/docs/how-tos/getting-started-fulfillment).**

### Testing your app

You should now be able to test your app in the Dialogflow test console. You can also go to Dialogflow’s Integration tab, and try it on the Actions on Google simulator, where you can also hear it on a Google Home or Assistant device.

### Playing with response logic

The bulk of the response logic is in `index.js` with some custom classes in the `module` folder. You can read the docs about the Actions on Google Node SDK, which is called in with `const App = require("actions-on-google").DialogflowApp;`

The Actions library’s built in `app.data` object is very useful for storing data within a session.

### Saving queries and responses to a Firebase Database

The repo contains a module called `FirebaseDatabase.js`, which allows you to save info about what happens in a game to a Firebase Database. If you want to do this, you’ll have to set up your own service account. If you don’t want to use it, you can remove all the Firebase Database code from `index.js`.

### A note about the animal data

We’re making the animal data we have collected available in `animal_names_sizes.json` and `game_data.json`. This data is likely to not be 100% accurate and shouldn’t be used as a scientific reference.

## Contributors

[Nicole He](https://github.com/nicolehe) and [Nick Jonas](https://github.com/nick-jonas) with friends at the Google Creative Lab.

## License

Copyright 2017 Google Inc.

Licensed under the Apache License, Version 2.0 (the “License”); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an “AS IS” BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

## Final Thoughts
We encourage open sourcing projects as a way of learning from each other. Please respect our and other creators’ rights, including copyright and trademark rights when present, when sharing these works and creating derivative work. If you want more info on Google's policy, you can find that [here](https://www.google.com/permissions/).
