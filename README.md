
<h1 align="center">
  <br>
  <img src="./assets/icon.png" alt="letzquiz" width="200"></a>
  <br>
  Letz Quiz
  <br>
</h1>

LetzQuiz is a voice-assisted application for Google Home (Nest). This app can also be used on a mobile phone running Android and iOS.

## Project Componets.
* Quiz Questions Database
* User management
* Backend logic
* Client applications

## Key Features

* Provide a User Account for user to login without using Google account linkage.
* Keeps track the user Total score
* After each Session tells the Rank of user for Improvement and Motivation
* For greeting take account of users last login and greet accordingly to improve user interaction.
* Provided a guest Account for user just trying out Funtionalities
* Provides a Rich User Experience 

## Getting Started

The LetzQuiz is a project in Google Action , which maily focus on the user on the google home or without a visual device.
This App mainly focus on the Education of the childer from 1 to 5 the grade providing them with interactive Quizzes.

## Implementation

To provide high user experience user can login with thier email withour using Google account linkage. When user logins the user will be prompted to give details such as Grade,Nickname etc. According to the grade selected by the user the Quiz questions will be Fetched. If user wishes to test the App, he can login with Guest Account also which provide all the functionalites accept the Rank and Toatal Score of the User.

When User login in for the first time a account will be created in the firebase where all the credentcials are stored.then everytime user login the user will be authenticated with this account.

the Quiz is designed in such a way to not to repeat the questions asked by genearting random question numbers and quering these specific Questions from datbse to reduce the time taked for Quering to increase the user interaction.

Each Session includes 5 questions and the Score will be informed to the user after the Quiz the score will be then added to the total score of the user.If user wishes to Know the users rank, he can do so the rank takes in to account the total score of the users
Which ensures the Continues participation of the user.


## Built With

* [Firebase](http://www.dropwizard.io/1.0.2/docs/) - Database
* [Javascript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) - Intent Implementation
* [DialogueFlow](https://DialogFlow.comv) - Conversation
  
## Contributing

Anyone intested in contributing can , give me a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
